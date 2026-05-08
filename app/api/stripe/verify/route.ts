import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
    try {
        const { sessionId } = await req.json();
        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return NextResponse.json({
            paid: session.payment_status === "paid",
            payment_status: session.payment_status,
            amount_total: session.amount_total,
            currency: session.currency,
            metadata: session.metadata ?? {},
        });
    } catch (err: any) {
        console.error("[stripe/verify] error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Failed to verify session" },
            { status: 500 }
        );
    }
}
