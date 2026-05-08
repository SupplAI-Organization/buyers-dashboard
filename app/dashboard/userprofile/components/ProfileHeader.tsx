import Image from "next/image";
import { Mail, Edit2, Camera, X, Save } from "lucide-react";
import { useRef } from "react";

interface ProfileHeaderProps {
  userName: string;
  email: string;
  avatarUrl: string | null;
  imageError: boolean;
  onImageError: () => void;
  isEditing: boolean;
  onEditClick: () => void;
  onSave: () => void;
  onCancel: () => void;
  onPhotoChange: (file: File) => void;
}

export default function ProfileHeader({
  userName,
  email,
  avatarUrl,
  imageError,
  onImageError,
  isEditing,
  onEditClick,
  onSave,
  onCancel,
  onPhotoChange,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(file);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Cover */}
      <div className="h-32 bg-gradient-to-r from-[#EA7B7B] to-[#d96a6a]" />

      {/* Profile Info */}
      <div className="px-8 pb-8">
        <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-12">
          {/* Avatar */}
          <div className="relative">
            {avatarUrl && !imageError ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={120}
                height={120}
                className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg"
                onError={onImageError}
              />
            ) : (
              <div className="w-28 h-28 bg-gradient-to-br from-[#EA7B7B] to-[#d96a6a] rounded-2xl flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            >
              <Camera className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Name & Email */}
          <div className="flex-1 md:pb-2">
            <h1 className="text-2xl font-bold text-gray-900">{userName}</h1>
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {email}
            </p>
          </div>

          {/* Edit/Save/Cancel Buttons */}
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={onSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a] transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={onEditClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#EA7B7B] text-white rounded-xl font-medium hover:bg-[#d96a6a] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
