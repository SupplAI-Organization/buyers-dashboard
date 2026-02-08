"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import DashboardHeader from "./components/DashboardHeader";
import StatsSection from "./components/StatsSection";
import ProductGrid from "./components/ProductGrid";

export default function DashboardHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
    };
    checkUser();
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6">
      <DashboardHeader user={user} />
      <StatsSection />
      <ProductGrid />
    </div>
  );
}
