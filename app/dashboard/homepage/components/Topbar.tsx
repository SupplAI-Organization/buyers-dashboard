"use client";

import { useState } from "react";
import { Search, ShoppingCart, Bell, User, ChevronDown } from "lucide-react";
import Link from "next/link";

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
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

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
          <span className="ml-14 text-3xl font-bold text-gray-900">
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
          <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#EA7B7B] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200" />

          {/* User Profile */}
          <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors">
            <div className="w-9 h-9 bg-gradient-to-br from-[#EA7B7B] to-[#d96a6a] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">Buyer Account</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
