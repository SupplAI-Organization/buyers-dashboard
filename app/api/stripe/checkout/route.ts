import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

interface LineItemInput {
    name: string;
    unit_amount: number; // in smallest currency unit (paise)
    quantity: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const items: LineItemInput[] = body.items;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "No items provided" }, { status: 400 });
        }

        const origin = req.headers.get("origin") ?? new URL(req.url).origin;

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: items.map((it) => ({
                price_data: {
                    currency: "inr",
                    unit_amount: it.unit_amount,
                    product_data: { name: it.name },
                },
                quantity: it.quantity,
            })),
            success_url: `${origin}/dashboard/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard/checkout/cancel`,
        });

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (err: any) {
        console.error("[stripe/checkout] error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
