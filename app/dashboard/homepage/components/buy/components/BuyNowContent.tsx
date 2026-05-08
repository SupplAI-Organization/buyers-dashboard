import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/product";
import { formatPrice } from "@/lib/productService";
import { createOrderItem, createOrderWithItems } from "@/lib/orderService";
import { getWallet, debitWallet } from "@/lib/walletService";
import {
    ArrowLeft,
    Loader2,
    Package,
    MapPin,
    CreditCard,
    FileText,
    CheckCircle2,
    ShoppingBag,
    Minus,
    Plus,
    AlertCircle,
    Wallet,
} from "lucide-react";

interface BuyNowContentProps {
    product?: Product;
    items?: any[];
    user: any;
}

export default function BuyNowContent({ product, items, user }: BuyNowContentProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [quantity, setQuantity] = useState(product ? (parseInt(product.min_order_quantity) || 1) : 0);
    const [shippingAddress, setShippingAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
    const [specialRequirements, setSpecialRequirements] = useState("");
    const [walletBalance, setWalletBalance] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { wallet } = await getWallet();
            if (!cancelled) setWalletBalance(wallet?.balance ?? 0);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const isCartCheckout = !!items && items.length > 0;

    const subtotal = useMemo(() => {
        if (isCartCheckout) {
            return items.reduce((sum, item) => sum + (parseFloat(item.price_per_unit || item.product?.price_per_unit || "0") * item.quantity), 0);
        }
        if (product) {
            return parseFloat(product.price_per_unit) * quantity;
        }
        return 0;
    }, [isCartCheckout, items, product, quantity]);

    const tax = subtotal * 0.18;
    const totalPrice = subtotal + tax;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!product && !isCartCheckout) || !user) return;

        if (!shippingAddress.trim()) {
            setError("Please enter a shipping address");
            return;
        }

        setSubmitting(true);
        setError(null);

        const now = new Date().toISOString();

        if (paymentMethod === "wallet") {
            if (walletBalance === null || walletBalance < totalPrice) {
                setError(
                    `Insufficient wallet balance. Available ₹${(walletBalance ?? 0).toLocaleString("en-IN")} • Required ₹${totalPrice.toLocaleString("en-IN")}`
                );
                setSubmitting(false);
                return;
            }
        }

        if (paymentMethod === "online_payment") {
            try {
                const lineItems = isCartCheckout
                    ? items!.map((item) => ({
                        name: item.name || item.product?.name || "Item",
                        unit_amount: Math.round(
                            parseFloat(item.price_per_unit || item.product?.price_per_unit || "0") * 118
                        ),
                        quantity: item.quantity,
                    }))
                    : product
                        ? [{
                            name: product.name,
                            unit_amount: Math.round(parseFloat(product.price_per_unit) * 118),
                            quantity,
                        }]
                        : [];

                const res = await fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: lineItems }),
                });
                const data = await res.json();
                if (!res.ok || !data.url) {
                    throw new Error(data.error || "Failed to start payment");
                }

                const pendingPayload = isCartCheckout
                    ? {
                        type: "cart" as const,
                        shippingAddress,
                        specialRequirements,
                        items: items!.map((item) => ({
                            product_id: item.product_id || item.id,
                            supplier_id: item.supplier_id || item.product?.supplier_id,
                            quantity: item.quantity,
                            unit_price: parseFloat(item.price_per_unit || item.product?.price_per_unit || "0"),
                            total_price: parseFloat(item.price_per_unit || item.product?.price_per_unit || "0") * item.quantity,
                            product_snapshot: {
                                name: item.name || item.product?.name,
                                category: item.category || item.product?.category,
                                description: item.description || item.product?.description,
                                image_urls: item.image_urls || item.product?.image_urls,
                                origin_country: item.origin_country || item.product?.origin_country,
                                unit_type: item.unit_type || item.product?.unit_type,
                            },
                        })),
                    }
                    : product
                        ? {
                            type: "product" as const,
                            shippingAddress,
                            specialRequirements,
                            quantity,
                            product: {
                                id: product.id,
                                supplier_id: product.supplier_id,
                                price_per_unit: product.price_per_unit,
                                name: product.name,
                                category: product.category,
                                description: product.description,
                                image_urls: product.image_urls,
                                origin_country: product.origin_country,
                                unit_type: product.unit_type,
                            },
                        }
                        : null;

                if (pendingPayload) {
                    sessionStorage.setItem(`pending_order_${data.id}`, JSON.stringify(pendingPayload));
                }

                window.location.href = data.url;
                return;
            } catch (err: any) {
                setError(err?.message || "Could not start online payment");
                setSubmitting(false);
                return;
            }
        }

        if (isCartCheckout) {
            const orderItems = items.map(item => ({
                product_id: item.product_id || item.id,
                supplier_id: item.supplier_id || item.product?.supplier_id,
                quantity: item.quantity,
                unit_price: parseFloat(item.price_per_unit || item.product?.price_per_unit || "0"),
                total_price: parseFloat(item.price_per_unit || item.product?.price_per_unit || "0") * item.quantity,
                product_snapshot: {
                    name: item.name || item.product?.name,
                    category: item.category || item.product?.category,
                    description: item.description || item.product?.description,
                    image_urls: item.image_urls || item.product?.image_urls,
                    origin_country: item.origin_country || item.product?.origin_country,
                    unit_type: item.unit_type || item.product?.unit_type,
                },
                special_requirments: specialRequirements,
                shipping_address: shippingAddress,
                payment_method: paymentMethod,
                date_time: now,
            }));

            const { error: submitError } = await createOrderWithItems({
                shipping_address: shippingAddress,
                payment_method: paymentMethod,
                date_time: now,
                special_requirments: specialRequirements,
            }, orderItems);

            if (submitError) {
                setError(submitError);
                setSubmitting(false);
                return;
            }
        } else if (product) {
            const unitPrice = parseFloat(product.price_per_unit);
            const { error: submitError } = await createOrderItem({
                product_id: product.id,
                quantity,
                unit_price: unitPrice,
                total_price: unitPrice * quantity,
                product_snapshot: {
                    name: product.name,
                    category: product.category,
                    description: product.description,
                    image_urls: product.image_urls,
                    origin_country: product.origin_country,
                    unit_type: product.unit_type,
                },
                special_requirments: specialRequirements,
                shipping_address: shippingAddress,
                payment_method: paymentMethod,
                date_time: now,
            }, product.supplier_id);

            if (submitError) {
                setError(submitError);
                setSubmitting(false);
                return;
            }
        }

        if (paymentMethod === "wallet") {
            const desc = isCartCheckout
                ? `Order payment (${items!.length} item${items!.length > 1 ? "s" : ""})`
                : `Order payment: ${product?.name ?? "item"}`;
            const { error: debitError } = await debitWallet(totalPrice, desc);
            if (debitError) {
                setError(`Order placed but wallet debit failed: ${debitError}. Please contact support.`);
                setSubmitting(false);
                return;
            }
        }

        setSuccess(true);
        setSubmitting(false);

        setTimeout(() => {
            router.push("/dashboard/orders");
        }, 2000);
    };

    // Success screen
    if (success) {
        return (
            <div className="ml-20 pt-4 flex items-center justify-center min-h-[80vh]">
                <div className="flex flex-col items-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100 max-w-md mx-auto text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Order Confirmed!
                    </h2>
                    <p className="text-gray-500 mb-6">
                        Your order has been placed successfully.
                    </p>
                    <p className="text-sm text-gray-400">
                        Redirecting to your orders...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <ShoppingBag className="w-7 h-7 text-[#EA7B7B]" />
                    {isCartCheckout ? "Checkout" : "Place Your Order"}
                </h1>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left - Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Product(s) Summary */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-[#EA7B7B]" />
                                    {isCartCheckout ? "Items in your order" : "Product"}
                                </h3>

                                <div className="space-y-4">
                                    {isCartCheckout ? (
                                        items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                                <div className="w-12 h-12 bg-gradient-to-br from-[#EA7B7B] to-[#d96a6a] rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">
                                                    {(item.name || item.product?.name)?.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">
                                                        {item.name || item.product?.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Qty: {item.quantity} {item.unit_type || item.product?.unit_type}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-[#EA7B7B]">
                                                        ₹{(parseFloat(item.price_per_unit || item.product?.price_per_unit || "0") * item.quantity).toLocaleString("en-IN")}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : product && (
                                        <>
                                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                                <div className="w-16 h-16 bg-gradient-to-br from-[#EA7B7B] to-[#d96a6a] rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0">
                                                    {product.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{product.category}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-[#EA7B7B]">
                                                        {formatPrice(product.price_per_unit, product.unit_type)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quantity for single product */}
                                            <div className="mt-5">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Quantity ({product.unit_type})
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setQuantity(Math.max(parseInt(product.min_order_quantity) || 1, quantity - 1))
                                                        }
                                                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setQuantity(Math.max(parseInt(product.min_order_quantity) || 1, val));
                                                        }}
                                                        min={parseInt(product.min_order_quantity) || 1}
                                                        max={parseInt(product.available_quantity)}
                                                        className="w-24 h-10 text-center border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20 focus:border-[#EA7B7B]"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setQuantity(Math.min(parseInt(product.available_quantity), quantity + 1))
                                                        }
                                                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                    <span className="text-sm text-gray-400 ml-2">
                                                        Min: {product.min_order_quantity} • Available:{" "}
                                                        {product.available_quantity} {product.unit_type}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Shipping Address */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-[#EA7B7B]" />
                                    Shipping Address
                                </h3>
                                <textarea
                                    value={shippingAddress}
                                    onChange={(e) => setShippingAddress(e.target.value)}
                                    placeholder="Enter your full shipping address including street, city, state, and PIN code..."
                                    rows={3}
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20 focus:border-[#EA7B7B] transition-all resize-none"
                                />
                            </div>

                            {/* Payment Method */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-[#EA7B7B]" />
                                    Payment Method
                                </h3>
                                <div className="space-y-3">
                                    <label
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "cash_on_delivery"
                                            ? "border-[#EA7B7B] bg-[#EA7B7B]/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="cash_on_delivery"
                                            checked={paymentMethod === "cash_on_delivery"}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4 text-[#EA7B7B] focus:ring-[#EA7B7B]"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                Cash on Delivery
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Pay when your order is delivered
                                            </p>
                                        </div>
                                    </label>
                                    <label
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "online_payment"
                                            ? "border-[#EA7B7B] bg-[#EA7B7B]/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="online_payment"
                                            checked={paymentMethod === "online_payment"}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4 text-[#EA7B7B] focus:ring-[#EA7B7B]"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                Online Payment
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Pay securely with card via Stripe{" "}
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                                                    Test Mode
                                                </span>
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === "wallet"
                                            ? "border-[#EA7B7B] bg-[#EA7B7B]/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            } ${walletBalance !== null && walletBalance < totalPrice ? "opacity-60" : "cursor-pointer"}`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="wallet"
                                            checked={paymentMethod === "wallet"}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            disabled={walletBalance !== null && walletBalance < totalPrice}
                                            className="w-4 h-4 text-[#EA7B7B] focus:ring-[#EA7B7B]"
                                        />
                                        <Wallet className="w-5 h-5 text-[#EA7B7B]" />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                Pay from Wallet
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Balance:{" "}
                                                <span className="font-semibold text-gray-900">
                                                    ₹{(walletBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </span>
                                                {walletBalance !== null && walletBalance < totalPrice && (
                                                    <span className="ml-2 text-amber-600">
                                                        — insufficient,{" "}
                                                        <a href="/dashboard/wallet" className="underline">
                                                            top up
                                                        </a>
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Special Requirements */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-[#EA7B7B]" />
                                    Special Requirements
                                    <span className="text-sm font-normal text-gray-400">
                                        (Optional)
                                    </span>
                                </h3>
                                <textarea
                                    value={specialRequirements}
                                    onChange={(e) => setSpecialRequirements(e.target.value)}
                                    placeholder="Any special instructions, custom specifications, or notes for the supplier..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20 focus:border-[#EA7B7B] transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Right - Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                                    Order Summary
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Items</span>
                                        <span className="font-medium text-gray-900 text-right max-w-[60%] truncate">
                                            {isCartCheckout ? `${items.length} Products` : product?.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="font-medium text-gray-900">
                                            ₹{subtotal.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Tax</span>
                                        <span className="font-medium text-gray-900">
                                            ₹{tax.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Payment</span>
                                        <span className="font-medium text-gray-900">
                                            {paymentMethod === "cash_on_delivery"
                                                ? "COD"
                                                : paymentMethod === "wallet"
                                                    ? "Wallet"
                                                    : "Online"}
                                        </span>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4">
                                        <div className="flex justify-between">
                                            <span className="text-base font-semibold text-gray-900">
                                                Total
                                            </span>
                                            <span className="text-xl font-bold text-[#EA7B7B]">
                                                ₹{totalPrice.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                        <p className="text-sm text-red-600 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full mt-6 py-3.5 bg-[#EA7B7B] text-white rounded-xl font-semibold hover:bg-[#d96a6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {paymentMethod === "online_payment"
                                                ? "Redirecting to Stripe..."
                                                : paymentMethod === "wallet"
                                                    ? "Charging Wallet..."
                                                    : "Placing Order..."}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            {paymentMethod === "online_payment"
                                                ? "Pay with Stripe"
                                                : paymentMethod === "wallet"
                                                    ? "Pay from Wallet"
                                                    : "Confirm Order"}
                                        </>
                                    )}
                                </button>

                                {paymentMethod === "online_payment" && (
                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        Use test card 4242 4242 4242 4242 with any future expiry and CVC.
                                    </p>
                                )}
                                {paymentMethod === "wallet" && walletBalance !== null && walletBalance >= totalPrice && (
                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        ₹{totalPrice.toLocaleString("en-IN")} will be debited from your wallet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
