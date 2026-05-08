"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CartItem, { CartItemType } from "./components/CartItem";
import CartSummary from "./components/CartSummary";
import EmptyCart from "./components/EmptyCart";
import { supabase } from "@/lib/supabaseClient";
import {
  getCartWithItems,
  updateCartItemQuantity,
  removeCartItem,
} from "@/lib/cartService";

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
        loadCart(data.user.id);
      }
    };
    checkUser();
  }, [router]);

  const loadCart = async (userId: string) => {
    try {
      const cart = await getCartWithItems(userId);
      if (cart && cart.items) {
        const mappedItems = cart.items.map((item: any) => ({
          ...item.product,
          id: item.id, // Using CartItem ID reference
          product_id: item.product_id, // Keep the original product ID for checkout
          supplier_id: item.product?.supplier_id, // Keep the supplier ID for checkout
          quantity: item.quantity,
        }));
        setCartItems(mappedItems);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error("Failed to load cart", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    // Optimistic update
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item,
      ),
    );

    const success = await updateCartItemQuantity(id, newQuantity);
    if (!success && user) {
      loadCart(user.id); // Revert on failure
    }
  };

  const handleRemoveItem = async (id: string) => {
    // Optimistic update
    setCartItems((prev) => prev.filter((item) => item.id !== id));

    const success = await removeCartItem(id);
    if (!success && user) {
      loadCart(user.id); // Revert on failure
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.price_per_unit || "0") * item.quantity;
  }, 0);

  const tax = subtotal * 0.18; // Assuming 18% GST for mock
  const total = subtotal + tax;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-500 text-sm mt-1">
              {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"} in
              your cart
            </p>
          </div>
        </div>

        {cartItems.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart Items List */}
            <div className="flex-1 space-y-4">
              {cartItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-96 shrink-0">
              <CartSummary subtotal={subtotal} tax={tax} total={total} />
            </div>
          </div>
        ) : (
          <EmptyCart />
        )}
      </div>
    </div>
  );
}
