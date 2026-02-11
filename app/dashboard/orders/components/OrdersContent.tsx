"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/order";
import {
    Loader2,
    ShoppingBag,
    Search,
    ChevronDown,
    ArrowLeft,
    Package,
    Clock,
    MapPin,
    CreditCard,
    FileText,
    CalendarDays,
    Truck,
    CheckCircle2,
    XCircle,
    Timer,
    IndianRupee,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
    pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Timer },
    confirmed: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: CheckCircle2 },
    processing: { label: "Processing", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Package },
    shipped: { label: "Shipped", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: Truck },
    delivered: { label: "Delivered", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "text-amber-600" },
    paid: { label: "Paid", color: "text-green-600" },
    failed: { label: "Failed", color: "text-red-600" },
};

interface OrdersContentProps {
    orders: Order[];
    loading: boolean;
}

export default function OrdersContent({ orders, loading }: OrdersContentProps) {
    const router = useRouter();
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredOrders = orders.filter((order) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            order.id.toLowerCase().includes(searchLower) ||
            (order.shipping_address || "").toLowerCase().includes(searchLower) ||
            (order.special_requirments || "").toLowerCase().includes(searchLower)
        );
    });

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#EA7B7B]/10 rounded-xl flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-[#EA7B7B]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                                <p className="text-sm text-gray-500">
                                    Track and manage your orders
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search orders..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20 focus:border-[#EA7B7B] transition-all"
                                />
                            </div>
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                                <Package className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                                    {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
                        <p className="text-gray-500 mt-4">Loading your orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            {searchQuery ? <Search className="w-10 h-10 text-gray-300" /> : <ShoppingBag className="w-10 h-10 text-gray-300" />}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {searchQuery ? "No matching orders" : "No orders yet"}
                        </h3>
                        <p className="text-gray-500 mb-6 text-center max-w-sm">
                            {searchQuery ? "Try searching with a different keyword." : "Browse our products and place your first order."}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => router.push("/dashboard/homepage")}
                                className="px-6 py-2.5 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a] transition-colors"
                            >
                                Browse Products
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => {
                            const status = statusConfig[order.status || "pending"] || statusConfig.pending;
                            const StatusIcon = status.icon;
                            const paymentSt = paymentStatusConfig[order.payment_status || "pending"] || paymentStatusConfig.pending;
                            const isExpanded = expandedOrder === order.id;

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${isExpanded ? "border-[#EA7B7B] ring-1 ring-[#EA7B7B]/10 shadow-md" : "border-gray-100 hover:shadow-md hover:border-gray-200"
                                        }`}
                                >
                                    {/* Order Header - clickable */}
                                    <button
                                        onClick={() =>
                                            setExpandedOrder(isExpanded ? null : order.id)
                                        }
                                        className="w-full px-6 py-5 flex items-center justify-between text-left group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? "bg-[#EA7B7B]/10" : "bg-gray-50 group-hover:bg-gray-100"
                                                }`}>
                                                <Package className={`w-6 h-6 ${isExpanded ? "text-[#EA7B7B]" : "text-gray-400"}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900 text-sm">
                                                        Order #{order.id.slice(0, 8).toUpperCase()}
                                                    </p>
                                                    {order.payment_method === "cash_on_delivery" && (
                                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase">
                                                            COD
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {formatDate(order.order_date)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="hidden sm:flex flex-col items-end mr-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${paymentSt.color}`}>
                                                    {paymentSt.label}
                                                </span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Payment</span>
                                            </div>
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${status.bg} ${status.color}`}
                                            >
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {status.label}
                                            </span>
                                            <ChevronDown
                                                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180 text-[#EA7B7B]" : "group-hover:text-gray-600"
                                                    }`}
                                            />
                                        </div>
                                    </button>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-6 pb-6 border-t border-gray-100 pt-6 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {/* Shipping Address */}
                                                <div className="flex items-start gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-[#EA7B7B]/5 flex items-center justify-center flex-shrink-0">
                                                        <MapPin className="w-4 h-4 text-[#EA7B7B]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                            Shipping & Delivery
                                                        </p>
                                                        <p className="text-sm text-gray-700 mt-1.5 font-medium leading-relaxed">
                                                            {order.shipping_address || "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Payment Method */}
                                                <div className="flex items-start gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-[#EA7B7B]/5 flex items-center justify-center flex-shrink-0">
                                                        <CreditCard className="w-4 h-4 text-[#EA7B7B]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                            Payment Details
                                                        </p>
                                                        <p className="text-sm text-gray-700 mt-1.5 font-semibold">
                                                            {order.payment_method === "cash_on_delivery"
                                                                ? "Cash on Delivery"
                                                                : order.payment_method === "online_payment"
                                                                    ? "Online Payment"
                                                                    : order.payment_method || "—"}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${order.payment_status === 'paid' ? 'bg-green-500' : 'bg-amber-500'
                                                                }`} />
                                                            <p className={`text-xs font-bold ${paymentSt.color} uppercase tracking-tight`}>
                                                                {paymentSt.label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Special Requirements */}
                                                <div className="flex items-start gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-[#EA7B7B]/5 flex items-center justify-center flex-shrink-0">
                                                        <FileText className="w-4 h-4 text-[#EA7B7B]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                            Special Requirements
                                                        </p>
                                                        <p className={`text-sm mt-1.5 font-medium ${order.special_requirments ? "text-gray-700" : "text-gray-400 italic"}`}>
                                                            {order.special_requirments || "No special instructions provided"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Shipping Cost */}
                                                {order.shipping_cost !== null && (
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                                            <IndianRupee className="w-4 h-4 text-gray-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                Shipping Cost
                                                            </p>
                                                            <p className="text-sm text-gray-700 mt-1">
                                                                ₹{Number(order.shipping_cost).toLocaleString("en-IN")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Expected Delivery */}
                                                {order.expected_delivery && (
                                                    <div className="flex items-start gap-3">
                                                        <Clock className="w-4 h-4 text-[#EA7B7B] mt-1 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                                                                Expected Delivery
                                                            </p>
                                                            <p className="text-sm text-gray-700 mt-1">
                                                                {formatDate(order.expected_delivery)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Actual Delivery - only shown when delivered */}
                                                {order.actual_delivery && (
                                                    <div className="flex items-start gap-3">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                                                                Delivered On
                                                            </p>
                                                            <p className="text-sm text-green-700 mt-1 font-medium">
                                                                {formatDate(order.actual_delivery)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
