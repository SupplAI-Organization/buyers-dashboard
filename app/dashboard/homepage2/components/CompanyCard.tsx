"use client";

import { Building2, Eye, BadgeCheck, User, MapPin, Hash } from "lucide-react";
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
    <div
      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-gray-100 flex flex-col h-full cursor-pointer hover:border-[#EA7B7B]/50"
      onClick={handleViewProducts}
    >
      {/* Icon/Cover Section */}
      <div className="relative h-32 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-2xl">
        <Building2 className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col relative">
        <div className="relative group/tooltip block w-max max-w-full">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2 mb-1 cursor-pointer hover:text-[#EA7B7B] transition-colors relative">
            {company.business_name || "Unknown Company"}
          </h3>

          {/* Tooltip Popup */}
          <div
            className="absolute z-[100] left-1/2 bottom-[115%] mb-2 w-[320px] md:w-[350px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.15)] rounded-2xl border border-gray-200 p-0 transform -translate-x-1/2 translate-y-3 group-hover/tooltip:translate-y-0 cursor-default overflow-hidden origin-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Area */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EA7B7B]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#EA7B7B]" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-[15px] leading-tight max-w-[200px] truncate">
                    {company.business_name || "Seller Info"}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Verified Supplier Details
                  </p>
                </div>
              </div>
              {company.is_verified && (
                <div
                  className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md shadow-sm border border-emerald-100"
                  title="Trusted Supplier"
                >
                  <BadgeCheck className="w-4 h-4" />
                  <span className="text-[11px] uppercase font-bold tracking-widest">
                    Verified
                  </span>
                </div>
              )}
            </div>

            {/* Details area (Table) */}
            <div className="p-0">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 font-medium w-[40%] flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      Contact Person
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-semibold w-[60%] truncate">
                      {company.contact_person || "Not provided"}
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 font-medium w-[40%] flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      GST Number
                    </td>
                    <td className="px-5 py-3 w-[60%]">
                      <span className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs font-semibold tracking-wider">
                        {company.gstin || "N/A"}
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 font-medium w-[40%] flex items-start gap-2 pt-4">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      Full Address
                    </td>
                    <td className="px-5 py-3 text-gray-800 text-xs leading-relaxed w-[60%] whitespace-normal pr-5">
                      {company.business_address ||
                        "Address details not available."}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-3 mt-1">
          {company.business_type || "General Supplier"}
        </p>

        <div className="mt-auto pt-4 flex gap-2">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors border border-gray-100">
            <Eye className="w-4 h-4" />
            View Products
          </button>
        </div>
      </div>
    </div>
  );
}
