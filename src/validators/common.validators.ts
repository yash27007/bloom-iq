/**
 * Common validation schemas used across the application
 */

import { z } from "zod";
import { Role } from "@/generated/prisma";

export const roleArray = Object.values(Role) as [Role, ...Role[]];

/**
 * Base pagination input schema
 */
export const baseListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * ID validation schema
 */
export const idSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

/**
 * Multiple IDs validation schema
 */
export const idsSchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid ID format"))
    .min(1, "At least one ID is required"),
});

/**
 * Email validation schema
 */
export const emailSchema = z.object({
  email: z.string().email("Invalid email format"),
});

/**
 * Helper to safely parse sortBy field against a whitelist
 */
export function safeOrderBy<T extends string>(
  key: string | undefined,
  order: "asc" | "desc",
  whitelist: readonly T[]
): Record<T, "asc" | "desc"> | undefined {
  if (!key) return undefined;
  if (whitelist.includes(key as T)) {
    return { [key as T]: order } as Record<T, "asc" | "desc">;
  }
  return undefined;
}

/**
 * Calculate pagination skip/take
 */
export function paginate(page: number, limit: number) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}
