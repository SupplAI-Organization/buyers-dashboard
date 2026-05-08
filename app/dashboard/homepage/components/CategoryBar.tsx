"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChevronDown, Loader2 } from "lucide-react";

interface CategoryBarProps {
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}

export default function CategoryBar({
  selectedCategory,
  onCategorySelect,
}: CategoryBarProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("is_listed", true);

      if (!error && data) {
        // Get unique categories
        const uniqueCategories = [...new Set(data.map((p) => p.category))].sort();
        setCategories(uniqueCategories);
      }
      setLoading(false);
    };

    fetchCategories();

    // Real-time subscription for category updates
    const channel = supabase
      .channel("categories-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          // Refetch categories when products change
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onCategorySelect(value === "" ? null : value);
  };

  // Reset selection if selected category no longer exists
  useEffect(() => {
    if (selectedCategory && !categories.includes(selectedCategory) && !loading) {
      onCategorySelect(null);
    }
  }, [categories, selectedCategory, loading, onCategorySelect]);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[68px] z-20">
      <div className="px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Category:</span>
          <div className="relative">
            <select
              value={selectedCategory ?? ""}
              onChange={handleChange}
              disabled={loading}
              className="appearance-none h-11 pl-4 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20 focus:border-[#EA7B7B] cursor-pointer min-w-[200px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Products</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none" />
            ) : (
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
