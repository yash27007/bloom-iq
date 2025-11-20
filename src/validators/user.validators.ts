/**
 * Validation schemas for user-related operations
 */

import { z } from "zod";
import { roleArray, baseListInputSchema } from "./common.validators";

/**
 * User sortable keys whitelist
 */
export const userSortableKeys = [
  "firstName",
  "lastName",
  "email",
  "facultyId",
  "role",
  "designation",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;

export type UserSortableKey = (typeof userSortableKeys)[number];

/**
 * List users input schema
 */
export const listUsersInputSchema = baseListInputSchema.extend({
  role: z.enum(roleArray).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Update user input schema
 */
export const updateUserInputSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  facultyId: z.string().min(1, "Faculty ID is required").optional(),
  designation: z
    .enum(["ASSISTANT_PROFESSOR", "ASSOCIATE_PROFESSOR", "PROFESSOR"])
    .optional(),
  role: z.enum(roleArray).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

/**
 * Create user input schema (reuses signUpSchema from auth)
 */
export { signUpSchema as createUserInputSchema } from "@/types/auth";
