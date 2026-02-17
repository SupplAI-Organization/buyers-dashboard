"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface TopbarProps {
  user: any;
  onSearch?: (query: string) => void;
  cartItemsCount?: number;
}

export default function Topbar({
  user,
  onSearch,
  cartItemsCount = 0,
}: TopbarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [imageError, setImageError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Get avatar URL from Supabase auth metadata
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center gap-6 px-6 py-3">
        {/* Logo */}
        <Link
          href="/dashboard/homepage"
          className="relative flex items-center flex-shrink-0"
        >
          <img
            src="/landing/SupplAI_logo.jpg"
            alt="SupplAI Logo"
            className="absolute -left-5 h-28 w-28 object-contain"
          />
          <span className="ml-14 text-2xl font-bold text-gray-900">
            Suppl<span className="text-[#EA7B7B]">AI</span>
          </span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 flex max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for raw materials, suppliers..."
              className="w-full h-11 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EA7B7B]/20 focus:border-[#EA7B7B] transition-all"
            />
          </div>
          <button
            type="submit"
            className="ml-2 h-11 px-5 bg-[#EA7B7B] hover:bg-[#d96a6a] text-white rounded-xl font-medium transition-colors"
          >
            Search
          </button>
        </form>

        {/* Right Section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Notifications */}
          <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#EA7B7B] rounded-full"></span>
          </button>

          {/* Cart */}
          <Link
            href="/dashboard/cart"
            className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#EA7B7B] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium">
                {cartItemsCount}
              </span>
            )}
          </Link>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200" />

          {/* User Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {avatarUrl && !imageError ? (
                <Image
                  src={avatarUrl}
                  alt={userName}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-[#EA7B7B] to-[#d96a6a] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">Buyer Account</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 hidden md:block transition-transform ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/dashboard/userprofile"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    My Account
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
