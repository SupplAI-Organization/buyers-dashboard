import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  fetchProductById,
  formatPrice,
  parseAttributes,
} from "@/lib/productService";
import { Product } from "@/lib/product";

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

  return `You are a knowledgeable product assistant for SupplAI, a B2B raw materials marketplace. Answer buyer questions about the following product accurately and concisely. Only answer based on the product details provided. If a question cannot be answered from the product details, say so clearly.

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

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: buildSystemPrompt(product),
    messages: messages as { role: "user" | "assistant"; content: string }[],
  });

  return result.toTextStreamResponse();
}
