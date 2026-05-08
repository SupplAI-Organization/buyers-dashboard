"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Plus, Minus, Gem, TreePine, Layers, Fuel, Leaf } from "lucide-react";
import { Product, ProductCategory } from "@/lib/product";

export interface CartItemType extends Product {
  quantity: number;
}

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const [imageError, setImageError] = useState(false);

  // Category icons mapping (reused from ProductCard)
  const CategoryIcons: Record<ProductCategory, typeof Gem> = {
    Minerals: Gem,
    Wood: TreePine,
    Aggregates: Layers,
    "Fossil Fuels": Fuel,
    "Natural Fibers": Leaf,
  };

  const CategoryIcon = CategoryIcons[item.category as ProductCategory] || Gem;

  // Generate a gradient based on category
  const categoryGradients: Record<string, string> = {
    Minerals: "from-slate-600 to-slate-800",
    Wood: "from-amber-600 to-amber-800",
    Aggregates: "from-stone-500 to-stone-700",
    "Fossil Fuels": "from-gray-700 to-gray-900",
    "Natural Fibers": "from-green-600 to-green-800",
  };

  const gradient = categoryGradients[item.category] || "from-gray-600 to-gray-800";

  const getImageUrl = (): string | null => {
    if (!item.image_urls) return null;
    if (Array.isArray(item.image_urls)) {
      return item.image_urls[0] || null;
    }
    try {
      const parsed = JSON.parse(item.image_urls);
      if (Array.isArray(parsed)) return parsed[0] || null;
      return item.image_urls;
    } catch {
      return item.image_urls;
    }
  };

  const imageUrl = getImageUrl();
  const price = parseFloat(item.price_per_unit || "0");
  const total = price * item.quantity;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
      {/* Product Image */}
      <div className={`relative w-full sm:w-28 h-28 rounded-xl overflow-hidden shrink-0 ${imageUrl && !imageError ? "bg-gray-50" : `bg-gradient-to-br ${gradient}`}`}>
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-contain p-2"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <CategoryIcon className="w-10 h-10 text-white/80" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 w-full text-center sm:text-left">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
          <div>
            <span className="inline-block px-2.5 py-1 mb-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
              {item.category}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {item.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Unit Price: ₹{price.toLocaleString()} / {item.unit_type}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-lg font-bold text-[#EA7B7B]">
              ₹{total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center sm:justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-gray-50 rounded-xl border border-gray-200">
              <button 
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
                disabled={item.quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium text-gray-900">
                {item.quantity}
              </span>
              <button 
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => onRemove(item.id)}
              className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-2"
              title="Remove item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mobile Price */}
          <div className="sm:hidden ml-auto">
            <p className="text-lg font-bold text-[#EA7B7B]">
              ₹{total.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
