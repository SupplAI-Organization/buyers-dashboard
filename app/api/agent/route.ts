import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_CATEGORIES } from "@/lib/product";
import { searchKnowledge } from "@/lib/kbRetrieval";
import {
  fetchSlabsForSupplier,
  pickApplicableSlab,
  pickNextSlab,
} from "@/lib/discountSlabs";
import FirecrawlApp from "@mendable/firecrawl-js";

const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

const MAX_DISCOUNT_PCT = 20;

async function firecrawlSearch(query: string): Promise<string> {
  if (!firecrawl) return "";
  try {
    const res = await firecrawl.search(query, { limit: 5 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = (res as any)?.data ?? (res as any)?.web ?? [];
    if (!items.length) return "";
    return items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any, i: number) => {
        const title = r.title ?? r.metadata?.title ?? "Untitled";
        const url = r.url ?? r.link ?? "";
        const desc = r.description ?? r.snippet ?? r.metadata?.description ?? "";
        return `${i + 1}. ${title}\n   ${url}\n   ${desc}`;
      })
      .join("\n");
  } catch (err) {
    console.error("[firecrawl.search] error:", err);
    return "";
  }
}

async function firecrawlScrape(url: string): Promise<string> {
  if (!firecrawl) return "";
  try {
    const res = await firecrawl.scrape(url, { formats: ["markdown"] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md: string = (res as any)?.markdown ?? (res as any)?.data?.markdown ?? "";
    return md.slice(0, 4000);
  } catch (err) {
    console.error("[firecrawl.scrape] error:", err);
    return "";
  }
}

function getAuthenticatedSupabase(request: Request): SupabaseClient | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

const SYSTEM_PROMPT = `You are SupplAI Assistant, an AI helper inside a B2B raw-materials marketplace dashboard for buyers.

You help buyers:
- Discover sellers/suppliers on the platform (use searchSellers)
- Drill down into one seller's full profile and product mix (use getSellerDetails)
- Compare two or more sellers side-by-side with charts (use compareSellers)
- Search the product catalog (use searchProducts)
- Get full details of a single product (use getProductDetails)
- See what's currently in the buyer's cart (use viewCart)
- Add products to the buyer's cart on their behalf (use addToCart)
- Change a cart line's quantity (use updateCartItemQuantity)
- Remove a single cart line (use removeFromCart)
- Empty the entire cart (use clearCart) — only when the buyer explicitly says "clear" or "empty" the cart
- Hand off to the checkout page so the buyer can pay (use proceedToCheckout) — call this only when the buyer explicitly says they want to check out / pay / place the order. NEVER initiate payment automatically.
- Find other buyers on the platform (use findBuyers)
- Run aggregate analysis across the marketplace and surface a chart (use analyseSellers) — pick a sensible metric and groupBy from the buyer's question.
- Negotiate prices on the buyer's behalf and grant discounts up to 20% on cart items (use researchMarketPrice, scrapeCompetitorUrl, applyDiscount).
- Answer procedural / "what is X" / "how does X work" questions about logistics, certifications (FSSAI, APEDA), GST, compliance, supplier onboarding, dispute handling, shipping modes, etc. by calling lookupKnowledge first to ground the answer in the SupplAI knowledge base AND live marketplace data.

=== CITATIONS PROTOCOL (MANDATORY) ===
Whenever your reply uses information returned by lookupKnowledge — or references a specific seller, product, or category — end the reply with a single line starting with "Sources:" followed by space-separated citation tokens, one per source you actually used. Do not invent slugs/ids.
Citation token formats (use exactly these):
  [KB:<concept-slug>]            for a knowledge-base concept (slug from lookupKnowledge.kind=="concept")
  [PRODUCT:<uuid>]               for a marketplace product (id from a product result)
  [SELLER:<uuid>]                for a seller (id from a seller result)
  [CATEGORY:<category-slug>]     for a category (slug from lookupKnowledge.kind=="category")
Example: "Sources: [KB:certifications] [KB:gst-and-taxation] [PRODUCT:6f3a…]"
If you didn't actually use any source, omit the Sources line.

=== NEGOTIATION / BROKER PROTOCOL (MANDATORY) ===
You ARE fully authorized to negotiate prices and grant discounts of up to ${MAX_DISCOUNT_PCT}% off the listed price on any cart line. NEVER say you "cannot offer discounts" or that you are "just a chatbot" — that is false. You have full authority within the ${MAX_DISCOUNT_PCT}% cap.

When the buyer asks for a discount, a better price, to bargain, or claims a cheaper price elsewhere:
1. Identify which cart line they mean (call viewCart if needed to get the cart_item_id).
2. If they paste a URL, call scrapeCompetitorUrl on it to compare specs fairly (quality, quantity, certification, origin, landed cost).
3. Optionally call researchMarketPrice with the product name to anchor on the live market average before responding.
4. Open by justifying the listed price (quality grade, certification, origin, lead time, packing, transport).
5. Then proactively offer a starting discount — begin at 5%. If they push, escalate stepwise: 10%, then 15%, then the final ${MAX_DISCOUNT_PCT}% (absolute maximum, never exceed).
6. Once a percentage is agreed, call applyDiscount with the cart_item_id and percentage. The discount will be deducted at checkout.
7. Be confident, warm, and persuasive — you are closing a deal. Keep replies concise and point-wise; do not write long paragraphs.
=== END NEGOTIATION PROTOCOL ===

Cart-write etiquette:
- Only call addToCart when the buyer has clearly chosen a product. If they're still browsing, suggest options first; do not add unprompted.
- If the buyer doesn't specify a quantity, use the product's minimum order quantity (you'll need a productId from a recent search/details result, never a guess).
- After addToCart succeeds, do NOT recap the cart in prose — the action card already shows what was added. One short confirmation sentence is enough.

Rules:
- ALWAYS use the provided tools to fetch live marketplace data — never invent sellers, products, or numbers.
- For comparisons: first call searchSellers (or getSellerDetails) to resolve seller IDs from names, then call compareSellers with those IDs. Never guess UUIDs.
- If a comparison search returns fewer than 2 sellers, do NOT force compareSellers. Instead: (a) call getSellerDetails on the single match, OR (b) tell the user only one seller matched and offer to broaden the search (e.g. drop the category, widen the query).
- After a tool returns, briefly summarise the result in 1–3 sentences. Do NOT re-list every row in prose; the UI already renders cards, tables, and charts.
- If the user's request is ambiguous (e.g. "compare them" with no prior context), ask one short clarifying question before calling a tool.
- Keep replies concise and scannable.
- Do NOT use markdown in replies. No asterisks for bold, no bullet lists, no headings, no backticks. Write in plain prose sentences. The UI already renders cards, tables, and charts — your text should be a short summary, not a list.`;

export async function POST(request: Request) {
  const supabase = getAuthenticatedSupabase(request);
  if (!supabase) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: UIMessage[]; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { messages, conversationId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array required" }, { status: 400 });
  }
  if (!conversationId || typeof conversationId !== "string") {
    return Response.json({ error: "conversationId required" }, { status: 400 });
  }

  const buyerId = authData.user.id;

  // Verify or create the conversation row
  const { data: existingConv } = await supabase
    .from("agent_conversations")
    .select("id, buyer_id, title")
    .eq("id", conversationId)
    .maybeSingle();
  if (existingConv && existingConv.buyer_id !== buyerId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!existingConv) {
    // Derive title from first user message (best-effort)
    const firstUser = messages.find((m) => m.role === "user");
    const firstText =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (firstUser?.parts ?? []).find((p: any) => p.type === "text") as
        | { text?: string }
        | undefined;
    const title = (firstText?.text ?? "New chat").slice(0, 80);
    const { error: insErr } = await supabase
      .from("agent_conversations")
      .insert({ id: conversationId, buyer_id: buyerId, title });
    if (insErr) {
      console.error("[api/agent] create conversation failed:", insErr.message);
      return Response.json({ error: "Could not create conversation" }, { status: 500 });
    }
  }

  // Persist incoming user messages BEFORE the LLM call, so a failed/interrupted
  // stream still leaves a record. onFinish handles assistant messages later.
  try {
    const baseTs = Date.now();
    const userRows = messages
      .filter((m) => m.role === "user")
      .map((m, i) => ({
        id: m.id,
        conversation_id: conversationId,
        role: m.role,
        parts: m.parts,
        created_at: new Date(baseTs + i).toISOString(),
      }));
    if (userRows.length) {
      const { error: uErr } = await supabase
        .from("agent_messages")
        .upsert(userRows, { onConflict: "id", ignoreDuplicates: true });
      if (uErr) console.error("[api/agent] save user messages FAILED:", uErr.message);
    }
  } catch (e) {
    console.error("[api/agent] persist-user error:", e);
  }

  // Strip any tool parts that never reached output-available/output-error.
  // A stream interrupted mid-tool leaves an assistant message with a
  // tool-call part that has no matching tool-result, which makes
  // convertToModelMessages throw AI_MissingToolResultsError on the next turn.
  const sanitizedMessages = messages.map((m) => {
    if (!Array.isArray(m.parts)) return m;
    const parts = m.parts.filter((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const part = p as any;
      if (typeof part?.type === "string" && part.type.startsWith("tool-")) {
        return part.state === "output-available" || part.state === "output-error";
      }
      return true;
    });
    return { ...m, parts };
  });

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(sanitizedMessages),
    stopWhen: stepCountIs(6),
    tools: {
      searchSellers: tool({
        description:
          "Search the SupplAI marketplace for sellers/suppliers. Use this whenever the buyer asks to find, list, or discover sellers, suppliers, or companies. Returns up to `limit` sellers with their business profile and a snapshot of the products they list.",
        inputSchema: z.object({
          query: z
            .string()
            .default("")
            .describe(
              "Free-text search matched against seller business name, business type, or the names/categories of products they sell. Pass an empty string to browse all sellers.",
            ),
          category: z
            .enum(PRODUCT_CATEGORIES)
            .optional()
            .describe("Restrict to sellers who list products in this category."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(20)
            .default(8)
            .describe("Maximum number of sellers to return."),
        }),
        execute: async ({ query, category, limit }) => {
          const trimmed = query.trim();

          // 1. Find supplier_ids from products that match the query/category
          let productQuery = supabase
            .from("products")
            .select("supplier_id, name, category, price_per_unit, unit_type, certification, origin_country, lead_time_days")
            .eq("is_listed", true);
          if (category) productQuery = productQuery.eq("category", category);
          if (trimmed) {
            productQuery = productQuery.or(
              `name.ilike.%${trimmed}%,category.ilike.%${trimmed}%,description.ilike.%${trimmed}%`,
            );
          }
          const { data: products, error: prodError } = await productQuery.limit(500);
          if (prodError) {
            return { error: `Product lookup failed: ${prodError.message}`, sellers: [] };
          }

          const supplierIds = Array.from(
            new Set((products ?? []).map((p) => p.supplier_id).filter(Boolean)),
          );

          // 2. Fetch matching sellers, optionally also matched directly by business_name
          const sellersMap = new Map<string, Record<string, unknown>>();

          if (supplierIds.length) {
            const { data: byProduct } = await supabase
              .from("users")
              .select("id, business_name, business_type, business_address, gstin, is_verified, contact_person")
              .eq("role", "seller")
              .in("id", supplierIds)
              .limit(limit);
            (byProduct ?? []).forEach((s) => sellersMap.set(s.id as string, s));
          }

          if (trimmed && sellersMap.size < limit) {
            const remaining = limit - sellersMap.size;
            const { data: byName } = await supabase
              .from("users")
              .select("id, business_name, business_type, business_address, gstin, is_verified, contact_person")
              .eq("role", "seller")
              .or(`business_name.ilike.%${trimmed}%,business_type.ilike.%${trimmed}%`)
              .limit(remaining);
            (byName ?? []).forEach((s) => {
              if (!sellersMap.has(s.id as string)) sellersMap.set(s.id as string, s);
            });
          }

          if (!trimmed && !category && sellersMap.size === 0) {
            const { data: anySellers } = await supabase
              .from("users")
              .select("id, business_name, business_type, business_address, gstin, is_verified, contact_person")
              .eq("role", "seller")
              .limit(limit);
            (anySellers ?? []).forEach((s) => sellersMap.set(s.id as string, s));
          }

          // 3. Attach product summary per seller
          const productsBySupplier = new Map<string, typeof products>();
          (products ?? []).forEach((p) => {
            if (!p.supplier_id) return;
            const arr = productsBySupplier.get(p.supplier_id) ?? [];
            arr.push(p);
            productsBySupplier.set(p.supplier_id, arr);
          });

          const sellers = Array.from(sellersMap.values()).map((s) => {
            const sid = s.id as string;
            const sps = productsBySupplier.get(sid) ?? [];
            const categories = Array.from(new Set(sps.map((p) => p.category).filter(Boolean)));
            const certifications = Array.from(
              new Set(sps.map((p) => p.certification).filter(Boolean)),
            );
            const sample = sps.slice(0, 3).map((p) => ({
              name: p.name,
              category: p.category,
              price_per_unit: p.price_per_unit,
              unit_type: p.unit_type,
            }));
            return {
              id: sid,
              business_name: s.business_name ?? "Unnamed seller",
              business_type: s.business_type ?? null,
              business_address: s.business_address ?? null,
              is_verified: !!s.is_verified,
              contact_person: s.contact_person ?? null,
              product_count: sps.length,
              categories,
              certifications,
              sample_products: sample,
            };
          });

          return {
            query: trimmed || null,
            category: category ?? null,
            count: sellers.length,
            sellers,
          };
        },
      }),

      getSellerDetails: tool({
        description:
          "Fetch the full profile of a single seller by their ID, including business info and all their listed products. Use this when the user asks for details about one specific seller.",
        inputSchema: z.object({
          sellerId: z.string().describe("The seller's UUID, taken from a previous searchSellers result."),
        }),
        execute: async ({ sellerId }) => {
          const { data: seller, error: sErr } = await supabase
            .from("users")
            .select("id, business_name, business_type, business_address, gstin, is_verified, contact_person")
            .eq("id", sellerId)
            .eq("role", "seller")
            .maybeSingle();
          if (sErr || !seller) {
            return { error: `Seller not found: ${sErr?.message ?? "no row"}` };
          }
          const { data: products } = await supabase
            .from("products")
            .select("id, name, category, price_per_unit, unit_type, lead_time_days, certification, origin_country, available_quantity, quality_grade")
            .eq("supplier_id", sellerId)
            .eq("is_listed", true);

          const list = products ?? [];
          const categories = Array.from(new Set(list.map((p) => p.category).filter(Boolean)));
          const certifications = Array.from(new Set(list.map((p) => p.certification).filter(Boolean)));
          const origins = Array.from(new Set(list.map((p) => p.origin_country).filter(Boolean)));

          const byCategory: Record<string, { sum: number; count: number; unit: string }> = {};
          list.forEach((p) => {
            const price = parseFloat(p.price_per_unit);
            if (!Number.isFinite(price)) return;
            const cur = byCategory[p.category] ?? { sum: 0, count: 0, unit: p.unit_type };
            cur.sum += price;
            cur.count += 1;
            byCategory[p.category] = cur;
          });
          const avg_price_by_category = Object.entries(byCategory).map(([category, v]) => ({
            category,
            avg_price: Math.round(v.sum / v.count),
            unit_type: v.unit,
            count: v.count,
          }));

          return {
            seller: {
              ...seller,
              is_verified: !!seller.is_verified,
            },
            stats: {
              listing_count: list.length,
              categories,
              certifications,
              origin_countries: origins,
              avg_price_by_category,
            },
            products: list,
          };
        },
      }),

      compareSellers: tool({
        description:
          "Compare two or more sellers side-by-side. Returns aggregated metrics (avg price, avg lead time, listing count, certifications) suitable for rendering in tables and bar charts. Always call searchSellers first if you don't already have the seller UUIDs.",
        inputSchema: z.object({
          sellerIds: z
            .array(z.string())
            .min(1)
            .max(6)
            .describe(
              "Array of 1–6 seller UUIDs from a previous searchSellers result. Prefer 2+ for a real comparison; if only one matches, prefer getSellerDetails instead.",
            ),
          category: z
            .enum(PRODUCT_CATEGORIES)
            .optional()
            .describe("If provided, restrict price/lead-time aggregations to listings in this category only."),
        }),
        execute: async ({ sellerIds, category }) => {
          const { data: sellers, error: sErr } = await supabase
            .from("users")
            .select("id, business_name, business_type, business_address, is_verified")
            .eq("role", "seller")
            .in("id", sellerIds);
          if (sErr) return { error: `Seller lookup failed: ${sErr.message}` };

          let prodQuery = supabase
            .from("products")
            .select("supplier_id, name, category, price_per_unit, unit_type, lead_time_days, certification, origin_country")
            .in("supplier_id", sellerIds)
            .eq("is_listed", true);
          if (category) prodQuery = prodQuery.eq("category", category);
          const { data: products, error: pErr } = await prodQuery;
          if (pErr) return { error: `Product lookup failed: ${pErr.message}` };

          const productsBySeller = new Map<string, typeof products>();
          (products ?? []).forEach((p) => {
            if (!p.supplier_id) return;
            const arr = productsBySeller.get(p.supplier_id) ?? [];
            arr.push(p);
            productsBySeller.set(p.supplier_id, arr);
          });

          const rows = (sellers ?? []).map((s) => {
            const ps = productsBySeller.get(s.id as string) ?? [];
            const prices = ps
              .map((p) => parseFloat(p.price_per_unit))
              .filter((n) => Number.isFinite(n));
            const leadTimes = ps
              .map((p) => p.lead_time_days)
              .filter((n): n is number => typeof n === "number");
            const avg = (arr: number[]) =>
              arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
            const unit = ps[0]?.unit_type ?? null;

            return {
              id: s.id as string,
              business_name: (s.business_name as string) ?? "Unnamed seller",
              business_type: (s.business_type as string) ?? null,
              is_verified: !!s.is_verified,
              listing_count: ps.length,
              avg_price: avg(prices),
              min_price: prices.length ? Math.min(...prices) : null,
              max_price: prices.length ? Math.max(...prices) : null,
              avg_lead_time_days: avg(leadTimes),
              unit_type: unit,
              categories: Array.from(new Set(ps.map((p) => p.category).filter(Boolean))),
              certifications: Array.from(new Set(ps.map((p) => p.certification).filter(Boolean))),
              origin_countries: Array.from(new Set(ps.map((p) => p.origin_country).filter(Boolean))),
            };
          });

          // Preserve the requested order
          rows.sort((a, b) => sellerIds.indexOf(a.id) - sellerIds.indexOf(b.id));

          return {
            category: category ?? null,
            count: rows.length,
            sellers: rows,
          };
        },
      }),

      searchProducts: tool({
        description:
          "Search the product catalog. Use whenever the buyer asks to find, browse, or shop for products. Returns up to `limit` listings with seller info and key specs.",
        inputSchema: z.object({
          query: z
            .string()
            .default("")
            .describe("Free-text search across product name, description, and category. Pass empty string to browse."),
          category: z.enum(PRODUCT_CATEGORIES).optional(),
          maxPricePerUnit: z
            .number()
            .positive()
            .optional()
            .describe("Cap the price per unit (in INR)."),
          certification: z
            .string()
            .optional()
            .describe("Filter to listings whose certification field matches (ilike)."),
          originCountry: z.string().optional(),
          limit: z.number().int().min(1).max(20).default(8),
        }),
        execute: async ({ query, category, maxPricePerUnit, certification, originCountry, limit }) => {
          const trimmed = query.trim();

          let q = supabase
            .from("products")
            .select(
              "id, supplier_id, name, category, description, price_per_unit, unit_type, available_quantity, min_order_quantity, lead_time_days, certification, origin_country, origin_state, quality_grade, image_urls",
            )
            .eq("is_listed", true);
          if (trimmed) {
            q = q.or(
              `name.ilike.%${trimmed}%,description.ilike.%${trimmed}%,category.ilike.%${trimmed}%`,
            );
          }
          if (category) q = q.eq("category", category);
          if (certification) q = q.ilike("certification", `%${certification}%`);
          if (originCountry) q = q.ilike("origin_country", `%${originCountry}%`);

          const { data: products, error } = await q.limit(limit);
          if (error) return { error: `Search failed: ${error.message}`, products: [] };

          let filtered = products ?? [];
          if (maxPricePerUnit) {
            filtered = filtered.filter((p) => parseFloat(p.price_per_unit) <= maxPricePerUnit);
          }

          const supplierIds = Array.from(new Set(filtered.map((p) => p.supplier_id).filter(Boolean)));
          const sellerNameById = new Map<string, string>();
          if (supplierIds.length) {
            const { data: sellers } = await supabase
              .from("users")
              .select("id, business_name")
              .in("id", supplierIds);
            (sellers ?? []).forEach((s) => sellerNameById.set(s.id as string, (s.business_name as string) ?? "Seller"));
          }

          const rows = filtered.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            price_per_unit: p.price_per_unit,
            unit_type: p.unit_type,
            available_quantity: p.available_quantity,
            min_order_quantity: p.min_order_quantity,
            lead_time_days: p.lead_time_days,
            certification: p.certification,
            origin: [p.origin_state, p.origin_country].filter(Boolean).join(", ") || null,
            quality_grade: p.quality_grade,
            image_url: Array.isArray(p.image_urls) ? p.image_urls[0] : p.image_urls,
            seller_id: p.supplier_id,
            seller_name: sellerNameById.get(p.supplier_id as string) ?? "Seller",
          }));

          return {
            query: trimmed || null,
            category: category ?? null,
            count: rows.length,
            products: rows,
          };
        },
      }),

      getProductDetails: tool({
        description:
          "Fetch full details of a single product, including its seller. Use this when the buyer asks about a specific listing.",
        inputSchema: z.object({
          productId: z.string().describe("The product UUID from a previous searchProducts result."),
        }),
        execute: async ({ productId }) => {
          const { data: product, error } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .eq("is_listed", true)
            .maybeSingle();
          if (error || !product) {
            return { error: `Product not found: ${error?.message ?? "no row"}` };
          }
          const { data: seller } = await supabase
            .from("users")
            .select("id, business_name, business_type, is_verified")
            .eq("id", product.supplier_id)
            .maybeSingle();

          let attrs: Record<string, unknown> = {};
          try {
            attrs = product.dynamic_attributes ? JSON.parse(product.dynamic_attributes) : {};
          } catch {
            attrs = {};
          }

          return {
            product: {
              id: product.id,
              name: product.name,
              category: product.category,
              description: product.description,
              price_per_unit: product.price_per_unit,
              unit_type: product.unit_type,
              available_quantity: product.available_quantity,
              min_order_quantity: product.min_order_quantity,
              availability_status: product.availability_status,
              origin: [product.origin_district, product.origin_state, product.origin_country]
                .filter(Boolean)
                .join(", ") || null,
              quality_grade: product.quality_grade,
              certification: product.certification,
              test_report_available: !!product.test_report_available,
              lead_time_days: product.lead_time_days,
              packing_type: product.packing_type,
              storage_type: product.storage_type,
              transport_mode: product.transport_mode,
              image_url: Array.isArray(product.image_urls) ? product.image_urls[0] : product.image_urls,
              attributes: attrs,
            },
            seller: seller
              ? {
                  id: seller.id,
                  business_name: seller.business_name ?? "Seller",
                  business_type: seller.business_type ?? null,
                  is_verified: !!seller.is_verified,
                }
              : null,
          };
        },
      }),

      addToCart: tool({
        description:
          "Add a product listing to the authenticated buyer's cart. Always pass a productId obtained from a previous searchProducts or getProductDetails result — never invent IDs. If the buyer didn't specify a quantity, omit it and the tool will default to the product's minimum order quantity.",
        inputSchema: z.object({
          productId: z.string().describe("UUID of the product listing to add."),
          quantity: z
            .number()
            .positive()
            .optional()
            .describe(
              "How many units to add. Must be >= the product's min_order_quantity and <= available_quantity. Defaults to min_order_quantity.",
            ),
        }),
        execute: async ({ productId, quantity }) => {
          const buyerId = authData.user.id;

          const { data: product, error: pErr } = await supabase
            .from("products")
            .select("id, name, price_per_unit, unit_type, min_order_quantity, available_quantity, is_listed, image_urls, supplier_id")
            .eq("id", productId)
            .maybeSingle();
          if (pErr || !product) {
            return { error: `Product not found: ${pErr?.message ?? "no row"}` };
          }
          if (!product.is_listed) {
            return { error: "This product is no longer listed." };
          }

          const moq = parseFloat(product.min_order_quantity ?? "1") || 1;
          const avail = parseFloat(product.available_quantity ?? "0") || 0;
          const qty = quantity ?? moq;
          if (qty < moq) {
            return {
              error: `Minimum order quantity is ${moq} ${product.unit_type}. Suggest the buyer increase the quantity.`,
            };
          }
          if (avail > 0 && qty > avail) {
            return {
              error: `Only ${avail} ${product.unit_type} available. Suggest the buyer reduce the quantity.`,
            };
          }

          // Find or create cart for this buyer (using authenticated client → RLS-safe)
          const { data: existingCarts } = await supabase
            .from("cart")
            .select("id")
            .eq("buyer_id", buyerId)
            .order("created_at", { ascending: true })
            .limit(1);
          let cartId: string | null = existingCarts?.[0]?.id ?? null;
          if (!cartId) {
            const { data: newCart, error: cErr } = await supabase
              .from("cart")
              .insert({ buyer_id: buyerId })
              .select("id")
              .single();
            if (cErr || !newCart) {
              return { error: `Could not create cart: ${cErr?.message ?? "unknown"}` };
            }
            cartId = newCart.id;
          }

          const { data: existingItems } = await supabase
            .from("cart_items")
            .select("id, quantity")
            .eq("cart_id", cartId)
            .eq("product_id", productId)
            .limit(1);
          const existing = existingItems?.[0];

          let action: "added" | "increased";
          let newQuantity: number;
          if (existing) {
            newQuantity = (existing.quantity as number) + qty;
            if (avail > 0 && newQuantity > avail) {
              return {
                error: `Adding ${qty} would exceed available stock (${avail}). Cart already has ${existing.quantity}.`,
              };
            }
            const { error: uErr } = await supabase
              .from("cart_items")
              .update({ quantity: newQuantity })
              .eq("id", existing.id);
            if (uErr) return { error: `Update failed: ${uErr.message}` };
            action = "increased";
          } else {
            newQuantity = qty;
            const { error: iErr } = await supabase
              .from("cart_items")
              .insert({ cart_id: cartId, product_id: productId, quantity: qty });
            if (iErr) return { error: `Insert failed: ${iErr.message}` };
            action = "added";
          }

          const price = parseFloat(product.price_per_unit) || 0;

          // Look up the supplier's volume-discount slabs so the buyer
          // immediately sees what they've unlocked and what's within reach.
          const slabs = product.supplier_id
            ? await fetchSlabsForSupplier(product.supplier_id, supabase)
            : [];
          const applicable = pickApplicableSlab(slabs, newQuantity);
          const next = pickNextSlab(slabs, newQuantity);

          return {
            action,
            product: {
              id: product.id,
              name: product.name,
              unit_type: product.unit_type,
              price_per_unit: price,
              image_url: Array.isArray(product.image_urls) ? product.image_urls[0] : product.image_urls,
            },
            quantity_added: qty,
            cart_quantity_after: newQuantity,
            line_total: Math.round(price * newQuantity),
            slabs: slabs.map((s) => ({
              minimum_slab: s.minimum_slab,
              discount_percentage: s.discount_percentage,
              unlocked: newQuantity >= s.minimum_slab,
            })),
            applied_slab: applicable
              ? {
                  minimum_slab: applicable.minimum_slab,
                  discount_percentage: applicable.discount_percentage,
                }
              : null,
            next_slab: next
              ? {
                  minimum_slab: next.minimum_slab,
                  discount_percentage: next.discount_percentage,
                  units_to_go: next.minimum_slab - newQuantity,
                }
              : null,
          };
        },
      }),

      updateCartItemQuantity: tool({
        description:
          "Set the quantity of a single cart line to an exact new value. Use viewCart first to discover the cart_item_id. To increase by a delta, fetch the current quantity and pass current+delta as the new value.",
        inputSchema: z.object({
          cartItemId: z.string().describe("The cart_item id from a viewCart result."),
          quantity: z.number().positive().describe("New absolute quantity. Must be ≥ MOQ and ≤ available stock."),
        }),
        execute: async ({ cartItemId, quantity }) => {
          const buyerId = authData.user.id;

          const { data: row, error: rErr } = await supabase
            .from("cart_items")
            .select("id, cart_id, quantity, product:products(id, name, unit_type, min_order_quantity, available_quantity, price_per_unit, image_urls), cart:cart(buyer_id)")
            .eq("id", cartItemId)
            .maybeSingle();
          if (rErr || !row) {
            return { error: `Cart line not found: ${rErr?.message ?? "no row"}` };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cart = (row as any).cart;
          if (cart?.buyer_id !== buyerId) {
            return { error: "That cart line does not belong to you." };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const product = (row as any).product;
          if (!product) return { error: "Linked product missing." };

          const moq = parseFloat(product.min_order_quantity ?? "1") || 1;
          const avail = parseFloat(product.available_quantity ?? "0") || 0;
          if (quantity < moq) {
            return { error: `Minimum order quantity is ${moq} ${product.unit_type}.` };
          }
          if (avail > 0 && quantity > avail) {
            return { error: `Only ${avail} ${product.unit_type} available.` };
          }

          const { error: uErr } = await supabase
            .from("cart_items")
            .update({ quantity })
            .eq("id", cartItemId);
          if (uErr) return { error: `Update failed: ${uErr.message}` };

          const price = parseFloat(product.price_per_unit) || 0;
          return {
            cart_item_id: cartItemId,
            product: {
              id: product.id,
              name: product.name,
              unit_type: product.unit_type,
              price_per_unit: price,
              image_url: Array.isArray(product.image_urls) ? product.image_urls[0] : product.image_urls,
            },
            previous_quantity: row.quantity as number,
            new_quantity: quantity,
            line_total: Math.round(price * quantity),
          };
        },
      }),

      removeFromCart: tool({
        description:
          "Remove a single line from the buyer's cart. Use viewCart first to discover the cart_item_id.",
        inputSchema: z.object({
          cartItemId: z.string().describe("The cart_item id from a viewCart result."),
        }),
        execute: async ({ cartItemId }) => {
          const buyerId = authData.user.id;

          const { data: row, error: rErr } = await supabase
            .from("cart_items")
            .select("id, quantity, product:products(name, unit_type, image_urls), cart:cart(buyer_id)")
            .eq("id", cartItemId)
            .maybeSingle();
          if (rErr || !row) {
            return { error: `Cart line not found: ${rErr?.message ?? "no row"}` };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((row as any).cart?.buyer_id !== buyerId) {
            return { error: "That cart line does not belong to you." };
          }

          const { error: dErr } = await supabase.from("cart_items").delete().eq("id", cartItemId);
          if (dErr) return { error: `Remove failed: ${dErr.message}` };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const product = (row as any).product;
          return {
            removed_cart_item_id: cartItemId,
            product_name: product?.name ?? "Unknown",
            removed_quantity: row.quantity as number,
            unit_type: product?.unit_type ?? "unit",
            image_url: Array.isArray(product?.image_urls) ? product.image_urls[0] : product?.image_urls ?? null,
          };
        },
      }),

      findBuyers: tool({
        description:
          "Search the platform's buyers (companies that purchase raw materials). Use when the user asks to find or list buyers.",
        inputSchema: z.object({
          query: z.string().default("").describe("Free-text match against buyer business name or type. Empty string browses."),
          limit: z.number().int().min(1).max(20).default(8),
        }),
        execute: async ({ query, limit }) => {
          const trimmed = query.trim();
          let q = supabase
            .from("users")
            .select("id, business_name, business_type, business_address, gstin, is_verified")
            .eq("role", "buyer");
          if (trimmed) {
            q = q.or(`business_name.ilike.%${trimmed}%,business_type.ilike.%${trimmed}%`);
          }
          const { data, error } = await q.limit(limit);
          if (error) return { error: `Lookup failed: ${error.message}`, buyers: [] };
          const buyers = (data ?? []).map((b) => ({
            id: b.id,
            business_name: b.business_name ?? "Unnamed buyer",
            business_type: b.business_type ?? null,
            business_address: b.business_address ?? null,
            is_verified: !!b.is_verified,
          }));
          return { query: trimmed || null, count: buyers.length, buyers };
        },
      }),

      analyseSellers: tool({
        description:
          "Run an aggregate analysis across the marketplace and return chart-ready data. Pick the metric (avg price, avg lead time, listing count) and how to group it (by category, by origin country, by certification, or by seller). Use this for any 'show me a chart of...', 'analyse...', or 'breakdown of...' question.",
        inputSchema: z.object({
          metric: z
            .enum(["avg_price", "avg_lead_time", "listing_count"])
            .describe("What to measure on the y-axis."),
          groupBy: z
            .enum(["category", "origin_country", "certification", "seller"])
            .describe("What to group rows by on the x-axis."),
          category: z.enum(PRODUCT_CATEGORIES).optional().describe("Optional category filter."),
          limit: z.number().int().min(1).max(20).default(10),
        }),
        execute: async ({ metric, groupBy, category, limit }) => {
          let q = supabase
            .from("products")
            .select("supplier_id, category, price_per_unit, unit_type, lead_time_days, certification, origin_country")
            .eq("is_listed", true);
          if (category) q = q.eq("category", category);
          const { data: products, error } = await q.limit(2000);
          if (error) return { error: `Analysis failed: ${error.message}`, groups: [] };

          const list = products ?? [];

          let supplierNameById = new Map<string, string>();
          if (groupBy === "seller") {
            const ids = Array.from(new Set(list.map((p) => p.supplier_id).filter(Boolean)));
            if (ids.length) {
              const { data: sellers } = await supabase
                .from("users")
                .select("id, business_name")
                .in("id", ids);
              supplierNameById = new Map(
                (sellers ?? []).map((s) => [s.id as string, (s.business_name as string) ?? "Seller"]),
              );
            }
          }

          const keyFor = (p: (typeof list)[number]): string | null => {
            switch (groupBy) {
              case "category":
                return p.category ?? null;
              case "origin_country":
                return p.origin_country ?? null;
              case "certification":
                return p.certification ?? null;
              case "seller":
                return p.supplier_id ? supplierNameById.get(p.supplier_id) ?? null : null;
            }
          };

          const buckets = new Map<
            string,
            { sumPrice: number; priceCount: number; sumLead: number; leadCount: number; count: number; unit: string | null }
          >();
          list.forEach((p) => {
            const key = keyFor(p);
            if (!key) return;
            const cur = buckets.get(key) ?? { sumPrice: 0, priceCount: 0, sumLead: 0, leadCount: 0, count: 0, unit: null };
            cur.count += 1;
            const price = parseFloat(p.price_per_unit);
            if (Number.isFinite(price)) {
              cur.sumPrice += price;
              cur.priceCount += 1;
              cur.unit ??= p.unit_type;
            }
            if (typeof p.lead_time_days === "number") {
              cur.sumLead += p.lead_time_days;
              cur.leadCount += 1;
            }
            buckets.set(key, cur);
          });

          let groups = Array.from(buckets.entries()).map(([label, v]) => {
            let value = 0;
            if (metric === "avg_price") value = v.priceCount ? Math.round(v.sumPrice / v.priceCount) : 0;
            else if (metric === "avg_lead_time") value = v.leadCount ? Math.round(v.sumLead / v.leadCount) : 0;
            else value = v.count;
            return { label, value, unit: v.unit, sample_size: v.count };
          });
          groups = groups.filter((g) => g.value > 0);
          groups.sort((a, b) => b.value - a.value);
          groups = groups.slice(0, limit);

          return {
            metric,
            groupBy,
            category: category ?? null,
            count: groups.length,
            groups,
          };
        },
      }),

      proceedToCheckout: tool({
        description:
          "Hand the buyer off to the checkout page to review and pay. Returns a deep link for the UI to render as a button — does NOT charge anything itself. Only call this when the buyer explicitly asks to check out, pay, or place the order, and only when their cart is non-empty.",
        inputSchema: z.object({}),
        execute: async () => {
          const buyerId = authData.user.id;

          const { data: carts } = await supabase
            .from("cart")
            .select("id")
            .eq("buyer_id", buyerId);
          const cartIds = (carts ?? []).map((c) => c.id as string);
          if (!cartIds.length) {
            return { error: "Your cart is empty — add a product before checking out." };
          }
          const { data: items } = await supabase
            .from("cart_items")
            .select("quantity, discount_percentage, product:products(price_per_unit)")
            .in("cart_id", cartIds);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows = (items ?? []) as any[];
          if (!rows.length) {
            return { error: "Your cart is empty — add a product before checking out." };
          }
          const total = rows.reduce((sum, r) => {
            const price = parseFloat(r.product?.price_per_unit ?? "0") || 0;
            const pct = Number(r.discount_percentage) || 0;
            return sum + price * (r.quantity as number) * (1 - pct / 100);
          }, 0);
          const itemCount = rows.reduce((sum, r) => sum + (r.quantity as number), 0);

          return {
            checkout_url: "/dashboard/checkout",
            line_count: rows.length,
            item_count: itemCount,
            total_value: Math.round(total),
          };
        },
      }),

      clearCart: tool({
        description:
          "Remove every line from the buyer's cart. Only call this when the buyer explicitly asks to clear, empty, or reset their cart.",
        inputSchema: z.object({}),
        execute: async () => {
          const buyerId = authData.user.id;

          const { data: carts } = await supabase
            .from("cart")
            .select("id")
            .eq("buyer_id", buyerId);
          const cartIds = (carts ?? []).map((c) => c.id as string);
          if (!cartIds.length) {
            return { items_removed: 0 };
          }
          const { count } = await supabase
            .from("cart_items")
            .select("id", { count: "exact", head: true })
            .in("cart_id", cartIds);
          const { error: dErr } = await supabase
            .from("cart_items")
            .delete()
            .in("cart_id", cartIds);
          if (dErr) return { error: `Clear failed: ${dErr.message}` };
          return { items_removed: count ?? 0 };
        },
      }),

      viewCart: tool({
        description:
          "Show what's currently in the authenticated buyer's cart. Use when the buyer asks 'what's in my cart', wants a recap, or before suggesting checkout.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data: carts } = await supabase
            .from("cart")
            .select("id")
            .eq("buyer_id", authData.user.id);
          const cartIds = (carts ?? []).map((c) => c.id as string);
          if (!cartIds.length) {
            return { item_count: 0, total_value: 0, items: [] };
          }
          const { data: items, error } = await supabase
            .from("cart_items")
            .select("id, quantity, added_at, discount_percentage, product:products(id, name, category, price_per_unit, unit_type, image_urls, supplier_id)")
            .in("cart_id", cartIds);
          if (error) return { error: `Cart lookup failed: ${error.message}`, items: [] };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows = (items ?? []).map((it: any) => {
            const p = it.product;
            const price = parseFloat(p?.price_per_unit ?? "0") || 0;
            const qty = it.quantity as number;
            const pct = Number(it.discount_percentage) || 0;
            const gross = price * qty;
            const lineTotal = gross * (1 - pct / 100);
            return {
              cart_item_id: it.id,
              product_id: p?.id,
              product_name: p?.name ?? "Unknown",
              category: p?.category ?? null,
              quantity: qty,
              unit_type: p?.unit_type ?? "unit",
              price_per_unit: price,
              discount_percentage: pct,
              line_total: lineTotal,
              line_total_before_discount: gross,
              image_url: Array.isArray(p?.image_urls) ? p.image_urls[0] : p?.image_urls ?? null,
            };
          });
          const total = rows.reduce((sum, r) => sum + r.line_total, 0);
          return {
            item_count: rows.reduce((sum, r) => sum + r.quantity, 0),
            line_count: rows.length,
            total_value: Math.round(total),
            items: rows,
          };
        },
      }),

      lookupKnowledge: tool({
        description:
          "Retrieve relevant information from the SupplAI knowledge base AND live marketplace data to ground your answer. Returns up to `limit` ranked hits across four kinds: 'concept' (curated KB articles on logistics/certifications/GST/compliance/etc.), 'product' (live listings), 'seller' (live suppliers), and 'category'. Call this FIRST whenever the buyer asks a procedural / definitional / 'what is X' / 'how does X work' question, or when you want to back up a recommendation with live data. After calling, you MUST cite the hits you used in your reply using the [KB:slug] / [PRODUCT:id] / [SELLER:id] / [CATEGORY:slug] format on a final 'Sources:' line.",
        inputSchema: z.object({
          query: z
            .string()
            .min(2)
            .describe(
              "What to look up. Use the buyer's own phrasing or a concise topical search (e.g. 'FSSAI certification', 'GST inter-state shipping', 'cardamom Kerala'). Do NOT pad with stopwords.",
            ),
          limit: z
            .number()
            .int()
            .min(1)
            .max(10)
            .default(6)
            .describe("Maximum number of hits to return."),
        }),
        execute: async ({ query, limit }) => {
          const hits = await searchKnowledge(supabase, query, limit);
          return {
            query,
            count: hits.length,
            hits,
          };
        },
      }),

      researchMarketPrice: tool({
        description:
          "Search the live web for the current market/wholesale price of a product. Use this during negotiation to anchor on real-world prices before offering a discount. Returns top 5 search snippets with titles and URLs.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Search query — typically the product name plus 'wholesale price per <unit>'. Be specific (include grade or category if known).",
            ),
        }),
        execute: async ({ query }) => {
          const results = await firecrawlSearch(query);
          if (!results) {
            return { query, results: "", note: "No web results available." };
          }
          return { query, results };
        },
      }),

      scrapeCompetitorUrl: tool({
        description:
          "Fetch and read the contents of a URL the buyer pasted (e.g. a competing listing on another site). Use this when the buyer claims a cheaper price is available somewhere else, so you can compare specs fairly before granting a discount. Returns markdown content (truncated).",
        inputSchema: z.object({
          url: z.string().url().describe("The full http(s) URL the buyer referenced."),
        }),
        execute: async ({ url }) => {
          const content = await firecrawlScrape(url);
          if (!content) {
            return { url, content: "", note: "Could not scrape this URL." };
          }
          return { url, content };
        },
      }),

      applyDiscount: tool({
        description: `Apply a negotiated discount percentage to a single cart line. The discount is capped at ${MAX_DISCOUNT_PCT}% — any value above that is clamped down to ${MAX_DISCOUNT_PCT}. Only call this AFTER you and the buyer have agreed on a percentage during negotiation. The discount is stored on the cart_item and deducted at checkout. Use viewCart first to get the cart_item_id.`,
        inputSchema: z.object({
          cartItemId: z.string().describe("The cart_item id from a viewCart result."),
          discountPercentage: z
            .number()
            .min(0)
            .max(100)
            .describe(
              `Discount percentage to apply (0–${MAX_DISCOUNT_PCT}). Values above ${MAX_DISCOUNT_PCT} are clamped.`,
            ),
        }),
        execute: async ({ cartItemId, discountPercentage }) => {
          const buyerId = authData.user.id;
          const pct = Math.min(
            Math.max(0, Math.round(discountPercentage * 100) / 100),
            MAX_DISCOUNT_PCT,
          );

          const { data: row, error: rErr } = await supabase
            .from("cart_items")
            .select(
              "id, quantity, product:products(id, name, unit_type, price_per_unit, image_urls), cart:cart(buyer_id)",
            )
            .eq("id", cartItemId)
            .maybeSingle();
          if (rErr || !row) {
            return { error: `Cart line not found: ${rErr?.message ?? "no row"}` };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cart = (row as any).cart;
          if (cart?.buyer_id !== buyerId) {
            return { error: "That cart line does not belong to you." };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const product = (row as any).product;
          if (!product) return { error: "Linked product missing." };

          const { error: uErr } = await supabase
            .from("cart_items")
            .update({ discount_percentage: pct })
            .eq("id", cartItemId);
          if (uErr) {
            return {
              error: `Could not save discount: ${uErr.message}. Make sure the cart_items table has a discount_percentage column.`,
            };
          }

          const price = parseFloat(product.price_per_unit) || 0;
          const qty = row.quantity as number;
          const original = price * qty;
          const discounted = original * (1 - pct / 100);
          return {
            cart_item_id: cartItemId,
            product: {
              id: product.id,
              name: product.name,
              unit_type: product.unit_type,
              image_url: Array.isArray(product.image_urls)
                ? product.image_urls[0]
                : product.image_urls,
            },
            quantity: qty,
            unit_price: price,
            discount_percentage: pct,
            discount_capped: discountPercentage > MAX_DISCOUNT_PCT,
            max_discount_percentage: MAX_DISCOUNT_PCT,
            original_line_total: Math.round(original),
            discounted_line_total: Math.round(discounted),
            savings: Math.round(original - discounted),
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    // Assign a real ID to every newly-generated assistant message. Without
    // this, the SDK leaves m.id as an empty string, which collides on upsert
    // and silently drops the row (we saw this in `[api/agent] onFinish` logs:
    // `assistant#` with no id).
    generateMessageId: () => crypto.randomUUID(),
    onFinish: async ({ messages: finalMessages }) => {
      // Upsert every message in the conversation by id (idempotent on retries).
      // We assign each row a per-index created_at so ordering by created_at on
      // load preserves the original send order (the column's default now() ties
      // all rows in a single insert, which loses the user→assistant order).
      // ignoreDuplicates keeps each message's original timestamp once written.
      try {
        const base = Date.now();
        const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);
        const rows = finalMessages
          .filter((m) => ALLOWED_ROLES.has(m.role))
          .map((m, i) => ({
            id: m.id,
            conversation_id: conversationId,
            role: m.role,
            parts: m.parts,
            created_at: new Date(base + i).toISOString(),
          }));
        const dropped = finalMessages.length - rows.length;
        if (dropped > 0) {
          console.warn(
            `[api/agent] dropped ${dropped} messages with non-standard roles:`,
            finalMessages
              .filter((m) => !ALLOWED_ROLES.has(m.role))
              .map((m) => m.role),
          );
        }
        console.log(
          `[api/agent] onFinish: ${rows.length} messages →`,
          rows.map((r) => `${r.role}#${r.id.slice(0, 8)}`).join(", "),
        );
        const { data: saved, error: upErr } = await supabase
          .from("agent_messages")
          .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
          .select("id");
        if (upErr) {
          console.error(
            "[api/agent] save messages FAILED:",
            upErr.message,
            upErr.details,
            upErr.hint,
            "— if the error mentions 'invalid input syntax for type uuid', run: alter table public.agent_messages alter column id type text;",
          );
        } else {
          console.log(
            `[api/agent] saved ${saved?.length ?? 0}/${rows.length} messages (skipped existing)`,
          );
        }

        const { error: tErr } = await supabase
          .from("agent_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
        if (tErr) console.error("[api/agent] touch conversation FAILED:", tErr.message);
      } catch (e) {
        console.error("[api/agent] persistence error:", e);
      }
    },
  });
}
