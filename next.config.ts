import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Skip the optimizer entirely. On dual-stack / NAT64 networks (notably
    // macOS), Supabase Storage URLs resolve through 64:ff9b::* which the
    // optimizer treats as a private IP and rejects with
    // `"url" parameter is not allowed`. We don't need transcoding/resizing
    // for the hackathon, so let <Image> just render the source URL.
    unoptimized: true,
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
