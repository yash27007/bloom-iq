import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  output: "standalone", // Enable standalone output for Docker
};

export default nextConfig;
