import { z } from "zod";
import {
  createTRPCRouter,
  coordinatorProcedure,
} from "../init";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const questionRouter = createTRPCRouter({
  // Get questions for a course
  getCourseQuestions: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z
          .enum([
            "CREATED_BY_COURSE_COORDINATOR",
            "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR",
            "UNDER_REVIEW_FROM_MODULE_COORDINATOR",
            "ACCEPTED",
            "REJECTED",
            "all",
          ])
          .optional(),
        questionType: z
          .enum(["STRAIGHTFORWARD", "PROBLEM_BASED", "SCENARIO_BASED", "all"])
          .optional(),
        unit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { courseId, page, limit, status, questionType, unit } = input;

      // Verify user has access to this course
      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          OR: [
            { courseCoordinatorId: ctx.session.user.id },
            { moduleCoordinatorId: ctx.session.user.id },
            { programCoordinatorId: ctx.session.user.id },
          ],
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this course",
        });
      }

      // Build where clause
      const where: Record<string, unknown> = {
        courseId,
      };

      if (status && status !== "all") {
        where.status = status;
      }

      if (questionType && questionType !== "all") {
        where.questionType = questionType;
      }

      if (unit) {
        where.unit = unit;
      }

      // Get questions with pagination
      const questions = await prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalCount = await prisma.question.count({ where });

      return {
        questions: questions.map((q) => ({
          id: q.id,
          questionText: q.question,
          questionType: q.questionType,
          bloomLevel: q.bloomLevel,
          difficultyLevel: q.difficultyLevel,
          marks: q.marks,
          unit: q.unit,
          topic: q.topic || "General",
          status: q.status,
          options: q.optionA
            ? {
                a: q.optionA,
                b: q.optionB || "",
                c: q.optionC || "",
                d: q.optionD || "",
              }
            : undefined,
          correctAnswer: q.correctAnswer,
          sampleAnswer: q.answer || "",
          createdAt: q.createdAt,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      };
    }),

  // Update a question
  updateQuestion: coordinatorProcedure
    .input(
      z.object({
        questionId: z.string(),
        questionText: z.string().optional(),
        sampleAnswer: z.string().optional(),
        topic: z.string().optional(),
        marks: z.enum(["TWO_MARKS", "EIGHT_MARKS", "SIXTEEN_MARKS"]).optional(),
        questionType: z
          .enum(["STRAIGHTFORWARD", "PROBLEM_BASED", "SCENARIO_BASED"])
          .optional(),
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
        difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
        options: z
          .object({
            a: z.string(),
            b: z.string(),
            c: z.string(),
            d: z.string(),
          })
          .optional(),
        correctAnswer: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const {
        questionId,
        questionText,
        sampleAnswer,
        topic,
        marks,
        questionType,
        bloomLevel,
        difficultyLevel,
        options,
        correctAnswer,
      } = input;

      // Get the question and verify access
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { course: true },
      });

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      // Check if user has access to the course
      const hasAccess =
        question.course.courseCoordinatorId === ctx.session.user.id ||
        question.course.moduleCoordinatorId === ctx.session.user.id ||
        question.course.programCoordinatorId === ctx.session.user.id ||
        ctx.session.user.role === "ADMIN";

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this question",
        });
      }

      // Only allow editing if the question is in draft status
      if (question.status !== "CREATED_BY_COURSE_COORDINATOR") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only edit questions in draft status",
        });
      }

      // Update the question
      const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
          ...(questionText && { question: questionText }),
          ...(sampleAnswer && { answer: sampleAnswer }),
          ...(topic && { topic }),
          ...(marks && { marks }),
          ...(questionType && { questionType }),
          ...(bloomLevel && { bloomLevel }),
          ...(difficultyLevel && { difficultyLevel }),
          ...(options && {
            optionA: options.a,
            optionB: options.b,
            optionC: options.c,
            optionD: options.d,
          }),
          ...(correctAnswer && { correctAnswer }),
        },
      });

      return {
        id: updatedQuestion.id,
        message: "Question updated successfully",
      };
    }),

  // Approve a question (change status to accepted)
  approveQuestion: coordinatorProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { questionId } = input;

      // Get the question and verify access
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { course: true },
      });

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      // Check if user has access to the course
      const hasAccess =
        question.course.courseCoordinatorId === ctx.session.user.id ||
        question.course.moduleCoordinatorId === ctx.session.user.id ||
        question.course.programCoordinatorId === ctx.session.user.id ||
        ctx.session.user.role === "ADMIN";

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to approve this question",
        });
      }

      // Update the question status
      await prisma.question.update({
        where: { id: questionId },
        data: {
          status: "ACCEPTED",
        },
      });

      return {
        id: questionId,
        message: "Question approved successfully",
      };
    }),

  // Reject a question
  rejectQuestion: coordinatorProcedure
    .input(
      z.object({
        questionId: z.string(),
        reason: z.string().min(1, "Rejection reason is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { questionId, reason } = input;

      // Get the question and verify access
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { course: true },
      });

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      // Check if user has access to the course
      const hasAccess =
        question.course.courseCoordinatorId === ctx.session.user.id ||
        question.course.moduleCoordinatorId === ctx.session.user.id ||
        question.course.programCoordinatorId === ctx.session.user.id ||
        ctx.session.user.role === "ADMIN";

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to reject this question",
        });
      }

      // Update the question status and add rejection reason
      await prisma.question.update({
        where: { id: questionId },
        data: {
          status: "REJECTED",
          answer: question.answer
            ? `${question.answer}\n\n[REJECTED: ${reason}]`
            : `[REJECTED: ${reason}]`,
        },
      });

      return {
        id: questionId,
        message: "Question rejected",
      };
    }),

  // Submit multiple questions for review
  submitQuestionsForReview: coordinatorProcedure
    .input(
      z.object({
        questionIds: z
          .array(z.string())
          .min(1, "At least one question must be selected"),
        reviewType: z
          .enum(["PROGRAM_COORDINATOR", "MODULE_COORDINATOR"])
          .default("PROGRAM_COORDINATOR"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { questionIds, reviewType } = input;

      // Get all questions and verify access
      const questions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
        },
        include: { course: true },
      });

      if (questions.length !== questionIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Some questions were not found",
        });
      }

      // Verify access to all questions
      const hasAccess = questions.every(
        (question) =>
          question.course.courseCoordinatorId === ctx.session.user.id ||
          question.course.moduleCoordinatorId === ctx.session.user.id ||
          question.course.programCoordinatorId === ctx.session.user.id ||
          ctx.session.user.role === "ADMIN"
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to submit some of these questions",
        });
      }

      // Check that all questions are in draft status
      const invalidQuestions = questions.filter(
        (q) => q.status !== "CREATED_BY_COURSE_COORDINATOR"
      );
      if (invalidQuestions.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only questions in draft status can be submitted for review",
        });
      }

      // Update the status of all questions
      const newStatus =
        reviewType === "PROGRAM_COORDINATOR"
          ? "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR"
          : "UNDER_REVIEW_FROM_MODULE_COORDINATOR";

      await prisma.question.updateMany({
        where: {
          id: { in: questionIds },
        },
        data: {
          status: newStatus,
        },
      });

      return {
        submittedCount: questionIds.length,
        message: `${questionIds.length} questions submitted for ${reviewType
          .toLowerCase()
          .replace("_", " ")} review`,
      };
    }),

  // Get question statistics for a course
  getCourseQuestionStats: coordinatorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { courseId } = input;

      // Verify user has access to this course
      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          OR: [
            { courseCoordinatorId: ctx.session.user.id },
            { moduleCoordinatorId: ctx.session.user.id },
            { programCoordinatorId: ctx.session.user.id },
          ],
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this course",
        });
      }

      // Get statistics
      const stats = await prisma.question.groupBy({
        by: ["status"],
        where: { courseId },
        _count: { id: true },
      });

      const typeStats = await prisma.question.groupBy({
        by: ["questionType"],
        where: { courseId },
        _count: { id: true },
      });

      const marksStats = await prisma.question.groupBy({
        by: ["marks"],
        where: { courseId },
        _count: { id: true },
      });

      return {
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        byType: typeStats.reduce((acc, stat) => {
          acc[stat.questionType] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        byMarks: marksStats.reduce((acc, stat) => {
          acc[stat.marks] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        total: await prisma.question.count({ where: { courseId } }),
      };
    }),

  // Delete a question
  deleteQuestion: coordinatorProcedure
    .input(
      z.object({
        questionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { questionId } = input;

      // First, verify the question exists and user has access
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          course: true,
        },
      });

      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      // Verify user has access to this course
      const hasAccess =
        question.course.courseCoordinatorId === ctx.session.user.id ||
        question.course.moduleCoordinatorId === ctx.session.user.id ||
        question.course.programCoordinatorId === ctx.session.user.id;

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to delete this question",
        });
      }

      // Delete the question
      await prisma.question.delete({
        where: { id: questionId },
      });

      return { success: true };
    }),

  // Delete multiple questions
  deleteMultipleQuestions: coordinatorProcedure
    .input(
      z.object({
        questionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { questionIds } = input;

      if (questionIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No questions selected for deletion",
        });
      }

      // First, verify all questions exist and user has access
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: {
          course: true,
        },
      });

      if (questions.length !== questionIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Some questions not found",
        });
      }

      // Verify user has access to all courses
      for (const question of questions) {
        const hasAccess =
          question.course.courseCoordinatorId === ctx.session.user.id ||
          question.course.moduleCoordinatorId === ctx.session.user.id ||
          question.course.programCoordinatorId === ctx.session.user.id;

        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You don't have access to delete question in course ${question.course.courseName}`,
          });
        }
      }

      // Delete all questions
      const result = await prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });

      return { deletedCount: result.count };
    }),
});
