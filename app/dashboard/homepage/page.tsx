"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import CategoryBar from "./components/CategoryBar";
import HeroSection from "./components/HeroSection";
import ProductGrid from "./components/ProductGrid";
import { getOrCreateCart } from "@/lib/cartService";
import { ensureBuyerProfile } from "@/lib/buyerService";

function DashboardHomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierId = searchParams.get("supplier_id");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

      // Subscribe to changes in this cart
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
    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("cart_id", cartId);
    setCartCount(count || 0);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery("");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#EA7B7B] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Topbar - Full Width */}
      <Topbar user={user} onSearch={handleSearch} cartItemsCount={cartCount} />

      {/* Sidebar - Below Topbar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-20 transition-all duration-300">
        {/* Category Bar */}
        <CategoryBar
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />

        {/* Page Content */}
        <main className="p-6">
          {/* Hero Section */}
          <HeroSection />

          {/* Products Grid */}
          <ProductGrid
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            supplierId={supplierId}
            user={user}
          />
        </main>
      </div>
    </div>
  );
}

export default function DashboardHomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#EA7B7B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardHomePageContent />
    </Suspense>
  );
}
