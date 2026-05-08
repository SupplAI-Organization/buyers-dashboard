import { supabase } from "./supabaseClient";

export interface Wallet {
    id: string;
    buyer_id: string;
    balance: number;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    buyer_id: string;
    type: "credit" | "debit";
    amount: number;
    balance_after: number;
    description: string | null;
    stripe_session_id: string | null;
    order_id: string | null;
    created_at: string;
}

export async function ensureWallet(): Promise<{ wallet: Wallet | null; error: string | null }> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        return { wallet: null, error: "User not authenticated" };
    }

    const { data: existing, error: fetchError } = await supabase
        .from("wallets")
        .select("*")
        .eq("buyer_id", userData.user.id)
        .maybeSingle();

    if (fetchError) {
        return { wallet: null, error: fetchError.message };
    }
    if (existing) {
        return { wallet: existing as Wallet, error: null };
    }

    const { data: created, error: insertError } = await supabase
        .from("wallets")
        .insert({ buyer_id: userData.user.id, balance: 0 })
        .select()
        .single();

    if (insertError) {
        return { wallet: null, error: insertError.message };
    }
    return { wallet: created as Wallet, error: null };
}

export async function getWallet(): Promise<{ wallet: Wallet | null; error: string | null }> {
    return ensureWallet();
}

export async function creditWallet(
    amount: number,
    description: string,
    stripeSessionId: string | null = null
): Promise<{ wallet: Wallet | null; error: string | null }> {
    const { error: ensureErr } = await ensureWallet();
    if (ensureErr) return { wallet: null, error: ensureErr };

    const { data, error } = await supabase.rpc("wallet_credit", {
        p_amount: amount,
        p_description: description,
        p_stripe_session_id: stripeSessionId,
    });
    if (error) return { wallet: null, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { wallet: row as Wallet, error: null };
}

export async function debitWallet(
    amount: number,
    description: string,
    orderId: string | null = null
): Promise<{ wallet: Wallet | null; error: string | null }> {
    const { error: ensureErr } = await ensureWallet();
    if (ensureErr) return { wallet: null, error: ensureErr };

    const { data, error } = await supabase.rpc("wallet_debit", {
        p_amount: amount,
        p_description: description,
        p_order_id: orderId,
    });
    if (error) {
        const msg = error.message || "Wallet debit failed";
        if (msg.includes("insufficient_balance")) {
            return { wallet: null, error: "Insufficient wallet balance" };
        }
        return { wallet: null, error: msg };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { wallet: row as Wallet, error: null };
}

export async function fetchWalletTransactions(limit = 50): Promise<WalletTransaction[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("buyer_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching wallet transactions:", error);
        return [];
    }
    return (data || []) as WalletTransaction[];
}
