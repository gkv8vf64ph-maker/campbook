import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mvwdstlrstdxhhpugnds.supabase.co",
        pathname: "/storage/v1/object/public/photo/**",
      },
    ],
  },
};

export default nextConfig;