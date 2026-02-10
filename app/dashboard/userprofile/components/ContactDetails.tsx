import { Phone } from "lucide-react";

interface ContactDetailsProps {
  phone?: string;
  email: string;
  isEditing?: boolean;
  onChange?: (field: string, value: string) => void;
}

export default function ContactDetails({
  phone = "",
  email,
  isEditing = false,
  onChange,
}: ContactDetailsProps) {
  const handleChange = (field: string, value: string) => {
    if (onChange) {
      onChange(field, value);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5 text-[#EA7B7B]" />
        Contact Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-gray-500 font-medium">Contact Number</p>
          {isEditing ? (
            <input
              type="tel"
              value={phone}
              onChange={(e) => handleChange("contact_number", e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent"
              placeholder="Enter contact number"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 mt-1">
              {phone || "-"}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Email Address</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{email}</p>
        </div>
      </div>
    </div>
  );
}
