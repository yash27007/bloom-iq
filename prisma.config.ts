/**
 * Prisma v7 Configuration
 *
 * Centralizes Prisma CLI config and environment management.
 * Uses Prisma's env() helper to properly load environment variables.
 */
import { defineConfig, env } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  // Schema location
  schema: "prisma/schema.prisma",

  // Migration configuration
  migrations: {
    // Migration files directory
    path: "prisma/migrations",
    // Seed command using Bun for TypeScript execution
    seed: "bun run prisma/seed.ts",
  },

  // Database connection (Direct TCP)
  datasource: {
    url: env("DIRECT_URL"),
  },
});
