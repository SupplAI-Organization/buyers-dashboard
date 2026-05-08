"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import CompanyCard from "./CompanyCard";
import { Loader2, Package } from "lucide-react";

export interface Company {
  id: string;
  business_name: string;
  business_type: string;
  role: string;
  gstin?: string;
  is_verified?: boolean;
  business_address?: string;
  contact_person?: string;
  // you might have more fields
}

export default function CompanyGrid() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", "seller");

        if (error) throw error;
        setCompanies(data as Company[]);
      } catch (err: any) {
        console.error("Error fetching companies:", err);
        setError("Failed to load companies.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
        <p className="text-gray-500 mt-4">Loading suppliers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[#EA7B7B] text-white rounded-lg hover:bg-[#d96a6a]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500 mt-4 text-lg">No suppliers found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Suppliers</h2>
          <p className="text-gray-500 text-sm mt-1">
            {companies.length} supplier{companies.length !== 1 ? "s" : ""}{" "}
            available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
