import { Building2 } from "lucide-react";

interface BusinessDetailsProps {
  companyName?: string;
  businessType?: string;
  gstNumber?: string;
  panNumber?: string;
  annualTurnover?: string;
  establishedYear?: string;
}

export default function BusinessDetails({
  companyName = "-",
  businessType = "-",
  gstNumber = "-",
  panNumber = "-",
  annualTurnover = "-",
  establishedYear = "-",
}: BusinessDetailsProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-[#EA7B7B]" />
        Business Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-500 font-medium">Company Name</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{companyName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Business Type</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{businessType}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">GST Number</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{gstNumber}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">PAN Number</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{panNumber}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Annual Turnover</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{annualTurnover}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Established Year</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{establishedYear}</p>
        </div>
      </div>
    </div>
  );
}
