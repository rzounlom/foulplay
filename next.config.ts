import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable build caching for faster rebuilds
  experimental: {
    // Enable build cache
    optimizePackageImports: ["@clerk/nextjs", "@prisma/client"],
  },
};

export default nextConfig;
