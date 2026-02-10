import { Shield, Calendar } from "lucide-react";

interface AccountInfoProps {
  joinDate: string;
  isVerified?: boolean;
}

export default function AccountInfo({
  joinDate,
  isVerified,
}: AccountInfoProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#EA7B7B]" />
        Account Info
      </h3>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 font-medium">Account Type</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            Buyer Account
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Member Since</p>
          <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            {joinDate}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">
            Verification Status
          </p>
          {isVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium mt-1">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
              Pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
