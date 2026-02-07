"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/auth/AuthGuard";

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold mb-6">
        Welcome to SupplAI Dashboard
      </h1>

      <button
        onClick={handleLogout}
        className="bg-[#EA7B7B] text-white px-6 py-3 rounded-lg"
      >
        Logout
      </button>
    </div>
  );
}
