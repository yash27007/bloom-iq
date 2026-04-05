import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Vercel handles deployment automatically, no special output config needed

  devIndicators:false
};

export default nextConfig;
