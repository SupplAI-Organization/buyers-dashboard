"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      router.replace("/dashboard/homepage2");
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]">
      <div className="text-center space-y-3">
        <svg
          className="animate-spin h-8 w-8 text-[#EA7B7B] mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-gray-600 font-medium">Signing you in...</p>
      </div>
    </div>
  );
}
