"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
        <ShoppingCart className="w-10 h-10 text-gray-300" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Your cart is empty
      </h2>
      <p className="text-gray-500 max-w-md mb-8">
        Looks like you haven't added any construction materials or raw resources
        to your cart yet.
      </p>
      <Link
        href="/dashboard/homepage"
        className="px-8 py-3 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a] transition-colors shadow-sm hover:shadow-md"
      >
        Start Shopping
      </Link>
    </div>
  );
}
