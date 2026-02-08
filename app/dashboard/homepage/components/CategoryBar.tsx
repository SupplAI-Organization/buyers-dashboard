"use client";

import {
  PRODUCT_CATEGORIES,
  CATEGORY_ICONS,
  ProductCategory,
} from "@/lib/product";
import { LayoutGrid } from "lucide-react";

interface CategoryBarProps {
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}

export default function CategoryBar({
  selectedCategory,
  onCategorySelect,
}: CategoryBarProps) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-[68px] z-20">
      <div className="flex items-center gap-2 px-6 py-3 overflow-x-auto scrollbar-hide">
        {/* All Products */}
        <button
          onClick={() => onCategorySelect(null)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all ${
            selectedCategory === null
              ? "bg-[#EA7B7B] text-white shadow-md shadow-[#EA7B7B]/20"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-medium">All Products</span>
        </button>

        {/* Categories */}
        {PRODUCT_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onCategorySelect(category)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all ${
              selectedCategory === category
                ? "bg-[#EA7B7B] text-white shadow-md shadow-[#EA7B7B]/20"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="text-base">
              {CATEGORY_ICONS[category as ProductCategory]}
            </span>
            <span className="text-sm font-medium">{category}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
