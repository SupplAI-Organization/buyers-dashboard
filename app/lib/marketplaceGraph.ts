import { supabase } from "./supabaseClient";
import type {
  GraphData,
  GraphDetail,
  GraphEdge,
  GraphNode,
} from "./graph";

const SELLER_PREFIX = "seller-";
const PRODUCT_PREFIX = "product-";
const CATEGORY_PREFIX = "category-";

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
          "id, name, category, price_per_unit, unit_type, available_quantity, min_order_quantity, certification, origin_country, origin_state, supplier_id",
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

  for (const p of products) {
    sellerListingCount.set(p.supplier_id, (sellerListingCount.get(p.supplier_id) ?? 0) + 1);

    if (!sellerCategories.has(p.supplier_id)) sellerCategories.set(p.supplier_id, new Set());
    sellerCategories.get(p.supplier_id)!.add(p.category);

    categoryProductCount.set(p.category, (categoryProductCount.get(p.category) ?? 0) + 1);
    if (!categorySellers.has(p.category)) categorySellers.set(p.category, new Set());
    categorySellers.get(p.category)!.add(p.supplier_id);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const details: Record<string, GraphDetail> = {};

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

    nodes.push({ id, label: p.name, kind: "product", weight: 1 });
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
    edges.push({ id: `e-${sellerId}-${id}`, source: sellerId, target: id });
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
    edges.push({ id: `e-${productId}-${categoryId}`, source: productId, target: categoryId });
  }

  return { nodes, edges, details };
}
