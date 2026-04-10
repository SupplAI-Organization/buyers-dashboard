"use client";

import { Building2, Eye } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Company } from "./CompanyGrid";

interface CompanyCardProps {
  company: Company;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  const router = useRouter();

  const handleViewProducts = () => {
    router.push(`/dashboard/homepage?supplier_id=${company.id}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 flex flex-col h-full cursor-pointer hover:border-[#EA7B7B]/50" onClick={handleViewProducts}>
      {/* Icon/Cover Section */}
      <div className="relative h-32 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <Building2 className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2 mb-1">
          {company.business_name || "Unknown Company"}
        </h3>

        <p className="text-sm text-gray-500 mb-3">
          {company.business_type || "General Supplier"}
        </p>

        <div className="mt-auto pt-4 flex gap-2">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors border border-gray-100"
          >
            <Eye className="w-4 h-4" />
            View Products
          </button>
        </div>
      </div>
    </div>
  );
}
