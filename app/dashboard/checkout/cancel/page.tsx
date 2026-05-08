"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function CheckoutCancelPage() {
    const router = useRouter();

    return (
        <div className="ml-20 pt-4 flex items-center justify-center min-h-[80vh]">
            <div className="flex flex-col items-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100 max-w-md mx-auto text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                    <XCircle className="w-10 h-10 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h2>
                <p className="text-gray-500 mb-6">
                    No charge was made and no order was created. You can try again whenever you&apos;re ready.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push("/dashboard/checkout")}
                        className="px-5 py-2.5 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a]"
                    >
                        Back to Checkout
                    </button>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                    >
                        Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
