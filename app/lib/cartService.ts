import { supabase } from "./supabaseClient";
import { Product } from "./product";

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
  product?: Product;
}

export interface Cart {
  id: string;
  buyer_id: string;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
}

/**
 * Get the current user's cart. Creates one if it doesn't exist.
 */
export async function getOrCreateCart(userId: string): Promise<Cart | null> {
  // 1. Try to find existing cart
  const { data: cart, error } = await supabase
    .from("cart")
    .select("*")
    .eq("buyer_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "No rows found"
    console.error("Error fetching cart:", error);
    return null;
  }

  if (cart) {
    return cart;
  }

  // 2. Create new cart if none exists
  const { data: newCart, error: createError } = await supabase
    .from("cart")
    .insert([{ buyer_id: userId }])
    .select()
    .single();

  if (createError) {
    if (createError.code === "23505") {
      // Duplicate key violation - means cart was created concurrently.
      // Retry fetching.
      const { data: retryCart, error: retryError } = await supabase
        .from("cart")
        .select("*")
        .eq("buyer_id", userId)
        .single();

      if (retryCart) return retryCart;
      console.error("Error fetching cart after duplicate error:", retryError);
      return null;
    }

    console.error(
      "Error creating cart:",
      createError.message,
      createError.code,
      createError.details,
    );
    return null;
  }

  return newCart;
}

/**
 * Get the cart with all items and product details
 */
export async function getCartWithItems(userId: string): Promise<Cart | null> {
  // First ensure cart exists
  const cart = await getOrCreateCart(userId);
  if (!cart) return null;

  // Fetch items with product details
  const { data: items, error } = await supabase
    .from("cart_items")
    .select(
      `
      *,
      product:products (*)
    `,
    )
    .eq("cart_id", cart.id);

  if (error) {
    console.error("Error fetching cart items:", error);
    return cart;
  }

  return { ...cart, items: items as unknown as CartItem[] };
}

/**
 * Add a product to the cart
 */
export async function addToCart(
  userId: string,
  productId: string,
  quantity: number = 1,
): Promise<boolean> {
  const cart = await getOrCreateCart(userId);
  if (!cart) return false;

  // Check if item already exists
  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .single();

  if (existingItem) {
    // Update quantity
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existingItem.quantity + quantity })
      .eq("id", existingItem.id);

    if (error) {
      console.error("Error updating cart item:", error);
      return false;
    }
  } else {
    // Insert new item
    const { error } = await supabase.from("cart_items").insert([
      {
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
      },
    ]);

    if (error) {
      console.error("Error adding item to cart:", error);
      return false;
    }
  }

  return true;
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  itemId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity < 1) return false;

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);

  return !error;
}

/**
 * Remove item from cart
 */
export async function removeCartItem(itemId: string): Promise<boolean> {
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);

  return !error;
}

/**
 * Clear all items from the user's cart
 */
export async function clearCart(userId: string): Promise<boolean> {
  const cart = await getOrCreateCart(userId);
  if (!cart) return false;

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cart.id);

  if (error) {
    console.error("Error clearing cart:", error);
    return false;
  }

  return true;
}
