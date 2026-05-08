"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { createOrderItem, createOrderWithItems } from "@/lib/orderService";

type PendingPayload =
    | {
        type: "cart";
        shippingAddress: string;
        specialRequirements: string;
        items: Array<{
            product_id: string;
            supplier_id: string;
            quantity: number;
            unit_price: number;
            total_price: number;
            product_snapshot: any;
        }>;
    }
    | {
        type: "product";
        shippingAddress: string;
        specialRequirements: string;
        quantity: number;
        product: {
            id: string;
            supplier_id: string;
            price_per_unit: string;
            name: string;
            category: string;
            description: string;
            image_urls: string[];
            origin_country: string;
            unit_type: string;
        };
    };

export default function CheckoutSuccessPage() {
    const router = useRouter();
    const params = useSearchParams();
    const sessionId = params.get("session_id");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying payment...");

    useEffect(() => {
        if (!sessionId) {
            setStatus("error");
            setMessage("Missing session id");
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const verifyRes = await fetch("/api/stripe/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
                const verifyData = await verifyRes.json();
                if (cancelled) return;

                if (!verifyRes.ok || !verifyData.paid) {
                    setStatus("error");
                    setMessage("Payment was not completed");
                    return;
                }

                const stashKey = `pending_order_${sessionId}`;
                const raw = sessionStorage.getItem(stashKey);
                if (!raw) {
                    setStatus("success");
                    setMessage("Payment confirmed. Redirecting to your orders...");
                    setTimeout(() => router.push("/dashboard/orders"), 1500);
                    return;
                }

                const payload: PendingPayload = JSON.parse(raw);
                const now = new Date().toISOString();
                setMessage("Payment confirmed. Creating your order...");

                if (payload.type === "cart") {
                    const orderItems = payload.items.map((it) => ({
                        product_id: it.product_id,
                        supplier_id: it.supplier_id,
                        quantity: it.quantity,
                        unit_price: it.unit_price,
                        total_price: it.total_price,
                        product_snapshot: it.product_snapshot,
                        special_requirments: payload.specialRequirements,
                        shipping_address: payload.shippingAddress,
                        payment_method: "online_payment",
                        date_time: now,
                    }));
                    const { error } = await createOrderWithItems(
                        {
                            shipping_address: payload.shippingAddress,
                            payment_method: "online_payment",
                            date_time: now,
                            special_requirments: payload.specialRequirements,
                        },
                        orderItems
                    );
                    if (error) throw new Error(error);
                } else {
                    const unitPrice = parseFloat(payload.product.price_per_unit);
                    const { error } = await createOrderItem(
                        {
                            product_id: payload.product.id,
                            quantity: payload.quantity,
                            unit_price: unitPrice,
                            total_price: unitPrice * payload.quantity,
                            product_snapshot: {
                                name: payload.product.name,
                                category: payload.product.category,
                                description: payload.product.description,
                                image_urls: payload.product.image_urls,
                                origin_country: payload.product.origin_country,
                                unit_type: payload.product.unit_type,
                            },
                            special_requirments: payload.specialRequirements,
                            shipping_address: payload.shippingAddress,
                            payment_method: "online_payment",
                            date_time: now,
                        },
                        payload.product.supplier_id
                    );
                    if (error) throw new Error(error);
                }

                sessionStorage.removeItem(stashKey);
                if (cancelled) return;
                setStatus("success");
                setMessage("Order confirmed! Redirecting...");
                setTimeout(() => router.push("/dashboard/orders"), 1500);
            } catch (err: any) {
                if (cancelled) return;
                setStatus("error");
                setMessage(err?.message || "Something went wrong creating your order");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sessionId, router]);

    return (
        <div className="ml-20 pt-4 flex items-center justify-center min-h-[80vh]">
            <div className="flex flex-col items-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100 max-w-md mx-auto text-center">
                {status === "loading" && (
                    <>
                        <Loader2 className="w-12 h-12 text-[#EA7B7B] animate-spin mb-6" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing</h2>
                        <p className="text-gray-500">{message}</p>
                    </>
                )}
                {status === "success" && (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h2>
                        <p className="text-gray-500">{message}</p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                        <p className="text-gray-500 mb-6">{message}</p>
                        <button
                            onClick={() => router.push("/dashboard/checkout")}
                            className="px-5 py-2.5 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a]"
                        >
                            Back to Checkout
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
