"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "../homepage/components/Sidebar";
import Topbar from "../homepage/components/Topbar";
import BuyNowContent from "../homepage/components/buy/components/BuyNowContent";
import { Loader2, ShoppingBag } from "lucide-react";
import { getCartWithItems } from "@/lib/cartService";

export default function CheckoutPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.replace("/login");
                return;
            }
            setUser(userData.user);

            try {
                const cart = await getCartWithItems(userData.user.id);
                if (cart && cart.items && cart.items.length > 0) {
                    const mappedItems = cart.items.map((item: any) => ({
                        ...item.product,
                        id: item.product_id, // Important: use product_id for checkout to match what BuyNowContent expects
                        supplier_id: item.product?.supplier_id,
                        cart_item_id: item.id,
                        quantity: item.quantity,
                    }));
                    setCartItems(mappedItems);
                } else {
                    router.push("/dashboard/cart");
                }
            } catch (error) {
                console.error("Failed to load cart", error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [router]);

    if (!user) return null;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f6fa]">
                <Topbar user={user} />
                <Sidebar />
                <div className="ml-20 pt-4 flex items-center justify-center min-h-[80vh]">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
                        <p className="text-gray-500 mt-4">Preparing your checkout...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f6fa]">
            <Topbar user={user} />
            <Sidebar />

            <div className="ml-20 transition-all duration-300">
                <BuyNowContent items={cartItems} user={user} />
            </div>
        </div>
    );
}
