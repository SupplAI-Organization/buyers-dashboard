import { Building2 } from "lucide-react";

interface BusinessDetailsProps {
  companyName?: string;
  businessType?: string;
  gstNumber?: string;
  contactPerson?: string;
  isEditing?: boolean;
  onChange?: (field: string, value: string) => void;
}

export default function BusinessDetails({
  companyName = "",
  businessType = "",
  gstNumber = "",
  contactPerson = "",
  isEditing = false,
  onChange,
}: BusinessDetailsProps) {
  const handleChange = (field: string, value: string) => {
    if (onChange) {
      onChange(field, value);
    }
  };

  const displayValue = (value: string) => value || "-";

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-[#EA7B7B]" />
        Business Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-500 font-medium">Business Name</p>
          {isEditing ? (
            <input
              type="text"
              value={companyName}
              onChange={(e) => handleChange("business_name", e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent"
              placeholder="Enter business name"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 mt-1">
              {displayValue(companyName)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Business Type</p>
          {isEditing ? (
            <input
              type="text"
              value={businessType}
              onChange={(e) => handleChange("business_type", e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent"
              placeholder="Enter business type"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 mt-1">
              {displayValue(businessType)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">GSTIN</p>
          {isEditing ? (
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => handleChange("gstin", e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent"
              placeholder="Enter GSTIN"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 mt-1">
              {displayValue(gstNumber)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Contact Person</p>
          {isEditing ? (
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => handleChange("contact_person", e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent"
              placeholder="Enter contact person name"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 mt-1">
              {displayValue(contactPerson)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
