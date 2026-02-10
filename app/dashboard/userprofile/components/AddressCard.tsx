import { MapPin } from "lucide-react";

interface AddressCardProps {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export default function AddressCard({
  address = "-",
  city = "-",
  state = "-",
  country = "-",
  pincode = "-",
}: AddressCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#EA7B7B]" />
        Address
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <p className="text-xs text-gray-500 font-medium">Street Address</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{address}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">City</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{city}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">State</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{state}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Country</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{country}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Pincode</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{pincode}</p>
        </div>
      </div>
    </div>
  );
}
