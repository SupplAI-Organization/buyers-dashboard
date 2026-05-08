import { supabase } from "./supabaseClient";
import type {
  GraphData,
  GraphDetail,
  GraphEdge,
  GraphNode,
} from "./graph";
import { composeEdgeWeights } from "./graphWeights";

const SELLER_PREFIX = "seller-";
const PRODUCT_PREFIX = "product-";
const CATEGORY_PREFIX = "category-";
const CHAT_PREFIX = "chat-";

type RawSeller = {
  id: string;
  business_name: string | null;
  business_type: string | null;
  business_address: string | null;
  is_verified: boolean | null;
};

type RawProduct = {
  id: string;
  name: string;
  category: string;
  price_per_unit: string;
  unit_type: string;
  available_quantity: string;
  min_order_quantity: string;
  certification: string | null;
  origin_country: string | null;
  origin_state: string | null;
  supplier_id: string;
  updated_at: string | null;
};

/**
 * Build a graph from live marketplace data:
 *   - one node per seller (role = 'seller')
 *   - one node per listed product (is_listed = true)
 *   - one node per distinct category that has products
 *   - edge seller → product (a seller owns a product)
 *   - edge product → category (a product belongs to a category)
 *
 * Reads happen through the authenticated client → RLS policies apply.
 */
export async function loadMarketplaceGraph(): Promise<GraphData> {
  const [{ data: rawSellers, error: sellerErr }, { data: rawProducts, error: productErr }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, business_name, business_type, business_address, is_verified")
        .eq("role", "seller"),
      supabase
        .from("products")
        .select(
          "id, name, category, price_per_unit, unit_type, available_quantity, min_order_quantity, certification, origin_country, origin_state, supplier_id, updated_at",
        )
        .eq("is_listed", true),
    ]);

  if (sellerErr) throw new Error(`Sellers query failed: ${sellerErr.message}`);
  if (productErr) throw new Error(`Products query failed: ${productErr.message}`);

  const sellers: RawSeller[] = rawSellers ?? [];
  const products: RawProduct[] = rawProducts ?? [];

  // ── Aggregations ──────────────────────────────────────────────────────────
  const sellerNameById = new Map<string, string>();
  for (const s of sellers) sellerNameById.set(s.id, s.business_name ?? "Unnamed seller");

  const sellerListingCount = new Map<string, number>();
  const sellerCategories = new Map<string, Set<string>>();
  const categoryProductCount = new Map<string, number>();
  const categorySellers = new Map<string, Set<string>>();
  // Distinct sellers carrying each product name (case-insensitive). Drives
  // the seller→product edge weight: a commodity many sellers list shows
  // thick edges across all its listings; a unique product stays thin.
  const sellersByProductName = new Map<string, Set<string>>();
  const normalizeName = (n: string) => n.trim().toLowerCase();

  for (const p of products) {
    sellerListingCount.set(p.supplier_id, (sellerListingCount.get(p.supplier_id) ?? 0) + 1);

    if (!sellerCategories.has(p.supplier_id)) sellerCategories.set(p.supplier_id, new Set());
    sellerCategories.get(p.supplier_id)!.add(p.category);

    categoryProductCount.set(p.category, (categoryProductCount.get(p.category) ?? 0) + 1);
    if (!categorySellers.has(p.category)) categorySellers.set(p.category, new Set());
    categorySellers.get(p.category)!.add(p.supplier_id);

    const key = normalizeName(p.name);
    if (!sellersByProductName.has(key)) sellersByProductName.set(key, new Set());
    sellersByProductName.get(key)!.add(p.supplier_id);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const details: Record<string, GraphDetail> = {};

  // ── Composer context ──────────────────────────────────────────────────────
  // Per-product-name median price feeds the price-competitiveness factor.
  const pricesByName = new Map<string, number[]>();
  for (const p of products) {
    const key = normalizeName(p.name);
    const price = parseFloat(p.price_per_unit);
    if (Number.isFinite(price) && price > 0) {
      if (!pricesByName.has(key)) pricesByName.set(key, []);
      pricesByName.get(key)!.push(price);
    }
  }
  const medianPrice = new Map<string, number>();
  for (const [name, list] of pricesByName) {
    list.sort((a, b) => a - b);
    medianPrice.set(name, list[Math.floor(list.length / 2)]);
  }

  const verifiedSellerIds = new Set<string>();
  for (const s of sellers) {
    if (s.is_verified) verifiedSellerIds.add(`${SELLER_PREFIX}${s.id}`);
  }
  const certifiedProductIds = new Set<string>();
  const priceMultiplierByEdge = new Map<string, number>();
  const toolMultiplierByEdge = new Map<string, number>();
  const edgeAgeDays = new Map<string, number>();
  const now = Date.now();
  const ageInDays = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return null;
    return Math.max(0, (now - t) / (1000 * 60 * 60 * 24));
  };

  // Only include sellers that actually have at least one listed product —
  // otherwise the graph fills with disconnected dots.
  const activeSellerIds = new Set(sellerListingCount.keys());

  // ── Seller nodes ──────────────────────────────────────────────────────────
  for (const s of sellers) {
    if (!activeSellerIds.has(s.id)) continue;
    const id = `${SELLER_PREFIX}${s.id}`;
    const listing_count = sellerListingCount.get(s.id) ?? 0;
    const cats = Array.from(sellerCategories.get(s.id) ?? []);
    nodes.push({
      id,
      label: s.business_name ?? "Unnamed seller",
      kind: "seller",
      weight: listing_count,
    });
    details[id] = {
      kind: "seller",
      id,
      sellerId: s.id,
      title: s.business_name ?? "Unnamed seller",
      business_type: s.business_type,
      business_address: s.business_address,
      is_verified: !!s.is_verified,
      listing_count,
      categories: cats,
    };
  }

  // ── Product nodes + seller→product edges ─────────────────────────────────
  for (const p of products) {
    const id = `${PRODUCT_PREFIX}${p.id}`;
    const sellerId = `${SELLER_PREFIX}${p.supplier_id}`;
    if (!details[sellerId]) continue; // guard against orphan products

    const competingSellers = sellersByProductName.get(normalizeName(p.name))?.size ?? 1;
    nodes.push({ id, label: p.name, kind: "product", weight: competingSellers });
    details[id] = {
      kind: "product",
      id,
      productId: p.id,
      title: p.name,
      category: p.category,
      price_per_unit: p.price_per_unit,
      unit_type: p.unit_type,
      seller_name: sellerNameById.get(p.supplier_id) ?? "Seller",
      available_quantity: p.available_quantity,
      min_order_quantity: p.min_order_quantity,
      certification: p.certification,
      origin: [p.origin_state, p.origin_country].filter(Boolean).join(", ") || null,
    };
    const edgeId = `e-${sellerId}-${id}`;
    edges.push({
      id: edgeId,
      source: sellerId,
      target: id,
      weight: competingSellers,
    });

    // Phase B context: cheaper-than-peers ⇒ thicker (clamped 0.5–2.0).
    const price = parseFloat(p.price_per_unit);
    const median = medianPrice.get(normalizeName(p.name));
    if (Number.isFinite(price) && price > 0 && median && median > 0) {
      const mult = Math.max(0.5, Math.min(2.0, median / price));
      priceMultiplierByEdge.set(edgeId, mult);
    }
    if (p.certification && p.certification.trim()) {
      certifiedProductIds.add(id);
    }
    const age = ageInDays(p.updated_at);
    if (age !== null) edgeAgeDays.set(edgeId, age);
  }

  // ── Category nodes + product→category edges ─────────────────────────────
  for (const [category, count] of categoryProductCount) {
    const id = `${CATEGORY_PREFIX}${category}`;
    nodes.push({ id, label: category, kind: "category", weight: count });
    details[id] = {
      kind: "category",
      id,
      title: category,
      product_count: count,
      seller_count: categorySellers.get(category)?.size ?? 0,
    };
  }

  for (const p of products) {
    const productId = `${PRODUCT_PREFIX}${p.id}`;
    const categoryId = `${CATEGORY_PREFIX}${p.category}`;
    if (!details[productId] || !details[categoryId]) continue;
    edges.push({
      id: `e-${productId}-${categoryId}`,
      source: productId,
      target: categoryId,
      weight: 1,
    });
  }

  // ── Chat nodes (current user's saved conversations) ────────────────────────
  // Each agent_conversations row becomes a node. We scan its messages' `parts`
  // for tool outputs that reference product/seller IDs and draw edges to the
  // corresponding product/seller nodes already in the graph.
  const { data: convs } = await supabase
    .from("agent_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (convs && convs.length > 0) {
    const convIds = convs.map((c) => c.id as string);
    const { data: messages } = await supabase
      .from("agent_messages")
      .select("conversation_id, parts")
      .in("conversation_id", convIds);

    const partsByConv = new Map<string, unknown[][]>();
    for (const m of messages ?? []) {
      const cid = m.conversation_id as string;
      if (!partsByConv.has(cid)) partsByConv.set(cid, []);
      partsByConv.get(cid)!.push((m.parts as unknown[]) ?? []);
    }

    for (const c of convs) {
      const cid = c.id as string;
      const chatNodeId = `${CHAT_PREFIX}${cid}`;
      const allParts = (partsByConv.get(cid) ?? []).flat();
      const { productCounts, sellerCounts } = extractMarketplaceRefs(allParts);

      const linkedProducts = [...productCounts.entries()].filter(
        ([id]) => details[`${PRODUCT_PREFIX}${id}`],
      );
      const linkedSellers = [...sellerCounts.entries()].filter(
        ([id]) => details[`${SELLER_PREFIX}${id}`],
      );

      const messageCount = (partsByConv.get(cid) ?? []).length;
      // Skip only truly empty chats (no messages saved at all).
      if (messageCount === 0) continue;

      // Sum mention counts so the chat-node size scales with how much it
      // actually talked about marketplace entities, not just distinct count.
      const totalMentions =
        linkedProducts.reduce((s, [, r]) => s + r.count, 0) +
        linkedSellers.reduce((s, [, r]) => s + r.count, 0);

      nodes.push({
        id: chatNodeId,
        label: (c.title as string) || "Untitled chat",
        kind: "chat",
        weight: totalMentions || linkedProducts.length + linkedSellers.length,
      });
      details[chatNodeId] = {
        kind: "chat",
        id: chatNodeId,
        conversationId: cid,
        title: (c.title as string) || "Untitled chat",
        updated_at: c.updated_at as string,
        message_count: messageCount,
        product_links: linkedProducts.length,
        seller_links: linkedSellers.length,
      };

      const chatAge = ageInDays(c.updated_at as string);
      for (const [pid, ref] of linkedProducts) {
        const eid = `e-${chatNodeId}-${PRODUCT_PREFIX}${pid}`;
        edges.push({
          id: eid,
          source: chatNodeId,
          target: `${PRODUCT_PREFIX}${pid}`,
          weight: ref.count,
        });
        toolMultiplierByEdge.set(eid, Math.max(1, ref.weighted / Math.max(ref.count, 1)));
        if (chatAge !== null) edgeAgeDays.set(eid, chatAge);
      }
      for (const [sid, ref] of linkedSellers) {
        const eid = `e-${chatNodeId}-${SELLER_PREFIX}${sid}`;
        edges.push({
          id: eid,
          source: chatNodeId,
          target: `${SELLER_PREFIX}${sid}`,
          weight: ref.count,
        });
        toolMultiplierByEdge.set(eid, Math.max(1, ref.weighted / Math.max(ref.count, 1)));
        if (chatAge !== null) edgeAgeDays.set(eid, chatAge);
      }
    }
  }

  const weighted = composeEdgeWeights(
    edges,
    {
      nodes,
      verifiedSellerIds,
      certifiedProductIds,
      priceMultiplierByEdge,
      toolMultiplierByEdge,
      edgeAgeDays,
    },
    {},
  );

  return { nodes, edges: weighted, details };
}

// Walk a message's `parts` array and pull out any product or seller UUIDs
// referenced by tool inputs/outputs. Tool part type names follow the
// convention `tool-<toolName>` and carry the SDK's tool-call envelope:
//   { type: "tool-searchProducts", state: "output-available", input: {...},
//     output: { products: [{ id, ... }, ...] } }
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Buyer-intent weights per tool class. Cart actions reflect strongest intent;
// detail views are mid-strength research; bulk searches are exploratory.
const TOOL_INTENT_WEIGHT: Record<string, number> = {
  addToCart: 3,
  updateCartItemQuantity: 3,
  getProductDetails: 2,
  getSellerDetails: 2,
  compareSellers: 2,
  searchProducts: 1,
  searchSellers: 1,
  viewCart: 1,
  removeFromCart: 1,
};

type RefCount = { count: number; weighted: number };

function extractMarketplaceRefs(parts: unknown[]): {
  productCounts: Map<string, RefCount>;
  sellerCounts: Map<string, RefCount>;
} {
  const productCounts = new Map<string, RefCount>();
  const sellerCounts = new Map<string, RefCount>();

  const bump = (
    map: Map<string, RefCount>,
    id: unknown,
    intent: number,
  ) => {
    if (typeof id !== "string" || !UUID_RE.test(id)) return;
    const cur = map.get(id) ?? { count: 0, weighted: 0 };
    cur.count += 1;
    cur.weighted += intent;
    map.set(id, cur);
  };

  let currentIntent = 1;
  const bumpProduct = (id: unknown) => bump(productCounts, id, currentIntent);
  const bumpSeller = (id: unknown) => bump(sellerCounts, id, currentIntent);

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const p = part as Record<string, unknown>;
    const type = typeof p.type === "string" ? p.type : "";
    if (!type.startsWith("tool-")) continue;

    const toolName = type.slice("tool-".length);
    const output = p.output as Record<string, unknown> | undefined;
    const input = p.input as Record<string, unknown> | undefined;
    currentIntent = TOOL_INTENT_WEIGHT[toolName] ?? 1;

    // ── product-yielding tools ────────────────────────────────────────────
    if (toolName === "searchProducts" && output?.products) {
      for (const row of output.products as Record<string, unknown>[]) {
        bumpProduct(row?.id);
        bumpSeller(row?.seller_id ?? row?.supplier_id);
      }
    }
    if (toolName === "getProductDetails") {
      const prod = output?.product as Record<string, unknown> | undefined;
      const sell = output?.seller as Record<string, unknown> | undefined;
      bumpProduct(prod?.id ?? input?.productId);
      bumpSeller(sell?.id);
    }
    if (toolName === "addToCart") {
      const prod = output?.product as Record<string, unknown> | undefined;
      bumpProduct(prod?.id ?? input?.productId);
    }
    if (toolName === "updateCartItemQuantity" || toolName === "removeFromCart") {
      const prod = output?.product as Record<string, unknown> | undefined;
      bumpProduct(prod?.id);
    }
    if (toolName === "viewCart" && output?.items) {
      for (const it of output.items as Record<string, unknown>[]) {
        bumpProduct(it?.product_id);
      }
    }

    // ── seller-yielding tools ─────────────────────────────────────────────
    if (toolName === "searchSellers" && output?.sellers) {
      for (const row of output.sellers as Record<string, unknown>[]) {
        bumpSeller(row?.id);
      }
    }
    if (toolName === "getSellerDetails") {
      const sell = output?.seller as Record<string, unknown> | undefined;
      bumpSeller(sell?.id ?? input?.sellerId);
    }
    if (toolName === "compareSellers" && output?.sellers) {
      for (const row of output.sellers as Record<string, unknown>[]) {
        bumpSeller(row?.id);
      }
      const ids = input?.sellerIds;
      if (Array.isArray(ids)) {
        for (const id of ids) bumpSeller(id);
      }
    }
  }

  return { productCounts, sellerCounts };
}
