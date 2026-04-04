import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub OAuth
      },
      {
        protocol: "https",
        hostname: "*.supabase.co", // Supabase Storage
      },
      {
        protocol: "https",
        hostname: "zjvwpppnmjxvytaqxqwa.supabase.co", // Your Supabase project
      },
    ],
  },
};

export default nextConfig;
