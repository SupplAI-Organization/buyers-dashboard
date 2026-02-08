"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import CategoryBar from "./components/CategoryBar";
import HeroSection from "./components/HeroSection";
import ProductGrid from "./components/ProductGrid";

export default function DashboardHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
    };
    checkUser();
  }, [router]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery("");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Topbar - Full Width */}
      <Topbar user={user} onSearch={handleSearch} cartItemsCount={2} />

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
          />
        </main>
      </div>
    </div>
  );
}
