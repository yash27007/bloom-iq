import { prisma } from "@/lib/prisma";
import {
  coordinatorProcedure,
  courseCoordinatorProcedure,
  createTRPCRouter,
  controllerOfExamination,
} from "../init";
import {
  createPatternSchema,
  updatePatternSchema,
  getPatternByIdSchema,
  getPatternsSchema,
  approvePatternSchema,
  rejectPatternSchema,
  deletePatternSchema,
  examTypeArray,
  semesterTypeArray,
} from "@/validators/pattern.validators";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@/generated/prisma";
import { z } from "zod";

/**
 * Pattern Router
 * Handles question paper pattern creation, approval workflow, and management
 */
export const patternRouter = createTRPCRouter({
  /**
   * Create a new question paper pattern (Course Coordinator only)
   */
  createPattern: courseCoordinatorProcedure
    .input(createPatternSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Only Course Coordinator can create patterns
      if (userRole !== "COURSE_COORDINATOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Course Coordinators can create patterns",
        });
      }

      // Verify user is the course coordinator for this course
      const course = await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { courseCoordinatorId: true },
      });

      if (!course || course.courseCoordinatorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not the coordinator for this course",
        });
      }

      // Create the pattern
      const pattern = await prisma.questionPaperPattern.create({
        data: {
          courseId: input.courseId,
          patternName: input.patternName,
          academicYear: input.academicYear,
          semesterType: input.semesterType,
          examType: input.examType,
          totalMarks: input.totalMarks,
          duration: input.duration,
          partAStructure: input.partAStructure as Prisma.InputJsonValue,
          partBStructure: input.partBStructure as Prisma.InputJsonValue,
          instructions: input.instructions,
          status: "PENDING_MC_APPROVAL",
          createdByRole: userRole,
          createdById: userId,
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              course_code: true,
            },
          },
        },
      });

      return {
        success: true,
        pattern,
      };
    }),

  /**
   * Update an existing pattern (only in DRAFT or REJECTED status)
   */
  updatePattern: courseCoordinatorProcedure
    .input(updatePatternSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      // Get the pattern
      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.id },
        include: {
          course: {
            select: {
              courseCoordinatorId: true,
            },
          },
        },
      });

      if (!pattern) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern not found",
        });
      }

      // Verify ownership
      if (pattern.course.courseCoordinatorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not the coordinator for this course",
        });
      }

      // Can only edit DRAFT or REJECTED patterns
      if (pattern.status !== "DRAFT" && pattern.status !== "REJECTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only edit patterns in DRAFT or REJECTED status",
        });
      }

      // Update the pattern
      const updatedPattern = await prisma.questionPaperPattern.update({
        where: { id: input.id },
        data: {
          patternName: input.patternName,
          academicYear: input.academicYear,
          duration: input.duration,
          partAStructure: input.partAStructure
            ? (input.partAStructure as Prisma.InputJsonValue)
            : undefined,
          partBStructure: input.partBStructure
            ? (input.partBStructure as Prisma.InputJsonValue)
            : undefined,
          instructions: input.instructions,
          // Reset status to pending MC approval if it was rejected
          status:
            pattern.status === "REJECTED" ? "PENDING_MC_APPROVAL" : undefined,
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              course_code: true,
            },
          },
        },
      });

      return {
        success: true,
        pattern: updatedPattern,
      };
    }),

  /**
   * Get patterns list with filters
   */
  getPatterns: coordinatorProcedure
    .input(getPatternsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const { page, limit, courseId, examType, semesterType, status } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.QuestionPaperPatternWhereInput = {
        ...(courseId && { courseId }),
        ...(examType && { examType }),
        ...(semesterType && { semesterType }),
        ...(status && { status }),
      };

      const [patterns, total] = await Promise.all([
        prisma.questionPaperPattern.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            course: {
              select: {
                id: true,
                name: true,
                course_code: true,
              },
            },
          },
        }),
        prisma.questionPaperPattern.count({ where }),
      ]);

      return {
        patterns,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get pattern by ID
   */
  getPatternById: coordinatorProcedure
    .input(getPatternByIdSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const patternId = input.id || input.patternId;
      if (!patternId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either id or patternId must be provided",
        });
      }

      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: patternId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              course_code: true,
              courseCoordinator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              moduleCoordinator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              programCoordinator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!pattern) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern not found",
        });
      }

      // Calculate Part A and Part B totals from structure
      const partAStructure = pattern.partAStructure as Array<{
        marks: number;
      }>;
      const partBStructure = pattern.partBStructure as Array<{
        hasOR: boolean;
        options?: Array<{ questionSlot: { marks: number } }>;
        questionSlot?: { marks: number };
      }>;

      // Calculate Part A totals
      const partA_count = partAStructure.length;
      const partA_marksEach =
        partA_count > 0 ? partAStructure[0].marks : 0;

      // Calculate Part B totals
      let partB_count = 0;
      let partB_marksEach = 0;
      for (const group of partBStructure) {
        if (group.hasOR && group.options && group.options.length > 0) {
          partB_count += group.options.length;
          partB_marksEach = group.options[0].questionSlot.marks;
        } else if (group.questionSlot) {
          partB_count += 1;
          partB_marksEach = group.questionSlot.marks;
        }
      }

      return {
        ...pattern,
        semester: pattern.semesterType,
        partA_count,
        partA_marksEach,
        partB_count,
        partB_marksEach,
      };
    }),

  /**
   * Get pending approvals based on user role
   */
  getPendingApprovals: coordinatorProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const userId = ctx.session.user.id;
    const userRole = ctx.session.user.role;

    let where: Prisma.QuestionPaperPatternWhereInput = {};

    if (userRole === "MODULE_COORDINATOR") {
      // Get patterns pending MC approval for courses where user is MC
      const courses = await prisma.course.findMany({
        where: { moduleCoordinatorId: userId },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);

      where = {
        courseId: { in: courseIds },
        status: "PENDING_MC_APPROVAL",
      };
    } else if (userRole === "PROGRAM_COORDINATOR") {
      // Get patterns pending PC approval for courses where user is PC
      const courses = await prisma.course.findMany({
        where: { programCoordinatorId: userId },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);

      where = {
        courseId: { in: courseIds },
        status: "PENDING_PC_APPROVAL",
      };
    } else if (userRole === "CONTROLLER_OF_EXAMINATION") {
      // Get all patterns pending COE approval
      where = {
        status: "PENDING_COE_APPROVAL",
      };
    } else {
      return { patterns: [] };
    }

    const patterns = await prisma.questionPaperPattern.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            course_code: true,
            courseCoordinator: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return { patterns };
  }),

  /**
   * Approve a pattern (MC, PC, or COE)
   */
  approvePattern: coordinatorProcedure
    .input(approvePatternSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.patternId },
        include: {
          course: {
            select: {
              moduleCoordinatorId: true,
              programCoordinatorId: true,
            },
          },
        },
      });

      if (!pattern) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern not found",
        });
      }

      // Validate approval permissions
      if (userRole === "MODULE_COORDINATOR") {
        if (pattern.status !== "PENDING_MC_APPROVAL") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pattern is not pending MC approval",
          });
        }
        if (pattern.course.moduleCoordinatorId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not the module coordinator for this course",
          });
        }

        // Approve by MC
        const updatedPattern = await prisma.questionPaperPattern.update({
          where: { id: input.patternId },
          data: {
            mcApproved: true,
            mcApprovedAt: new Date(),
            mcApprovedById: userId,
            mcRemarks: input.remarks,
            status: "PENDING_PC_APPROVAL",
          },
        });

        return {
          success: true,
          message: "Pattern approved by Module Coordinator",
          pattern: updatedPattern,
        };
      } else if (userRole === "PROGRAM_COORDINATOR") {
        if (pattern.status !== "PENDING_PC_APPROVAL") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pattern is not pending PC approval",
          });
        }
        if (pattern.course.programCoordinatorId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not the program coordinator for this course",
          });
        }

        // Approve by PC
        const updatedPattern = await prisma.questionPaperPattern.update({
          where: { id: input.patternId },
          data: {
            pcApproved: true,
            pcApprovedAt: new Date(),
            pcApprovedById: userId,
            pcRemarks: input.remarks,
            status: "PENDING_COE_APPROVAL",
          },
        });

        return {
          success: true,
          message: "Pattern approved by Program Coordinator",
          pattern: updatedPattern,
        };
      } else if (userRole === "CONTROLLER_OF_EXAMINATION") {
        if (pattern.status !== "PENDING_COE_APPROVAL") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pattern is not pending COE approval",
          });
        }

        // Final approval by COE
        const updatedPattern = await prisma.questionPaperPattern.update({
          where: { id: input.patternId },
          data: {
            coeApproved: true,
            coeApprovedAt: new Date(),
            coeApprovedById: userId,
            coeRemarks: input.remarks,
            status: "APPROVED",
          },
        });

        return {
          success: true,
          message: "Pattern approved by COE",
          pattern: updatedPattern,
        };
      }

      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to approve patterns",
      });
    }),

  /**
   * Reject a pattern (MC, PC, or COE)
   */
  rejectPattern: coordinatorProcedure
    .input(rejectPatternSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.patternId },
        include: {
          course: {
            select: {
              moduleCoordinatorId: true,
              programCoordinatorId: true,
            },
          },
        },
      });

      if (!pattern) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern not found",
        });
      }

      // Validate rejection permissions
      if (
        (userRole === "MODULE_COORDINATOR" &&
          pattern.status === "PENDING_MC_APPROVAL" &&
          pattern.course.moduleCoordinatorId === userId) ||
        (userRole === "PROGRAM_COORDINATOR" &&
          pattern.status === "PENDING_PC_APPROVAL" &&
          pattern.course.programCoordinatorId === userId) ||
        (userRole === "CONTROLLER_OF_EXAMINATION" &&
          pattern.status === "PENDING_COE_APPROVAL")
      ) {
        // Store rejection remarks based on role
        const updateData: Prisma.QuestionPaperPatternUpdateInput = {
          status: "REJECTED",
        };

        if (userRole === "MODULE_COORDINATOR") {
          updateData.mcRemarks = input.remarks;
        } else if (userRole === "PROGRAM_COORDINATOR") {
          updateData.pcRemarks = input.remarks;
        } else if (userRole === "CONTROLLER_OF_EXAMINATION") {
          updateData.coeRemarks = input.remarks;
        }

        const updatedPattern = await prisma.questionPaperPattern.update({
          where: { id: input.patternId },
          data: updateData,
        });

        return {
          success: true,
          message: "Pattern rejected",
          pattern: updatedPattern,
        };
      }

      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to reject this pattern",
      });
    }),

  /**
   * Delete a pattern (Course Coordinator only, DRAFT status only)
   */
  deletePattern: courseCoordinatorProcedure
    .input(deletePatternSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.id },
        include: {
          course: {
            select: {
              courseCoordinatorId: true,
            },
          },
        },
      });

      if (!pattern) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern not found",
        });
      }

      // Verify ownership
      if (pattern.course.courseCoordinatorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not the coordinator for this course",
        });
      }

      // Can only delete DRAFT patterns
      if (pattern.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only delete patterns in DRAFT status",
        });
      }

      await prisma.questionPaperPattern.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: "Pattern deleted successfully",
      };
    }),

  /**
   * Get approved patterns (for COE to generate papers)
   * Returns simplified list without pagination for easier frontend use
   */
  getApprovedPatterns: controllerOfExamination
    .input(
      z
        .object({
          courseId: z.string().uuid("Invalid course ID").optional(),
          examType: z.enum(examTypeArray).optional(),
          semesterType: z.enum(semesterTypeArray).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const where: Prisma.QuestionPaperPatternWhereInput = {
        status: "APPROVED",
        ...(input?.courseId && { courseId: input.courseId }),
        ...(input?.examType && { examType: input.examType }),
        ...(input?.semesterType && { semesterType: input.semesterType }),
      };

      const patterns = await prisma.questionPaperPattern.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              course_code: true,
            },
          },
        },
      });

      // Transform patterns to include calculated fields
      const transformedPatterns = patterns.map((pattern) => {
        const partAStructure = pattern.partAStructure as Array<{
          marks: number;
        }>;
        const partBStructure = pattern.partBStructure as Array<{
          hasOR: boolean;
          options?: Array<{ questionSlot: { marks: number } }>;
          questionSlot?: { marks: number };
        }>;

        // Calculate Part A totals
        const partA_count = partAStructure.length;
        const partA_marksEach =
          partA_count > 0 ? partAStructure[0].marks : 0;

        // Calculate Part B totals
        let partB_count = 0;
        let partB_marksEach = 0;
        for (const group of partBStructure) {
          if (group.hasOR && group.options && group.options.length > 0) {
            partB_count += group.options.length;
            partB_marksEach = group.options[0].questionSlot.marks;
          } else if (group.questionSlot) {
            partB_count += 1;
            partB_marksEach = group.questionSlot.marks;
          }
        }

        return {
          ...pattern,
          semester: pattern.semesterType,
          partA_count,
          partA_marksEach,
          partB_count,
          partB_marksEach,
        };
      });

      return transformedPatterns;
    }),
});
