/**
 * Pattern-specific validation schemas
 */

import { z } from "zod";
import { ExamType, SemesterType } from "@/generated/prisma";

export const examTypeArray = Object.values(ExamType) as [
  ExamType,
  ...ExamType[]
];
export const semesterTypeArray = Object.values(SemesterType) as [
  SemesterType,
  ...SemesterType[]
];

const bloomLevelEnum = z.enum([
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
  "EVALUATE",
  "CREATE",
]);

/**
 * Sub-question schema
 */
const subQuestionSchema = z.object({
  label: z.string().min(1, "Sub-question label is required"), // 'a', 'b', 'c'
  marks: z.number().int().min(1, "Marks must be positive"),
  bloomLevel: bloomLevelEnum,
  units: z
    .array(z.number().int().min(1))
    .min(1, "At least one unit must be selected"),
  description: z.string().optional(),
});

/**
 * Part A Question Slot Schema
 */
const partAQuestionSlotSchema = z.object({
  questionNumber: z.number().int().min(1),
  marks: z
    .number()
    .int()
    .refine((val) => val === 2, {
      message: "Part A questions must be 2 marks each",
    }),
  bloomLevel: bloomLevelEnum,
  units: z
    .array(z.number().int().min(1))
    .min(1, "At least one unit must be selected"),
  description: z.string().optional(),
});

/**
 * Part B Question Slot Schema
 */
const partBQuestionSlotSchema = z.object({
  questionNumber: z.number().int().min(1),
  marks: z
    .number()
    .int()
    .refine((val) => val === 8 || val === 16, {
      message: "Part B questions must be 8 or 16 marks",
    }),
  bloomLevel: bloomLevelEnum.optional(),
  units: z.array(z.number().int().min(1)).optional(),
  hasSubQuestions: z.boolean(),
  subQuestions: z.array(subQuestionSchema).optional(),
  description: z.string().optional(),
});

/**
 * OR Option Schema
 */
const orOptionSchema = z.object({
  optionLabel: z.string().min(1), // 'A' or 'B'
  questionSlot: partBQuestionSlotSchema,
});

/**
 * Part B Question Group Schema (with OR options)
 */
const partBQuestionGroupSchema = z.object({
  groupNumber: z.number().int().min(1),
  hasOR: z.boolean(),
  options: z.array(orOptionSchema).optional(),
  questionSlot: partBQuestionSlotSchema.optional(),
});

/**
 * Create Pattern Input Schema
 */
export const createPatternSchema = z
  .object({
    courseId: z.string().uuid("Invalid course ID"),
    patternName: z
      .string()
      .min(3, "Pattern name must be at least 3 characters"),
    academicYear: z
      .string()
      .regex(/^\d{4}-\d{4}$/, "Academic year must be in format YYYY-YYYY"),
    semesterType: z.enum(semesterTypeArray),
    examType: z.enum(examTypeArray),
    totalMarks: z
      .number()
      .int()
      .refine((val) => val === 50 || val === 100, {
        message: "Total marks must be 50 (Sessional) or 100 (End Semester)",
      }),
    duration: z.number().int().min(30, "Duration must be at least 30 minutes"),
    partAStructure: z
      .array(partAQuestionSlotSchema)
      .min(1, "Part A must have at least one question"),
    partBStructure: z
      .array(partBQuestionGroupSchema)
      .min(1, "Part B must have at least one question"),
    instructions: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate marks based on exam type
      if (data.examType === "END_SEMESTER") {
        return data.totalMarks === 100;
      } else {
        return data.totalMarks === 50;
      }
    },
    {
      message:
        "Total marks must match exam type (50 for Sessional, 100 for End Semester)",
      path: ["totalMarks"],
    }
  )
  .refine(
    (data) => {
      // Calculate Part A total
      const partATotal = data.partAStructure.reduce(
        (sum, q) => sum + q.marks,
        0
      );

      if (data.examType === "END_SEMESTER") {
        return partATotal === 20;
      } else {
        return partATotal === 10;
      }
    },
    {
      message: "Part A must be 20 marks (End Sem) or 10 marks (Sessional)",
      path: ["partAStructure"],
    }
  )
  .refine(
    (data) => {
      // Calculate Part B total
      let partBTotal = 0;
      for (const group of data.partBStructure) {
        if (group.hasOR && group.options && group.options.length > 0) {
          // For OR options, count one option's marks
          partBTotal += group.options[0].questionSlot.marks;
        } else if (group.questionSlot) {
          partBTotal += group.questionSlot.marks;
        }
      }

      if (data.examType === "END_SEMESTER") {
        return partBTotal === 80;
      } else {
        return partBTotal === 40;
      }
    },
    {
      message: "Part B must be 80 marks (End Sem) or 40 marks (Sessional)",
      path: ["partBStructure"],
    }
  )
  .refine(
    (data) => {
      // Validate OR options based on exam type
      if (data.examType === "END_SEMESTER") {
        // All Part B groups must have OR options
        return data.partBStructure.every(
          (group) => group.hasOR && group.options && group.options.length >= 2
        );
      } else {
        // Sessional exams should NOT have OR options
        return data.partBStructure.every(
          (group) => !group.hasOR && group.questionSlot
        );
      }
    },
    {
      message:
        "End Semester must have OR options; Sessional must not have OR options",
      path: ["partBStructure"],
    }
  );

/**
 * Update Pattern Input Schema
 */
export const updatePatternSchema = z.object({
  id: z.string().uuid("Invalid pattern ID"),
  patternName: z.string().min(3).optional(),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/)
    .optional(),
  duration: z.number().int().min(30).optional(),
  partAStructure: z.array(partAQuestionSlotSchema).optional(),
  partBStructure: z.array(partBQuestionGroupSchema).optional(),
  instructions: z.string().optional(),
});

/**
 * Get Pattern by ID Schema
 */
export const getPatternByIdSchema = z.object({
  id: z.string().uuid("Invalid pattern ID").optional(),
  patternId: z.string().uuid("Invalid pattern ID").optional(),
}).refine((data) => data.id || data.patternId, {
  message: "Either id or patternId must be provided",
});

/**
 * Get Patterns List Schema
 */
export const getPatternsSchema = z.object({
  courseId: z.string().uuid("Invalid course ID").optional(),
  examType: z.enum(examTypeArray).optional(),
  semesterType: z.enum(semesterTypeArray).optional(),
  status: z
    .enum([
      "DRAFT",
      "PENDING_MC_APPROVAL",
      "PENDING_PC_APPROVAL",
      "PENDING_COE_APPROVAL",
      "APPROVED",
      "REJECTED",
    ])
    .optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Approve/Reject Pattern Schema
 */
export const approvePatternSchema = z.object({
  patternId: z.string().uuid("Invalid pattern ID"),
  remarks: z
    .string()
    .min(10, "Remarks must be at least 10 characters")
    .optional(),
});

export const rejectPatternSchema = z.object({
  patternId: z.string().uuid("Invalid pattern ID"),
  remarks: z.string().min(10, "Remarks must be at least 10 characters"),
});

/**
 * Delete Pattern Schema
 */
export const deletePatternSchema = z.object({
  id: z.string().uuid("Invalid pattern ID"),
});
