"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import Sidebar from "../homepage/components/Sidebar";
import Topbar from "../homepage/components/Topbar";
import HeroSection from "../homepage/components/HeroSection";
import CompanyGrid from "./components/CompanyGrid";
import { getOrCreateCart } from "@/lib/cartService";
import { ensureBuyerProfile } from "@/lib/buyerService";

export default function DashboardHomePage2() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const cartChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
        await ensureBuyerProfile(data.user.id, data.user.email!);
        initCart(data.user.id);
      }
      setLoading(false);
    };
    checkUser();

    return () => {
      if (cartChannelRef.current) {
        supabase.removeChannel(cartChannelRef.current);
        cartChannelRef.current = null;
      }
    };
  }, [router]);

  const initCart = async (userId: string) => {
    const cart = await getOrCreateCart(userId);
    if (cart) {
      updateCartCount(cart.id);

      cartChannelRef.current = supabase
        .channel("cart-count-channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cart_items",
            filter: `cart_id=eq.${cart.id}`,
          },
          () => {
            updateCartCount(cart.id);
          },
        )
        .subscribe();
    }
  };

  const updateCartCount = async (cartId: string) => {
    const { count, error } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("cart_id", cartId);
    setCartCount(count || 0);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#EA7B7B] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <Topbar user={user} cartItemsCount={cartCount} />

      <Sidebar />

      <div className="ml-20 transition-all duration-300">
        <main className="p-6 pt-10">
          <HeroSection />

          <CompanyGrid />
        </main>
      </div>
    </div>
  );
}
