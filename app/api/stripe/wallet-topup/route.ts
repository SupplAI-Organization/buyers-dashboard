import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
    try {
        const { amount } = await req.json();
        const numeric = Number(amount);
        if (!numeric || numeric <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        if (numeric > 1_000_000) {
            return NextResponse.json({ error: "Amount too large" }, { status: 400 });
        }

        const origin = req.headers.get("origin") ?? new URL(req.url).origin;
        const unitAmount = Math.round(numeric * 100); // paise

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        unit_amount: unitAmount,
                        product_data: { name: "Wallet Top-up" },
                    },
                    quantity: 1,
                },
            ],
            metadata: { type: "wallet_topup", amount_inr: String(numeric) },
            success_url: `${origin}/dashboard/wallet/topup-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard/wallet?topup=cancelled`,
        });

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (err: any) {
        console.error("[stripe/wallet-topup] error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Failed to start top-up" },
            { status: 500 }
        );
    }
}
