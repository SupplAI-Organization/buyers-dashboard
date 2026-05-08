"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    getWallet,
    fetchWalletTransactions,
    Wallet,
    WalletTransaction,
} from "@/lib/walletService";
import Sidebar from "../homepage/components/Sidebar";
import Topbar from "../homepage/components/Topbar";
import {
    Wallet as WalletIcon,
    Plus,
    ArrowDownCircle,
    ArrowUpCircle,
    Loader2,
    AlertCircle,
} from "lucide-react";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

export default function WalletPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState<string>("1000");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.replace("/login");
                return;
            }
            setUser(userData.user);

            const url = new URL(window.location.href);
            if (url.searchParams.get("topup") === "cancelled") {
                setNotice("Top-up was cancelled. No charge was made.");
                url.searchParams.delete("topup");
                window.history.replaceState({}, "", url.toString());
            }

            const [{ wallet: w, error: wErr }, txs] = await Promise.all([
                getWallet(),
                fetchWalletTransactions(50),
            ]);
            if (wErr) setError(wErr);
            setWallet(w);
            setTransactions(txs);
            setLoading(false);
        };
        init();
    }, [router]);

    const handleTopUp = async () => {
        const numeric = Number(amount);
        if (!numeric || numeric <= 0) {
            setError("Enter a valid amount");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch("/api/stripe/wallet-topup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: numeric }),
            });
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.error || "Failed to start top-up");
            window.location.href = data.url;
        } catch (err: any) {
            setError(err?.message || "Could not start top-up");
            setSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#f5f6fa]">
            <Topbar user={user} />
            <Sidebar />

            <div className="ml-20 pt-4">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                        <WalletIcon className="w-7 h-7 text-[#EA7B7B]" />
                        My Wallet
                    </h1>

                    {notice && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {notice}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Balance + Top-up */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-gradient-to-br from-[#EA7B7B] to-[#d96a6a] rounded-2xl p-8 text-white shadow-lg">
                                <p className="text-sm opacity-90 mb-2">Available Balance</p>
                                <p className="text-4xl font-bold">
                                    {loading ? "—" : `₹${(wallet?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                                </p>
                                <p className="text-xs opacity-75 mt-3">
                                    Use this balance directly at checkout — no card needed.
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-[#EA7B7B]" />
                                    Add Funds
                                </h3>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {QUICK_AMOUNTS.map((q) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => setAmount(String(q))}
                                            className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${Number(amount) === q
                                                    ? "border-[#EA7B7B] bg-[#EA7B7B]/5 text-[#EA7B7B]"
                                                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                                                }`}
                                        >
                                            ₹{q.toLocaleString("en-IN")}
                                        </button>
                                    ))}
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Amount (INR)
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min={1}
                                        step={1}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20 focus:border-[#EA7B7B]"
                                    />
                                    <button
                                        onClick={handleTopUp}
                                        disabled={submitting}
                                        className="px-6 py-3 bg-[#EA7B7B] text-white rounded-xl font-semibold hover:bg-[#d96a6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Redirecting...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4" />
                                                Add Funds
                                            </>
                                        )}
                                    </button>
                                </div>

                                {error && (
                                    <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </p>
                                )}

                                <p className="text-xs text-gray-400 mt-3">
                                    Pays via Stripe in test mode. Use card 4242 4242 4242 4242.
                                </p>
                            </div>
                        </div>

                        {/* History */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Recent Activity
                                </h3>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <p className="text-sm text-gray-400 py-8 text-center">
                                        No transactions yet.
                                    </p>
                                ) : (
                                    <ul className="space-y-3 max-h-[28rem] overflow-y-auto">
                                        {transactions.map((tx) => (
                                            <li key={tx.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                                {tx.type === "credit" ? (
                                                    <ArrowDownCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <ArrowUpCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {tx.description || (tx.type === "credit" ? "Top-up" : "Payment")}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(tx.created_at).toLocaleString("en-IN", {
                                                            dateStyle: "medium",
                                                            timeStyle: "short",
                                                        })}
                                                    </p>
                                                </div>
                                                <p
                                                    className={`text-sm font-semibold whitespace-nowrap ${tx.type === "credit" ? "text-emerald-600" : "text-red-500"
                                                        }`}
                                                >
                                                    {tx.type === "credit" ? "+" : "−"}₹
                                                    {Number(tx.amount).toLocaleString("en-IN", {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
