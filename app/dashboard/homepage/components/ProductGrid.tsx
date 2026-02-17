"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "./ProductCard";
import { Product } from "@/lib/product";
import {
  fetchProducts,
  fetchProductsByCategory,
  searchProducts,
} from "@/lib/productService";
import { supabase } from "@/lib/supabaseClient";
import { addToCart } from "@/lib/cartService";
import { Loader2, Package } from "lucide-react";

interface ProductGridProps {
  selectedCategory: string | null;
  searchQuery: string;
  user: any;
}

export default function ProductGrid({
  selectedCategory,
  searchQuery,
  user,
}: ProductGridProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("Latest");

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        let data: Product[];

        if (searchQuery) {
          data = await searchProducts(searchQuery);
        } else if (selectedCategory) {
          data = await fetchProductsByCategory(selectedCategory);
        } else {
          data = await fetchProducts();
        }

        setProducts(data);
      } catch (err) {
        setError("Failed to load products. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();

    // Real-time subscription for products
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newProduct = payload.new as Product;
            if (newProduct.is_listed) {
              // Check if it matches current filter
              if (
                !selectedCategory ||
                newProduct.category === selectedCategory
              ) {
                setProducts((prev) => [newProduct, ...prev]);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedProduct = payload.new as Product;
            setProducts((prev) =>
              prev
                .map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
                .filter((p) => p.is_listed),
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setProducts((prev) => prev.filter((p) => p.id !== deletedId));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, searchQuery]);

  const handleViewDetails = (product: Product) => {
    router.push(`/dashboard/productdetails/${product.id}`);
  };

  const handleAddToCart = async (product: Product) => {
    if (!user) return;
    await addToCart(user.id, product.id);
  };

  const sortProducts = (products: Product[], option: string) => {
    switch (option) {
      case "Price: Low to High":
        return [...products].sort((a, b) => a.price_per_unit - b.price_per_unit);
      case "Price: High to Low":
        return [...products].sort((a, b) => b.price_per_unit - a.price_per_unit);
      case "Name: A to Z":
        return [...products].sort((a, b) => a.name.localeCompare(b.name));
      case "Latest":
      default:
        return [...products].sort((a, b) => b.id - a.id); // Assuming higher id is newer
    }
  };

  useEffect(() => {
    setProducts((prev) => sortProducts(prev, sortOption));
  }, [sortOption]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
        <p className="text-gray-500 mt-4">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[#EA7B7B] text-white rounded-lg hover:bg-[#d96a6a]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500 mt-4 text-lg">No products found</p>
        <p className="text-gray-400 text-sm mt-1">
          {searchQuery
            ? `No results for "${searchQuery}"`
            : selectedCategory
              ? `No products in ${selectedCategory} category`
              : "Check back later for new products"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : selectedCategory
                ? selectedCategory
                : "All Products"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""}{" "}
            available
          </p>
        </div>

        {/* Sort Dropdown */}
        <select
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="Latest">Sort by: Latest</option>
          <option value="Price: Low to High">Price: Low to High</option>
          <option value="Price: High to Low">Price: High to Low</option>
          <option value="Name: A to Z">Name: A to Z</option>
        </select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onViewDetails={handleViewDetails}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
