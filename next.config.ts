import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable build caching for faster rebuilds
  experimental: {
    // Enable build cache
    optimizePackageImports: ["@clerk/nextjs", "@prisma/client"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
