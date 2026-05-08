"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/product";
import Sidebar from "../../Sidebar";
import Topbar from "../../Topbar";
import BuyNowContent from "../components/BuyNowContent";
import { Loader2, AlertCircle } from "lucide-react";

export default function BuyNowPage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                router.replace("/login");
                return;
            }
            setUser(userData.user);

            if (!params.id) return;
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .eq("id", params.id)
                .single();

            if (error) {
                setError("Product not found");
            } else {
                setProduct(data);
            }
            setLoading(false);
        };

        init();
    }, [params.id, router]);

    if (!user) return null;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f6fa]">
                <Topbar user={user} />
                <Sidebar />
                <div className="ml-20 pt-4 flex items-center justify-center min-h-[80vh]">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
                        <p className="text-gray-500 mt-4">Loading product details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-[#f5f6fa]">
                <Topbar user={user} />
                <Sidebar />
                <div className="ml-20 pt-4 flex items-center justify-center min-h-[80vh]">
                    <div className="flex flex-col items-center">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                        <p className="text-red-500 text-lg mt-4">
                            {error || "Product not found"}
                        </p>
                        <button
                            onClick={() => router.push("/dashboard/homepage")}
                            className="mt-4 px-6 py-2.5 bg-[#EA7B7B] text-white rounded-xl hover:bg-[#d96a6a] transition-colors font-medium"
                        >
                            Back to Products
                        </button>
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
                <BuyNowContent product={product} user={user} />
            </div>
        </div>
    );
}
