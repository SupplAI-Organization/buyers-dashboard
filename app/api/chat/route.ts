import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  fetchProductById,
  formatPrice,
  parseAttributes,
} from "@/lib/productService";
import { Product } from "@/lib/product";
import { createClient } from "@supabase/supabase-js";
import FirecrawlApp from "@mendable/firecrawl-js";

const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

const NEGOTIATION_REGEX =
  /\b(negotiat|bargain|discount|cheaper|lower price|reduce price|price too high|better price|price match)\b/i;
const URL_REGEX = /https?:\/\/[^\s)]+/gi;

async function searchMarketPrices(query: string): Promise<string> {
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

async function scrapeUrl(url: string): Promise<string> {
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

function getAuthenticatedSupabase(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const productCache = new Map<string, { data: Product; cachedAt: number }>();

async function getProduct(productId: string): Promise<Product | null> {
  const cached = productCache.get(productId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.data;
  }
  const product = await fetchProductById(productId);
  if (product) {
    productCache.set(productId, { data: product, cachedAt: Date.now() });
  }
  return product;
}

function buildSystemPrompt(
  product: Product,
  marketResearch?: string,
  scrapedContext?: { url: string; content: string }[],
  negotiationMode?: boolean,
): string {
  const attrs = parseAttributes(product.dynamic_attributes);
  const attrLines = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `  - ${k.replace(/_/g, " ")}: ${v}`)
    .join("\n");

  const origin = [product.origin_district, product.origin_state, product.origin_country]
    .filter(Boolean)
    .join(", ");

  const priceNum = parseFloat(product.price_per_unit);
  const listedPriceStr = formatPrice(product.price_per_unit, product.unit_type);
  const d5 = formatPrice(String(priceNum * 0.95), product.unit_type);
  const d10 = formatPrice(String(priceNum * 0.9), product.unit_type);
  const d15 = formatPrice(String(priceNum * 0.85), product.unit_type);
  const d20 = formatPrice(String(priceNum * 0.8), product.unit_type);

  const marketResearchBlock = marketResearch
    ? `\n\nLive Market Price Research (from the web, top 5 results):\n${marketResearch}`
    : "";

  const negotiationSection = negotiationMode
    ? `${marketResearchBlock}\n\n=== NEGOTIATION PROTOCOL (MANDATORY) ===\nYou ARE fully authorized to negotiate and grant discounts of up to 20% off the listed price on your own. Do NOT say you are "just a chat bot" or that you "cannot offer discounts" — that is false. You have full authority within the 20% cap.\n\nListed price: ${listedPriceStr}\nPre-computed discount tiers you may offer:\n  - 5% off  → ${d5}\n  - 10% off → ${d10}\n  - 15% off → ${d15}\n  - 20% off → ${d20} (maximum, never go below this)\n\nHow to respond when the buyer asks for a discount:\n1. ${marketResearch ? `Open by stating the market average price based on the research above (same unit as the listed price). Example: "The market average price is around $X per ${product.unit_type}, and our listed price of ${listedPriceStr} is already competitive."` : `Open by emphasizing that the listed price of ${listedPriceStr} is already competitive for the quality grade, certification, and origin offered.`}\n2. Justify the price using quality grade, certification, origin, lead time, packing, and transport mode.\n3. Then proactively offer a starting discount (begin at 5% → ${d5}). Make the offer concrete and state the new per-unit price.\n4. If the buyer pushes further, escalate step-by-step: 10% → ${d10}, then 15% → ${d15}, then the final 20% → ${d20}. Never exceed 20%.\n5. At 20%, make it clear this is the absolute final offer you can authorize.\n6. Always be confident, warm, and persuasive — you are closing a deal, not refusing one. Most improtantly keep things consise make the output point wise and do not give long text as user will not read long texts\n=== END NEGOTIATION PROTOCOL ===`
    : "";

  const scrapedSection =
    scrapedContext && scrapedContext.length
      ? `\n\nBuyer-Provided Web Pages (scraped content — treat as context the buyer is pointing to, e.g. a competing listing):\n${scrapedContext
          .map((s, i) => `[Source ${i + 1}] ${s.url}\n${s.content}`)
          .join("\n\n---\n\n")}\n\nIf the buyer references "this website", "that link", or claims a cheaper price is available, use the scraped content above to compare specs fairly. Point out differences in quality, quantity, certification, origin, delivery terms, and total landed cost to justify the SupplAI listing.`
      : "";

  return `You are a knowledgeable product assistant for SupplAI, a B2B raw materials marketplace. Answer buyer questioPns about the following product accurately and concisely. Base answers on the product details provided and any market research or scraped web context included below. If something truly cannot be answered from the available context, say so clearly.${negotiationSection}${scrapedSection}

Product Details:
- Name: ${product.name}
- Category: ${product.category}
- Price: ${formatPrice(product.price_per_unit, product.unit_type)}
- Available Quantity: ${product.available_quantity} ${product.unit_type}
- Minimum Order Quantity: ${product.min_order_quantity} ${product.unit_type}
- Availability Status: ${product.availability_status ?? "Not specified"}
- Origin: ${origin || "Not specified"}
- Source Name: ${product.source_name ?? "Not specified"}
- Quality Grade: ${product.quality_grade ?? "Not specified"}
- Certification: ${product.certification ?? "None"}
- Test Report Available: ${product.test_report_available ? "Yes" : "No"}
- Lead Time: ${product.lead_time_days != null ? `${product.lead_time_days} days` : "Not specified"}
- Packing Type: ${product.packing_type ?? "Not specified"}
- Storage Type: ${product.storage_type ?? "Not specified"}
- Transport Mode: ${product.transport_mode ?? "Not specified"}
- Description: ${product.description}
${attrLines ? `- Technical Specifications:\n${attrLines}` : ""}`;
}

export async function POST(request: Request) {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  let body: { productId?: string; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { productId, messages } = body;

  if (!productId || !Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "productId and a non-empty messages array are required" },
      { status: 400 },
    );
  }

  const product = await getProduct(productId);
  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const authenticatedSupabase = getAuthenticatedSupabase(request);
  if (!authenticatedSupabase) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: authData, error: authError } = await authenticatedSupabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const senderId = authData.user.id;

  // Fire buyer message insert without blocking the stream
  // receiver_id is null — message is directed to the AI, not a specific user
  const lastMessage = messages[messages.length - 1] as { role: string; content: string };
  authenticatedSupabase.from("messages").insert({
    sender_id: senderId || null,
    sender_role: "buyer",
    content: lastMessage.content,
    product_id: productId,
    receiver_id: null,
  }).then(({ error }) => {
    if (error) console.error("Failed to save buyer message:", error.message);
  });

  const userText = lastMessage.content ?? "";

  const urls = Array.from(new Set(userText.match(URL_REGEX) ?? [])).slice(0, 3);
  const allUserText = (messages as { role: string; content: string }[])
    .filter((m) => m.role === "user")
    .map((m) => m.content ?? "")
    .join("\n");
  const wantsNegotiation = NEGOTIATION_REGEX.test(allUserText);

  const [marketResearch, scrapedContext] = await Promise.all([
    wantsNegotiation
      ? searchMarketPrices(
          `${product.name} ${product.category ?? ""} price per ${product.unit_type ?? "unit"} wholesale market`,
        )
      : Promise.resolve(""),
    urls.length
      ? Promise.all(
          urls.map(async (url) => ({ url, content: await scrapeUrl(url) })),
        ).then((arr) => arr.filter((s) => s.content))
      : Promise.resolve([] as { url: string; content: string }[]),
  ]);

  let result;
  try {
    result = streamText({
      model: google("gemini-2.5-flash"),
      maxRetries: 0,
      system: buildSystemPrompt(product, marketResearch, scrapedContext, wantsNegotiation),
      messages: messages as { role: "user" | "assistant"; content: string }[],
      onFinish: ({ text }) => {
        authenticatedSupabase.from("messages").insert({
          sender_id: null,
          sender_role: "ai",
          content: text,
          product_id: productId,
          receiver_id: senderId || null,
        }).then(({ error }) => {
          if (error) console.error("Failed to save AI message:", error.message);
        });
      },
    });
  } catch (err) {
    console.error("[api/chat] streamText error:", err);
    return Response.json({ error: "AI model error" }, { status: 500 });
  }

  return result.toTextStreamResponse();
}
