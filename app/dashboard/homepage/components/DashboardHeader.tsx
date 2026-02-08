"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardHeader({ user }: any) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold">
        Welcome back, {user.user_metadata?.full_name || "User"} 👋
      </h1>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        }}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
