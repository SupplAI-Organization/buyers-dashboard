"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  ShoppingCart,
  Heart,
  ClipboardList,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const menuItems = [
  { icon: Home, label: "Home", href: "/dashboard/homepage" },
  { icon: Package, label: "Products", href: "/dashboard/products" },
  { icon: ShoppingCart, label: "Orders", href: "/dashboard/orders" },
  { icon: Heart, label: "Wishlist", href: "/dashboard/wishlist" },
  { icon: ClipboardList, label: "Quotes", href: "/dashboard/quotes" },
];

const bottomMenuItems = [
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  { icon: HelpCircle, label: "Help", href: "/dashboard/help" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-[68px] h-[calc(100vh-68px)] bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-30 ${
        isHovered ? "w-64 shadow-xl" : "w-20"
      }`}
    >
      {/* Main Menu */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-[#EA7B7B] text-white shadow-md shadow-[#EA7B7B]/20"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive
                        ? "text-white"
                        : "text-gray-500 group-hover:text-gray-700"
                    }`}
                  />
                  <span
                    className={`font-medium whitespace-nowrap transition-all duration-300 ${
                      isHovered
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4 absolute"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Menu */}
      <div className="py-4 px-3 border-t border-gray-100">
        <ul className="space-y-1">
          {bottomMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0 text-gray-500" />
                  <span
                    className={`font-medium whitespace-nowrap transition-all duration-300 ${
                      isHovered
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4 absolute"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span
                className={`font-medium whitespace-nowrap transition-all duration-300 ${
                  isHovered
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4 absolute"
                }`}
              >
                Logout
              </span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
