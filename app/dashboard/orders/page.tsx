"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Order } from "@/lib/order";
import { fetchOrders } from "@/lib/orderService";
import Sidebar from "../homepage/components/Sidebar";
import Topbar from "../homepage/components/Topbar";
import OrdersContent from "./components/OrdersContent";

export default function OrdersPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const ordersData = await fetchOrders();
        setOrders(ordersData);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.replace("/login");
                return;
            }
            if (cancelled) return;
            setUser(userData.user);
            await refresh();
            if (!cancelled) setLoading(false);
        };

        init();

        const onFocus = () => {
            refresh();
        };
        const onVisibility = () => {
            if (document.visibilityState === "visible") refresh();
        };

        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            cancelled = true;
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [router, refresh]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#f5f6fa]">
            <Topbar user={user} />
            <Sidebar />

            <div className="ml-20 transition-all duration-300">
                <OrdersContent orders={orders} loading={loading} />
            </div>
        </div>
    );
}
