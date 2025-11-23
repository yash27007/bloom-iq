/**
 * Validation schemas for course material operations
 */

import { z } from "zod";

/**
 * Upload course material input schema
 */
export const uploadCourseMaterialInputSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z.string().min(1, "Title is required"),
  filename: z.string().min(1, "Filename is required"),
  materialType: z.enum(["SYLLABUS", "UNIT_PDF"]),
  unit: z.number().int().min(0).default(0),
});

/**
 * Delete course material input schema
 */
export const deleteCourseMaterialInputSchema = z.object({
  materialId: z.string().uuid("Invalid material ID"),
});

/**
 * Generate questions input schema
 */
export const generateQuestionsInputSchema = z.object({
  materialId: z.string().uuid("Invalid material ID"),
  courseId: z.string().uuid("Invalid course ID"),
  unit: z.number().int().min(1),
  questionCounts: z.object({
    easy: z.number().int().min(0).default(0),
    medium: z.number().int().min(0).default(0),
    hard: z.number().int().min(0).default(0),
  }),
  bloomLevels: z.object({
    remember: z.number().int().min(0).default(0),
    understand: z.number().int().min(0).default(0),
    apply: z.number().int().min(0).default(0),
    analyze: z.number().int().min(0).default(0),
    evaluate: z.number().int().min(0).default(0),
    create: z.number().int().min(0).default(0),
  }),
  questionTypes: z.object({
    direct: z.number().int().min(0).default(0),
    indirect: z.number().int().min(0).default(0),
    scenarioBased: z.number().int().min(0).default(0),
    problemBased: z.number().int().min(0).default(0),
  }),
});
