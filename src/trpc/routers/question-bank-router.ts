import { prisma } from "@/lib/prisma";
import { coordinatorProcedure, createTRPCRouter } from "../init";
import * as z from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@/generated/prisma";

/**
 * Question Bank Router
 * Handles viewing, filtering, editing, approving, and deleting questions
 */
export const questionBankRouter = createTRPCRouter({
  /**
   * Get questions with advanced filtering and pagination
   */
  getQuestions: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        unit: z.number().optional(),
        difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
        bloomLevel: z
          .enum([
            "REMEMBER",
            "UNDERSTAND",
            "APPLY",
            "ANALYZE",
            "EVALUATE",
            "CREATE",
          ])
          .optional(),
        questionType: z
          .enum(["DIRECT", "INDIRECT", "SCENARIO_BASED", "PROBLEM_BASED"])
          .optional(),
        marks: z.enum(["TWO", "EIGHT", "SIXTEEN"]).optional(),
        approvalStatus: z
          .enum([
            "PENDING",
            "CC_APPROVED",
            "MC_APPROVED",
            "PC_APPROVED",
            "FULLY_APPROVED",
          ])
          .optional(),
        searchQuery: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
        sortBy: z
          .enum(["createdAt", "updatedAt", "unit", "marks"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const {
        courseId,
        unit,
        difficultyLevel,
        bloomLevel,
        questionType,
        marks,
        approvalStatus,
        searchQuery,
        page,
        pageSize,
        sortBy,
        sortOrder,
      } = input;

      // Build where clause dynamically
      const where: Prisma.QuestionWhereInput = {
        courseId,
      };

      if (unit !== undefined) {
        where.unit = unit;
      }

      if (difficultyLevel) {
        where.difficultyLevel = difficultyLevel;
      }

      if (bloomLevel) {
        where.bloomLevel = bloomLevel;
      }

      if (questionType) {
        where.generationType = questionType;
      }

      if (marks) {
        where.marks = marks;
      }

      // Approval status filter
      if (approvalStatus) {
        switch (approvalStatus) {
          case "PENDING":
            where.reviewedByCc = false;
            break;
          case "CC_APPROVED":
            where.reviewedByCc = true;
            where.reviewedByMc = false;
            break;
          case "MC_APPROVED":
            where.reviewedByCc = true;
            where.reviewedByMc = true;
            where.reviewedByPc = false;
            break;
          case "PC_APPROVED":
            where.reviewedByCc = true;
            where.reviewedByMc = true;
            where.reviewedByPc = true;
            where.isFinalized = false;
            break;
          case "FULLY_APPROVED":
            where.reviewedByCc = true;
            where.reviewedByMc = true;
            where.reviewedByPc = true;
            where.isFinalized = true;
            break;
        }
      }

      // Search query (search in question and answer text)
      if (searchQuery && searchQuery.trim()) {
        where.OR = [
          { question: { contains: searchQuery, mode: "insensitive" } },
          { answer: { contains: searchQuery, mode: "insensitive" } },
        ];
      }

      // Get total count for pagination
      const totalCount = await prisma.question.count({ where });

      // Calculate skip value
      const skip = (page - 1) * pageSize;

      // Fetch questions with pagination
      const questions = await prisma.question.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          course: {
            select: {
              name: true,
              course_code: true,
            },
          },
          courseMaterial: {
            select: {
              title: true,
              unit: true,
            },
          },
        },
      });

      // Calculate approval status for each question
      const questionsWithStatus = questions.map((q) => {
        let approvalStatusLabel = "PENDING";

        if (q.isFinalized) {
          approvalStatusLabel = "FULLY_APPROVED";
        } else if (q.reviewedByCc && q.reviewedByMc && q.reviewedByPc) {
          approvalStatusLabel = "PC_APPROVED";
        } else if (q.reviewedByCc && q.reviewedByMc) {
          approvalStatusLabel = "MC_APPROVED";
        } else if (q.reviewedByCc) {
          approvalStatusLabel = "CC_APPROVED";
        }

        return {
          ...q,
          approvalStatusLabel,
        };
      });

      return {
        questions: questionsWithStatus,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };
    }),

  /**
   * Get units for a course (for filter dropdown)
   */
  getCourseUnits: coordinatorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input }) => {
      const units = await prisma.question.findMany({
        where: { courseId: input.courseId },
        select: { unit: true },
        distinct: ["unit"],
        orderBy: { unit: "asc" },
      });

      return units.map((u) => u.unit);
    }),

  /**
   * Update a question (edit)
   */
  updateQuestion: coordinatorProcedure
    .input(
      z.object({
        questionId: z.string(),
        question: z.string().min(10, "Question must be at least 10 characters"),
        answer: z.string().min(10, "Answer must be at least 10 characters"),
        marks: z.enum(["TWO", "EIGHT", "SIXTEEN"]),
        difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]),
        bloomLevel: z.enum([
          "REMEMBER",
          "UNDERSTAND",
          "APPLY",
          "ANALYZE",
          "EVALUATE",
          "CREATE",
        ]),
        questionType: z.enum([
          "DIRECT",
          "INDIRECT",
          "SCENARIO_BASED",
          "PROBLEM_BASED",
        ]),
        unit: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const { questionId, ...updateData } = input;

      // Verify question exists and belongs to an accessible course
      const existingQuestion = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          course: {
            select: {
              courseCoordinatorId: true,
              moduleCoordinatorId: true,
              programCoordinatorId: true,
            },
          },
        },
      });

      if (!existingQuestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      // Check user permission
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      const isAuthorized =
        existingQuestion.course.courseCoordinatorId === userId ||
        existingQuestion.course.moduleCoordinatorId === userId ||
        existingQuestion.course.programCoordinatorId === userId ||
        userRole === "CONTROLLER_OF_EXAMINATION" ||
        userRole === "ADMIN";

      if (!isAuthorized) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this question",
        });
      }

      // Map questionType to generationType
      const { questionType, ...restData } = updateData;

      // Update the question
      const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
          ...restData,
          generationType: questionType,
        },
      });

      return {
        success: true,
        question: updatedQuestion,
      };
    }),

  /**
   * Delete a question
   */
  deleteQuestion: coordinatorProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const { questionId } = input;

      // Verify question exists and check permissions
      const existingQuestion = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          course: {
            select: {
              courseCoordinatorId: true,
              moduleCoordinatorId: true,
              programCoordinatorId: true,
            },
          },
        },
      });

      if (!existingQuestion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      // Check user permission
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      const isAuthorized =
        existingQuestion.course.courseCoordinatorId === userId ||
        existingQuestion.course.moduleCoordinatorId === userId ||
        existingQuestion.course.programCoordinatorId === userId ||
        userRole === "CONTROLLER_OF_EXAMINATION" ||
        userRole === "ADMIN";

      if (!isAuthorized) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this question",
        });
      }

      // Delete the question
      await prisma.question.delete({
        where: { id: questionId },
      });

      return {
        success: true,
        message: "Question deleted successfully",
      };
    }),

  /**
   * Approve a single question based on user role
   */
  approveQuestion: coordinatorProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const { questionId } = input;
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Get the question and verify access
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          course: {
            select: {
              courseCoordinatorId: true,
              moduleCoordinatorId: true,
              programCoordinatorId: true,
            },
          },
        },
      });

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      // Determine what to approve based on user role
      let updateData: Prisma.QuestionUpdateInput = {};

      if (
        userRole === "COURSE_COORDINATOR" &&
        question.course.courseCoordinatorId === userId
      ) {
        updateData = {
          reviewedByCc: true,
          ccApprovedAt: new Date(),
        };
      } else if (
        userRole === "MODULE_COORDINATOR" &&
        question.course.moduleCoordinatorId === userId
      ) {
        if (!question.reviewedByCc) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Question must be approved by Course Coordinator first",
          });
        }
        updateData = {
          reviewedByMc: true,
          mcApprovedAt: new Date(),
        };
      } else if (
        userRole === "PROGRAM_COORDINATOR" &&
        question.course.programCoordinatorId === userId
      ) {
        if (!question.reviewedByCc || !question.reviewedByMc) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Question must be approved by CC and MC first",
          });
        }
        updateData = {
          reviewedByPc: true,
          pcApprovedAt: new Date(),
        };
      } else if (userRole === "CONTROLLER_OF_EXAMINATION") {
        if (
          !question.reviewedByCc ||
          !question.reviewedByMc ||
          !question.reviewedByPc
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Question must be approved by all coordinators first",
          });
        }
        updateData = {
          isFinalized: true,
        };
      } else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to approve this question",
        });
      }

      // Update the question
      const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: updateData,
      });

      return {
        success: true,
        question: updatedQuestion,
      };
    }),

  /**
   * Bulk approve questions
   */
  bulkApprove: coordinatorProcedure
    .input(z.object({ questionIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const { questionIds } = input;
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      if (questionIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No questions selected",
        });
      }

      // Fetch all questions to verify access and status
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: {
          course: {
            select: {
              courseCoordinatorId: true,
              moduleCoordinatorId: true,
              programCoordinatorId: true,
            },
          },
        },
      });

      if (questions.length !== questionIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Some questions not found",
        });
      }

      // Determine update based on role
      let updateData: Prisma.QuestionUpdateInput = {};
      const validQuestions: string[] = [];

      for (const question of questions) {
        let isValid = false;

        if (
          userRole === "COURSE_COORDINATOR" &&
          question.course.courseCoordinatorId === userId
        ) {
          isValid = true;
        } else if (
          userRole === "MODULE_COORDINATOR" &&
          question.course.moduleCoordinatorId === userId
        ) {
          isValid = question.reviewedByCc;
        } else if (
          userRole === "PROGRAM_COORDINATOR" &&
          question.course.programCoordinatorId === userId
        ) {
          isValid = question.reviewedByCc && question.reviewedByMc;
        } else if (userRole === "CONTROLLER_OF_EXAMINATION") {
          isValid =
            question.reviewedByCc &&
            question.reviewedByMc &&
            question.reviewedByPc;
        }

        if (isValid) {
          validQuestions.push(question.id);
        }
      }

      if (validQuestions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid questions to approve",
        });
      }

      // Set update data based on role
      if (userRole === "COURSE_COORDINATOR") {
        updateData = {
          reviewedByCc: true,
          ccApprovedAt: new Date(),
        };
      } else if (userRole === "MODULE_COORDINATOR") {
        updateData = {
          reviewedByMc: true,
          mcApprovedAt: new Date(),
        };
      } else if (userRole === "PROGRAM_COORDINATOR") {
        updateData = {
          reviewedByPc: true,
          pcApprovedAt: new Date(),
        };
      } else if (userRole === "CONTROLLER_OF_EXAMINATION") {
        updateData = {
          isFinalized: true,
        };
      }

      // Bulk update
      const result = await prisma.question.updateMany({
        where: { id: { in: validQuestions } },
        data: updateData,
      });

      return {
        success: true,
        approvedCount: result.count,
        skippedCount: questionIds.length - validQuestions.length,
      };
    }),

  /**
   * Get question statistics for a course
   */
  getQuestionStats: coordinatorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input }) => {
      const { courseId } = input;

      // Get total counts
      const totalQuestions = await prisma.question.count({
        where: { courseId },
      });

      const pendingQuestions = await prisma.question.count({
        where: { courseId, reviewedByCc: false },
      });

      const ccApproved = await prisma.question.count({
        where: { courseId, reviewedByCc: true, reviewedByMc: false },
      });

      const mcApproved = await prisma.question.count({
        where: {
          courseId,
          reviewedByCc: true,
          reviewedByMc: true,
          reviewedByPc: false,
        },
      });

      const pcApproved = await prisma.question.count({
        where: {
          courseId,
          reviewedByCc: true,
          reviewedByMc: true,
          reviewedByPc: true,
          isFinalized: false,
        },
      });

      const fullyApproved = await prisma.question.count({
        where: { courseId, isFinalized: true },
      });

      // Get breakdown by difficulty
      const byDifficulty = await prisma.question.groupBy({
        by: ["difficultyLevel"],
        where: { courseId },
        _count: true,
      });

      // Get breakdown by Bloom level
      const byBloomLevel = await prisma.question.groupBy({
        by: ["bloomLevel"],
        where: { courseId },
        _count: true,
      });

      // Get breakdown by marks
      const byMarks = await prisma.question.groupBy({
        by: ["marks"],
        where: { courseId },
        _count: true,
      });

      return {
        total: totalQuestions,
        pending: pendingQuestions,
        ccApproved,
        mcApproved,
        pcApproved,
        fullyApproved,
        byDifficulty,
        byBloomLevel,
        byMarks,
      };
    }),
});
