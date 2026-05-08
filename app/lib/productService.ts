import { supabase } from "./supabaseClient";
import { Product } from "./product";

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_listed", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data || [];
}

export async function fetchProductsByCategory(
  category: string,
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_listed", true)
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }

  return data || [];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return data;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_listed", true)
    .or(
      `name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error searching products:", error);
    return [];
  }

  return data || [];
}

export function formatPrice(price: string, unitType: string): string {
  const priceNum = parseFloat(price);
  return `₹${priceNum.toLocaleString("en-IN")}/${unitType}`;
}

export function parseAttributes(attributes: string): Record<string, any> {
  try {
    return JSON.parse(attributes);
  } catch {
    return {};
  }
}
