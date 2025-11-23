/**
 * Question Approval Router
 *
 * Handles multi-level question approval workflow:
 * - Course Coordinator -> Module Coordinator -> Program Coordinator -> COE
 * - Rejection with feedback at any stage
 * - Question editing and resubmission
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, coordinatorProcedure } from "@/trpc/init";
import { QuestionService } from "@/services/question.service";
import { prisma } from "@/lib/prisma";

/**
 * Input schemas
 */
const approveQuestionSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
});

const rejectQuestionSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
  remarks: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters"),
});

const getQuestionsForReviewSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  status: z
    .enum([
      "CREATED_BY_COURSE_COORDINATOR",
      "UNDER_REVIEW_FROM_MODULE_COORDINATOR",
      "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR",
      "ACCEPTED",
      "REJECTED",
    ])
    .optional(),
  unit: z.number().int().min(1).optional(),
  bloomLevel: z
    .enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"])
    .optional(),
  difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
});

const updateQuestionSchema = z.object({
  id: z.string().uuid("Invalid question ID"),
  question: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .optional(),
  answer: z
    .string()
    .min(10, "Answer must be at least 10 characters")
    .optional(),
  questionType: z
    .enum(["REMEMBER", "ANALYZE", "UNDERSTAND", "APPLY", "EVALUATE", "CREATE"])
    .optional(),
  difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  bloomLevel: z
    .enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"])
    .optional(),
  generationType: z
    .enum(["DIRECT", "INDIRECT", "SCENARIO_BASED", "PROBLEM_BASED"])
    .optional(),
  marks: z.enum(["TWO", "EIGHT", "SIXTEEN"]).optional(),
  unit: z.number().int().min(1).optional(),
});

const getQuestionFeedbackSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
});

export const questionApprovalRouter = createTRPCRouter({
  /**
   * Course Coordinator approves their own questions
   * Moves to Module Coordinator review
   */
  approveAsCourseCoordinator: coordinatorProcedure
    .input(approveQuestionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the coordinator has access to this question's course
        const question = await prisma.question.findUnique({
          where: { id: input.questionId },
          include: {
            course: {
              select: {
                courseCoordinatorId: true,
              },
            },
          },
        });

        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Question not found.",
          });
        }

        if (question.course.courseCoordinatorId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to approve this question.",
          });
        }

        if (question.status !== "CREATED_BY_COURSE_COORDINATOR") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Question is not in the correct state for Course Coordinator approval.",
          });
        }

        const result = await QuestionService.approveQuestionByCourseCoordinator(
          input.questionId
        );

        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to approve question.",
        });
      }
    }),

  /**
   * Module Coordinator approves questions
   * Moves to Program Coordinator review
   */
  approveAsModuleCoordinator: coordinatorProcedure
    .input(approveQuestionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const question = await prisma.question.findUnique({
          where: { id: input.questionId },
          include: {
            course: {
              select: {
                moduleCoordinatorId: true,
              },
            },
          },
        });

        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Question not found.",
          });
        }

        if (question.course.moduleCoordinatorId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to approve this question.",
          });
        }

        if (question.status !== "UNDER_REVIEW_FROM_MODULE_COORDINATOR") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Question is not in the correct state for Module Coordinator approval.",
          });
        }

        const result = await QuestionService.approveQuestionByModuleCoordinator(
          input.questionId
        );

        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to approve question.",
        });
      }
    }),

  /**
   * Program Coordinator gives final approval
   * Question becomes ACCEPTED and finalized
   */
  approveAsProgramCoordinator: coordinatorProcedure
    .input(approveQuestionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const question = await prisma.question.findUnique({
          where: { id: input.questionId },
          include: {
            course: {
              select: {
                programCoordinatorId: true,
              },
            },
          },
        });

        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Question not found.",
          });
        }

        if (question.course.programCoordinatorId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to approve this question.",
          });
        }

        if (question.status !== "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Question is not in the correct state for Program Coordinator approval.",
          });
        }

        const result =
          await QuestionService.approveQuestionByProgramCoordinator(
            input.questionId
          );

        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to approve question.",
        });
      }
    }),

  /**
   * Reject question with feedback
   * Any coordinator can reject
   */
  rejectQuestion: coordinatorProcedure
    .input(rejectQuestionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const question = await prisma.question.findUnique({
          where: { id: input.questionId },
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
            message: "Question not found.",
          });
        }

        // Determine which role is rejecting
        let rejectedByRole: "CC" | "MC" | "PC";
        if (question.course.courseCoordinatorId === ctx.user.id) {
          rejectedByRole = "CC";
        } else if (question.course.moduleCoordinatorId === ctx.user.id) {
          rejectedByRole = "MC";
        } else if (question.course.programCoordinatorId === ctx.user.id) {
          rejectedByRole = "PC";
        } else {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to reject this question.",
          });
        }

        const result = await QuestionService.rejectQuestion(
          input.questionId,
          input.remarks,
          rejectedByRole
        );

        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to reject question.",
        });
      }
    }),

  /**
   * Get questions for review based on coordinator role
   */
  getQuestionsForReview: coordinatorProcedure
    .input(getQuestionsForReviewSchema)
    .query(async ({ input, ctx }) => {
      try {
        const result = await QuestionService.getQuestionsByCourse(
          input.courseId,
          {
            status: input.status,
            unit: input.unit,
            bloomLevel: input.bloomLevel,
            difficultyLevel: input.difficultyLevel,
          }
        );

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch questions.",
        });
      }
    }),

  /**
   * Update question (Course Coordinator only, for rejected questions)
   */
  updateQuestion: coordinatorProcedure
    .input(updateQuestionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const question = await prisma.question.findUnique({
          where: { id: input.id },
          include: {
            course: {
              select: {
                courseCoordinatorId: true,
              },
            },
          },
        });

        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Question not found.",
          });
        }

        if (question.course.courseCoordinatorId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the Course Coordinator can edit questions.",
          });
        }

        const result = await QuestionService.updateQuestion(input);

        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update question.",
        });
      }
    }),

  /**
   * Get question feedback history
   */
  getQuestionFeedback: coordinatorProcedure
    .input(getQuestionFeedbackSchema)
    .query(async ({ input }) => {
      try {
        const feedback = await prisma.question_Feedback.findMany({
          where: { questionId: input.questionId },
          orderBy: { createdAt: "desc" },
        });

        return {
          success: true,
          data: feedback,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch question feedback.",
        });
      }
    }),

  /**
   * Get question statistics for a course
   */
  getQuestionStatistics: coordinatorProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        const [
          total,
          created,
          underReviewMC,
          underReviewPC,
          accepted,
          rejected,
        ] = await Promise.all([
          prisma.question.count({ where: { courseId: input.courseId } }),
          prisma.question.count({
            where: {
              courseId: input.courseId,
              status: "CREATED_BY_COURSE_COORDINATOR",
            },
          }),
          prisma.question.count({
            where: {
              courseId: input.courseId,
              status: "UNDER_REVIEW_FROM_MODULE_COORDINATOR",
            },
          }),
          prisma.question.count({
            where: {
              courseId: input.courseId,
              status: "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR",
            },
          }),
          prisma.question.count({
            where: { courseId: input.courseId, status: "ACCEPTED" },
          }),
          prisma.question.count({
            where: { courseId: input.courseId, status: "REJECTED" },
          }),
        ]);

        return {
          success: true,
          data: {
            total,
            created,
            underReviewMC,
            underReviewPC,
            accepted,
            rejected,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch question statistics.",
        });
      }
    }),
});
