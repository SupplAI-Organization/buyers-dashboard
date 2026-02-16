"use client";

import { ArrowRight, ShieldCheck, Truck } from "lucide-react";

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
  checkoutDisabled?: boolean;
}

export default function CartSummary({ subtotal, tax, total, checkoutDisabled = false }: CartSummaryProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax (Estimate)</span>
          <span>₹{tax.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span className="text-green-600 font-medium">Calculated at checkout</span>
        </div>
        
        <div className="h-px bg-gray-100 my-4" />
        
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-[#EA7B7B]">₹{total.toLocaleString()}</span>
        </div>
      </div>

      <button 
        className="w-full flex items-center justify-center gap-2 bg-[#EA7B7B] text-white py-4 rounded-xl font-semibold hover:bg-[#d96a6a] transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        disabled={checkoutDisabled}
      >
        Proceed to Checkout
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Trust Badges */}
      <div className="mt-8 space-y-3">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <ShieldCheck className="w-5 h-5 text-gray-400" />
          <span>Secure checkout guaranteed</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Truck className="w-5 h-5 text-gray-400" />
          <span>Trusted logistics partners</span>
        </div>
      </div>
    </div>
  );
}
