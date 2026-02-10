"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Loader2 } from "lucide-react";

import ProfileHeader from "./components/ProfileHeader";
import AccountInfo from "./components/AccountInfo";
import QuickStats from "./components/QuickStats";
import BusinessDetails from "./components/BusinessDetails";
import ContactDetails from "./components/ContactDetails";
import AddressCard from "./components/AddressCard";

// Dummy user profile data - will be replaced with Supabase data later
const dummyProfile = {
  company_name: "Acme Industries Pvt. Ltd.",
  phone: "+91 98765 43210",
  address: "123, Industrial Area, Phase 2",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  pincode: "400001",
  gst_number: "27AABCU9603R1ZM",
  pan_number: "AABCU9603R",
  business_type: "Manufacturer",
  annual_turnover: "₹10-50 Crores",
  established_year: "2015",
};

// Dummy stats - will be replaced with Supabase data later
const dummyStats = {
  orders: 12,
  wishlist: 5,
  quotes: 3,
  suppliers: 8,
};

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const joinDate = new Date(user?.created_at).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile Header Card */}
        <ProfileHeader
          userName={userName}
          email={user?.email}
          avatarUrl={avatarUrl}
          imageError={imageError}
          onImageError={() => setImageError(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <AccountInfo joinDate={joinDate} />
            <QuickStats
              orders={dummyStats.orders}
              wishlist={dummyStats.wishlist}
              quotes={dummyStats.quotes}
              suppliers={dummyStats.suppliers}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <BusinessDetails
              companyName={dummyProfile.company_name}
              businessType={dummyProfile.business_type}
              gstNumber={dummyProfile.gst_number}
              panNumber={dummyProfile.pan_number}
              annualTurnover={dummyProfile.annual_turnover}
              establishedYear={dummyProfile.established_year}
            />
            <ContactDetails phone={dummyProfile.phone} email={user?.email} />
            <AddressCard
              address={dummyProfile.address}
              city={dummyProfile.city}
              state={dummyProfile.state}
              country={dummyProfile.country}
              pincode={dummyProfile.pincode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
