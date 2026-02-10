import { MapPin } from "lucide-react";

interface AddressCardProps {
  address?: string;
  isEditing?: boolean;
  onChange?: (field: string, value: string) => void;
}

export default function AddressCard({
  address = "",
  isEditing = false,
  onChange,
}: AddressCardProps) {
  const handleChange = (field: string, value: string) => {
    if (onChange) {
      onChange(field, value);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#EA7B7B]" />
        Business Address
      </h3>
      <div>
        <p className="text-xs text-gray-500 font-medium">Full Address</p>
        {isEditing ? (
          <textarea
            value={address}
            onChange={(e) => handleChange("business_address", e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent resize-none"
            placeholder="Enter complete business address"
          />
        ) : (
          <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-line">
            {address || "-"}
          </p>
        )}
      </div>
    </div>
  );
}
