"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { creditWallet } from "@/lib/walletService";

export default function WalletTopupSuccessPage() {
    return (
        <Suspense fallback={<TopupFallback />}>
            <WalletTopupInner />
        </Suspense>
    );
}

function TopupFallback() {
    return (
        <div className="ml-20 pt-4 flex items-center justify-center min-h-[80vh]">
            <div className="flex flex-col items-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100 max-w-md mx-auto text-center">
                <Loader2 className="w-12 h-12 text-[#EA7B7B] animate-spin mb-6" />
                <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
            </div>
        </div>
    );
}

function WalletTopupInner() {
    const router = useRouter();
    const params = useSearchParams();
    const sessionId = params.get("session_id");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying payment...");
    const [credited, setCredited] = useState<number | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setStatus("error");
            setMessage("Missing session id");
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/stripe/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
                const data = await res.json();
                if (cancelled) return;

                if (!res.ok || !data.paid) {
                    setStatus("error");
                    setMessage("Payment was not completed");
                    return;
                }

                if (data.metadata?.type !== "wallet_topup") {
                    setStatus("error");
                    setMessage("This session is not a wallet top-up");
                    return;
                }

                const amountInr = Number(data.metadata?.amount_inr);
                const amountFromTotal = data.amount_total ? data.amount_total / 100 : null;
                const amount = amountInr || amountFromTotal;
                if (!amount || amount <= 0) {
                    setStatus("error");
                    setMessage("Could not determine top-up amount");
                    return;
                }

                setMessage("Payment confirmed. Crediting wallet...");
                const { error } = await creditWallet(amount, "Wallet top-up via Stripe", sessionId);
                if (cancelled) return;
                if (error) throw new Error(error);

                setCredited(amount);
                setStatus("success");
                setMessage("Wallet topped up successfully.");
                setTimeout(() => router.push("/dashboard/wallet"), 1800);
            } catch (err: any) {
                if (cancelled) return;
                setStatus("error");
                setMessage(err?.message || "Could not credit wallet");
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Top-up Successful</h2>
                        {credited !== null && (
                            <p className="text-gray-700 mb-1">
                                ₹{credited.toLocaleString("en-IN", { minimumFractionDigits: 2 })} added to your wallet.
                            </p>
                        )}
                        <p className="text-gray-400 text-sm">{message}</p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Top-up Failed</h2>
                        <p className="text-gray-500 mb-6">{message}</p>
                        <button
                            onClick={() => router.push("/dashboard/wallet")}
                            className="px-5 py-2.5 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a]"
                        >
                            Back to Wallet
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
