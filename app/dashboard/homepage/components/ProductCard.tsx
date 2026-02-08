import { Product, CATEGORY_ICONS, ProductCategory } from "@/lib/product";
import { formatPrice, parseAttributes } from "@/lib/productService";
import { Heart, ShoppingCart, Eye, CheckCircle, Clock } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onViewDetails?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({
  product,
  onViewDetails,
  onAddToCart,
}: ProductCardProps) {
  const attributes = parseAttributes(product.dynamic_attributes);
  const categoryIcon =
    CATEGORY_ICONS[product.category as ProductCategory] || "📦";

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

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100">
      {/* Image Section */}
      <div
        className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center`}
      >
        <span className="text-6xl opacity-80">{categoryIcon}</span>

        {/* Wishlist Button */}
        <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-sm hover:bg-white hover:scale-110 transition-all">
          <Heart className="w-4 h-4 text-gray-600 hover:text-red-500" />
        </button>

        {/* Category Badge */}
        <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 rounded-full text-xs font-medium text-gray-700">
          {product.category}
        </span>

        {/* Approval Status */}
        {product.is_approved ? (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        ) : (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-1">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {product.description}
        </p>

        {/* Attributes Preview */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {Object.entries(attributes)
            .slice(0, 3)
            .map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-0.5 bg-gray-100 rounded-md text-xs text-gray-600"
              >
                {String(value)}
              </span>
            ))}
        </div>

        {/* Price Section */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">Starting from</p>
              <p className="text-xl font-bold text-[#EA7B7B]">
                {formatPrice(product.price_per_unit, product.unit_type)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Min Order</p>
              <p className="text-sm font-medium text-gray-700">
                {product.min_order_quantity} {product.unit_type}
              </p>
            </div>
          </div>

          {/* Stock Info */}
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            {product.available_quantity} {product.unit_type} available
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onViewDetails?.(product)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <button
            onClick={() => onAddToCart?.(product)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a] transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
