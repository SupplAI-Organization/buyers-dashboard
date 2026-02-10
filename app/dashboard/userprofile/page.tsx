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

interface UserProfile {
  id: string;
  email: string;
  business_name: string;
  business_type: string;
  gstin: string;
  contact_person: string;
  contact_number: string;
  business_address: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

const emptyProfile: Omit<
  UserProfile,
  "id" | "email" | "is_verified" | "created_at" | "updated_at"
> = {
  business_name: "",
  business_type: "",
  gstin: "",
  contact_person: "",
  contact_number: "",
  business_address: "",
};

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [editedData, setEditedData] = useState(emptyProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  // Fetch user profile from Supabase, create if doesn't exist
  const fetchOrCreateUserProfile = async (userId: string, email: string) => {
    // First try to fetch existing profile
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (data) {
      return data as UserProfile;
    }

    // If no profile exists (PGRST116 = no rows returned), create one
    if (error?.code === "PGRST116") {
      const { data: newProfile, error: insertError } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: email,
          business_name: "",
          business_type: "",
          gstin: "",
          contact_person: "",
          contact_number: "",
          business_address: "",
          is_verified: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "Error creating profile:",
          insertError.message,
          insertError.details,
          insertError.hint,
        );
        return null;
      }
      return newProfile as UserProfile;
    }

    console.error("Error fetching profile:", error);
    return null;
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
        setAvatarUrl(
          data.user?.user_metadata?.avatar_url ||
            data.user?.user_metadata?.picture ||
            null,
        );

        // Fetch or create profile data from users table
        const profile = await fetchOrCreateUserProfile(
          data.user.id,
          data.user.email!,
        );
        if (profile) {
          setProfileData(profile);
          setEditedData({
            business_name: profile.business_name || "",
            business_type: profile.business_type || "",
            gstin: profile.gstin || "",
            contact_person: profile.contact_person || "",
            contact_number: profile.contact_number || "",
            business_address: profile.business_address || "",
          });
        }
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel("users-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `email=eq.${user.email}`,
        },
        (payload) => {
          console.log("Real-time update:", payload);
          if (payload.new) {
            const newProfile = payload.new as UserProfile;
            setProfileData(newProfile);
            if (!isEditing) {
              setEditedData({
                business_name: newProfile.business_name || "",
                business_type: newProfile.business_type || "",
                gstin: newProfile.gstin || "",
                contact_person: newProfile.contact_person || "",
                contact_number: newProfile.contact_number || "",
                business_address: newProfile.business_address || "",
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, isEditing]);

  const handleEditClick = () => {
    if (profileData) {
      setEditedData({
        business_name: profileData.business_name || "",
        business_type: profileData.business_type || "",
        gstin: profileData.gstin || "",
        contact_person: profileData.contact_person || "",
        contact_number: profileData.contact_number || "",
        business_address: profileData.business_address || "",
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profileData) {
      setEditedData({
        business_name: profileData.business_name || "",
        business_type: profileData.business_type || "",
        gstin: profileData.gstin || "",
        contact_person: profileData.contact_person || "",
        contact_number: profileData.contact_number || "",
        business_address: profileData.business_address || "",
      });
    }
    setSelectedPhoto(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user?.email || !user?.id) return;

    setSaving(true);
    try {
      // Use upsert to handle both new and existing profiles
      const { error } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          business_name: editedData.business_name,
          business_type: editedData.business_type,
          gstin: editedData.gstin,
          contact_person: editedData.contact_person,
          contact_number: editedData.contact_number,
          business_address: editedData.business_address,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );

      if (error) {
        console.error(
          "Error saving profile:",
          error.message,
          error.details,
          error.hint,
        );
        alert("Failed to save profile. Please try again.");
        return;
      }

      // If a new photo was selected, create a local preview URL
      if (selectedPhoto) {
        const photoUrl = URL.createObjectURL(selectedPhoto);
        setAvatarUrl(photoUrl);
        setImageError(false);
      }

      // Refresh profile data
      const updatedProfile = await fetchOrCreateUserProfile(
        user.id,
        user.email,
      );
      if (updatedProfile) {
        setProfileData(updatedProfile);
      }

      setIsEditing(false);
      setSelectedPhoto(null);
    } catch (err) {
      console.error("Error:", err);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoChange = (file: File) => {
    setSelectedPhoto(file);
    // Create preview immediately
    const photoUrl = URL.createObjectURL(file);
    setAvatarUrl(photoUrl);
    setImageError(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#EA7B7B] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const userName =
    user?.user_metadata?.full_name ||
    profileData?.contact_person ||
    user?.email?.split("@")[0] ||
    "User";
  const joinDate = new Date(
    profileData?.created_at || user?.created_at,
  ).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Use editedData when editing, profileData when not
  const displayData = isEditing
    ? editedData
    : {
        business_name: profileData?.business_name || "",
        business_type: profileData?.business_type || "",
        gstin: profileData?.gstin || "",
        contact_person: profileData?.contact_person || "",
        contact_number: profileData?.contact_number || "",
        business_address: profileData?.business_address || "",
      };

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
          isEditing={isEditing}
          onEditClick={handleEditClick}
          onSave={handleSave}
          onCancel={handleCancel}
          onPhotoChange={handlePhotoChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <AccountInfo
              joinDate={joinDate}
              isVerified={profileData?.is_verified}
            />
            <QuickStats />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <BusinessDetails
              companyName={displayData.business_name}
              businessType={displayData.business_type}
              gstNumber={displayData.gstin}
              contactPerson={displayData.contact_person}
              isEditing={isEditing}
              onChange={handleFieldChange}
            />
            <ContactDetails
              phone={displayData.contact_number}
              email={user?.email}
              isEditing={isEditing}
              onChange={handleFieldChange}
            />
            <AddressCard
              address={displayData.business_address}
              isEditing={isEditing}
              onChange={handleFieldChange}
            />
          </div>
        </div>
      </div>

      {/* Saving overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-[#EA7B7B] animate-spin" />
            <span className="text-gray-700 font-medium">Saving...</span>
          </div>
        </div>
      )}
    </div>
  );
}
