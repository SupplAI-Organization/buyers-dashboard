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
  const { data: cartList, error } = await supabase
    .from("cart")
    .select("*")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Error fetching cart:", error);
    return null;
  }

  if (cartList && cartList.length > 0) {
    return cartList[0];
  }

  // 2. Create new cart if none exists
  const { data: newCartList, error: createError } = await supabase
    .from("cart")
    .insert([{ buyer_id: userId }])
    .select()
    .limit(1);

  if (createError) {
    if (createError.code === "23505") {
      // Duplicate key violation - means cart was created concurrently.
      // Retry fetching.
      const { data: retryCartList } = await supabase
        .from("cart")
        .select("*")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (retryCartList && retryCartList.length > 0) return retryCartList[0];
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

  return newCartList ? newCartList[0] : null;
}

/**
 * Get the cart with all items and product details
 */
export async function getCartWithItems(userId: string): Promise<Cart | null> {
  // First ensure cart exists
  const cart = await getOrCreateCart(userId);
  if (!cart) return null;

  // Get all cart IDs for this user to consolidate items spread across duplicates
  const { data: userCarts } = await supabase
    .from("cart")
    .select("id")
    .eq("buyer_id", userId);
  
  const cartIds = userCarts?.map(c => c.id) || [cart.id];

  // Fetch items with product details
  const { data: items, error } = await supabase
    .from("cart_items")
    .select(
      `
      *,
      product:products (*)
    `,
    )
    .in("cart_id", cartIds);

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

  const { data: userCarts } = await supabase
    .from("cart")
    .select("id")
    .eq("buyer_id", userId);
  const cartIds = userCarts?.map(c => c.id) || [cart.id];

  // Check if item already exists across any of the user's carts
  const { data: existingItems } = await supabase
    .from("cart_items")
    .select("*")
    .in("cart_id", cartIds)
    .eq("product_id", productId)
    .limit(1);
    
  const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null;

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
  // Get all cart IDs for this user
  const { data: userCarts } = await supabase
    .from("cart")
    .select("id")
    .eq("buyer_id", userId);
  
  if (!userCarts || userCarts.length === 0) return true;
  
  const cartIds = userCarts.map(c => c.id);

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .in("cart_id", cartIds);

  if (error) {
    console.error("Error clearing cart:", error);
    return false;
  }

  // Optional: delete duplicated carts
  if (cartIds.length > 1) {
    const cartsToDelete = cartIds.slice(1);
    await supabase.from("cart").delete().in("id", cartsToDelete);
  }

  return true;
}
