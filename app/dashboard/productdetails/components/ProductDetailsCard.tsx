"use client";

import { useState } from "react";
import Image from "next/image";
import { Product, ProductCategory } from "@/lib/product";
import { formatPrice, parseAttributes } from "@/lib/productService";
import {
  Gem,
  TreePine,
  Layers,
  Fuel,
  Leaf,
  MapPin,
  Package,
  Truck,
  Clock,
  Award,
  FileCheck,
  ShoppingCart,
  Heart,
  Share2,
  Box,
  Warehouse,
} from "lucide-react";

interface ProductDetailsCardProps {
  product: Product;
}

export default function ProductDetailsCard({
  product,
}: ProductDetailsCardProps) {
  const attributes = parseAttributes(product.dynamic_attributes);

  // Category icons mapping
  const CategoryIcons: Record<ProductCategory, typeof Gem> = {
    Minerals: Gem,
    Wood: TreePine,
    Aggregates: Layers,
    "Fossil Fuels": Fuel,
    "Natural Fibers": Leaf,
  };

  const CategoryIcon =
    CategoryIcons[product.category as ProductCategory] || Gem;

  // Generate a gradient based on category
  const categoryGradients: Record<string, string> = {
    Minerals: "from-slate-600 to-slate-800",
    Wood: "from-amber-600 to-amber-800",
    Aggregates: "from-stone-500 to-stone-700",
    "Fossil Fuels": "from-gray-700 to-gray-900",
    "Natural Fibers": "from-green-600 to-green-800",
  };

  const gradient =
    categoryGradients[product.category] || "from-gray-600 to-gray-800";

  // Get the first image URL
  const getImageUrl = (): string | null => {
    if (!product.image_urls) return null;
    if (Array.isArray(product.image_urls)) {
      return product.image_urls[0] || null;
    }
    // Handle if it's a JSON string
    try {
      const parsed = JSON.parse(product.image_urls);
      if (Array.isArray(parsed)) return parsed[0] || null;
      return product.image_urls;
    } catch {
      return product.image_urls;
    }
  };

  const imageUrl = getImageUrl();
  const [imageError, setImageError] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Image/Icon Section */}
      <div className="space-y-6">
        <div
          className={`relative h-80 lg:h-96 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden ${imageUrl && !imageError ? "bg-gray-50 border border-gray-200" : `bg-gradient-to-br ${gradient}`}`}
        >
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-6"
              onError={() => setImageError(true)}
            />
          ) : (
            <CategoryIcon className="w-32 h-32 text-white/80" strokeWidth={1} />
          )}
          <span className="absolute top-4 left-4 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-700">
            {product.category}
          </span>
        </div>

        {/* Dynamic Attributes */}
        {Object.keys(attributes).length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Specifications
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Details */}
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {product.name}
          </h1>
          <p className="text-gray-600 mt-3 leading-relaxed">
            {product.description}
          </p>

          {/* Price Section */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-gray-500">Price per unit</p>
                <p className="text-3xl font-bold text-[#EA7B7B]">
                  {formatPrice(product.price_per_unit, product.unit_type)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Minimum Order</p>
                <p className="text-xl font-semibold text-gray-900">
                  {product.min_order_quantity} {product.unit_type}
                </p>
              </div>
            </div>

            {/* Availability */}
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-600 font-medium">
                {product.available_quantity} {product.unit_type} available
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a] transition-colors">
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
            <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <Heart className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Origin & Source */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#EA7B7B]" />
            Origin & Source
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {product.origin_country && (
              <div>
                <p className="text-sm text-gray-500">Country</p>
                <p className="font-medium text-gray-900">
                  {product.origin_country}
                </p>
              </div>
            )}
            {product.origin_state && (
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p className="font-medium text-gray-900">
                  {product.origin_state}
                </p>
              </div>
            )}
            {product.origin_district && (
              <div>
                <p className="text-sm text-gray-500">District</p>
                <p className="font-medium text-gray-900">
                  {product.origin_district}
                </p>
              </div>
            )}
            {product.source_name && (
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="font-medium text-gray-900">
                  {product.source_name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quality & Certification */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#EA7B7B]" />
            Quality & Certification
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {product.quality_grade && (
              <div>
                <p className="text-sm text-gray-500">Quality Grade</p>
                <p className="font-medium text-gray-900">
                  {product.quality_grade}
                </p>
              </div>
            )}
            {product.certification && (
              <div>
                <p className="text-sm text-gray-500">Certification</p>
                <p className="font-medium text-gray-900">
                  {product.certification}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Test Report</p>
              <p className="font-medium text-gray-900">
                {product.test_report_available ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <FileCheck className="w-4 h-4" />
                    Available
                  </span>
                ) : (
                  "Not Available"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Logistics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#EA7B7B]" />
            Logistics & Delivery
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {product.packing_type && (
              <div className="flex items-start gap-3">
                <Box className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Packing Type</p>
                  <p className="font-medium text-gray-900">
                    {product.packing_type}
                  </p>
                </div>
              </div>
            )}
            {product.storage_type && (
              <div className="flex items-start gap-3">
                <Warehouse className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Storage Type</p>
                  <p className="font-medium text-gray-900">
                    {product.storage_type}
                  </p>
                </div>
              </div>
            )}
            {product.transport_mode && (
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Transport Mode</p>
                  <p className="font-medium text-gray-900">
                    {product.transport_mode}
                  </p>
                </div>
              </div>
            )}
            {product.lead_time_days && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Lead Time</p>
                  <p className="font-medium text-gray-900">
                    {product.lead_time_days} days
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
