/**
 * Validation schemas for course-related operations
 */

import { z } from "zod";
import { roleArray, baseListInputSchema } from "./common.validators";

/**
 * Course sortable keys whitelist
 */
export const courseSortableKeys = [
  "course_code",
  "name",
  "createdAt",
  "updatedAt",
] as const;

export type CourseSortableKey = (typeof courseSortableKeys)[number];

/**
 * List courses input schema
 */
export const listCoursesInputSchema = baseListInputSchema;

/**
 * Add course input schema
 */
export const addCourseInputSchema = z.object({
  course_code: z
    .string()
    .min(3, "Course code must be at least 3 characters")
    .max(20, "Course code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Course code must contain only uppercase letters, numbers, and hyphens"
    ),
  name: z.string().min(3, "Course name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  courseCoordinatorId: z.string().uuid("Invalid course coordinator ID"),
  moduleCoordinatorId: z.string().uuid("Invalid module coordinator ID"),
  programCoordinatorId: z.string().uuid("Invalid program coordinator ID"),
});

/**
 * Update course input schema
 */
export const updateCourseInputSchema = z.object({
  id: z.string().uuid("Invalid course ID"),
  course_code: z
    .string()
    .min(3, "Course code must be at least 3 characters")
    .max(20, "Course code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Course code must contain only uppercase letters, numbers, and hyphens"
    )
    .optional(),
  name: z
    .string()
    .min(3, "Course name must be at least 3 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  courseCoordinatorId: z
    .string()
    .uuid("Invalid course coordinator ID")
    .optional(),
  moduleCoordinatorId: z
    .string()
    .uuid("Invalid module coordinator ID")
    .optional(),
  programCoordinatorId: z
    .string()
    .uuid("Invalid program coordinator ID")
    .optional(),
});

/**
 * Get eligible coordinators input schema
 */
export const getEligibleCoordinatorsInputSchema = z.object({
  role: z.enum(roleArray),
  excludeCourseId: z.string().uuid().optional(),
});
