"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/product";
import ProductDetailsCard from "../components/ProductDetailsCard";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("Error fetching product:", error);
        setError("Product not found");
      } else {
        setProduct(data);
      }
      setLoading(false);
    };

    fetchProduct();

    // Real-time subscription for this specific product
    const channel = supabase
      .channel(`product-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setProduct(payload.new as Product);
          } else if (payload.eventType === "DELETE") {
            setError("This product has been removed");
            setProduct(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
          <p className="text-gray-500 mt-4">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <p className="text-red-500 text-lg">{error || "Product not found"}</p>
          <button
            onClick={() => router.push("/dashboard/homepage")}
            className="mt-4 px-4 py-2 bg-[#EA7B7B] text-white rounded-lg hover:bg-[#d96a6a] transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Products</span>
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ProductDetailsCard product={product} />
      </div>
    </div>
  );
}
