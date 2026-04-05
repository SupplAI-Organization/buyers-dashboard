import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  fetchProductById,
  formatPrice,
  parseAttributes,
} from "@/lib/productService";
import { Product } from "@/lib/product";
import { createClient } from "@supabase/supabase-js";

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

function buildSystemPrompt(product: Product): string {
  const attrs = parseAttributes(product.dynamic_attributes);
  const attrLines = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `  - ${k.replace(/_/g, " ")}: ${v}`)
    .join("\n");

  const origin = [product.origin_district, product.origin_state, product.origin_country]
    .filter(Boolean)
    .join(", ");

  return `You are a knowledgeable product assistant for SupplAI, a B2B raw materials marketplace. Answer buyer questions about the following product accurately and concisely. Only answer based on the product details provided. If a question cannot be answered from the product details, say so clearly. If the buyer asks anyting about bargaining or negotiation, like discounts or reducing price tell him I am just a chat bot for negotiations please wait for the supplier to response

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
  console.log("[api/chat] API key last 8 chars:", key ? `...${key.slice(-8)}` : "NOT SET");
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

  let result;
  try {
    result = streamText({
      model: google("gemini-2.5-flash"),
      maxRetries: 0,
      system: buildSystemPrompt(product),
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
