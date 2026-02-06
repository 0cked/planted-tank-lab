import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tropica.com",
      },
      {
        protocol: "https",
        hostname: "www.tropica.com",
      },
    ],
  },
};

export default nextConfig;
