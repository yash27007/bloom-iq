import { prisma } from "@/lib/prisma";
import {
  coordinatorProcedure,
  courseCoordinatorProcedure,
  createTRPCRouter,
  paperCommitteeProcedure,
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
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

function canManagePatternForRole(
  userRole: string,
  userId: string,
  course: {
    departmentId?: string | null;
    courseCoordinatorId: string;
    moduleCoordinatorId: string;
    programCoordinatorId: string;
    department: { hodId: string | null; deanId: string | null } | null;
  },
) {
  if (userRole === "COURSE_COORDINATOR") {
    return course.courseCoordinatorId === userId;
  }
  if (userRole === "MODULE_COORDINATOR") {
    return course.moduleCoordinatorId === userId;
  }
  if (userRole === "PROGRAM_COORDINATOR") {
    return course.programCoordinatorId === userId;
  }
  if (userRole === "HOD") {
    return course.department?.hodId === userId;
  }
  if (userRole === "DEAN") {
    return course.department?.deanId === userId;
  }
  if (userRole === "CONTROLLER_OF_EXAMINATION") {
    return true;
  }

  return false;
}

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

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      if (!currentUser?.departmentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Assign your faculty account to a department before creating patterns",
        });
      }

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
        select: {
          courseCoordinatorId: true,
          departmentId: true,
        },
      });

      if (!course || course.courseCoordinatorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not the coordinator for this course",
        });
      }

      if (
        !course.departmentId ||
        course.departmentId !== currentUser.departmentId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You can only create patterns for courses in your department",
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
   * Update an existing pattern (allowed for all scoped roles)
   */
  updatePattern: coordinatorProcedure
    .input(updatePatternSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      if (
        (userRole === "COURSE_COORDINATOR" ||
          userRole === "MODULE_COORDINATOR" ||
          userRole === "PROGRAM_COORDINATOR" ||
          userRole === "HOD" ||
          userRole === "DEAN") &&
        !currentUser?.departmentId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Assign your faculty account to a department before editing patterns",
        });
      }

      // Get the pattern
      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.id },
        include: {
          course: {
            select: {
              departmentId: true,
              courseCoordinatorId: true,
              moduleCoordinatorId: true,
              programCoordinatorId: true,
              department: {
                select: {
                  hodId: true,
                  deanId: true,
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

      if (!canManagePatternForRole(userRole, userId, pattern.course)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this pattern",
        });
      }

      if (
        (userRole === "COURSE_COORDINATOR" ||
          userRole === "MODULE_COORDINATOR" ||
          userRole === "PROGRAM_COORDINATOR" ||
          userRole === "HOD" ||
          userRole === "DEAN") &&
        pattern.course.departmentId !== currentUser?.departmentId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit patterns within your department",
        });
      }

      if (input.courseId && input.courseId !== pattern.courseId) {
        const targetCourse = await prisma.course.findUnique({
          where: { id: input.courseId },
          select: {
            departmentId: true,
            courseCoordinatorId: true,
            moduleCoordinatorId: true,
            programCoordinatorId: true,
            department: {
              select: {
                hodId: true,
                deanId: true,
              },
            },
          },
        });

        if (
          !targetCourse ||
          !canManagePatternForRole(userRole, userId, targetCourse)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "You do not have permission to move this pattern to the selected course",
          });
        }

        if (
          (userRole === "COURSE_COORDINATOR" ||
            userRole === "MODULE_COORDINATOR" ||
            userRole === "PROGRAM_COORDINATOR" ||
            userRole === "HOD" ||
            userRole === "DEAN") &&
          targetCourse.departmentId !== currentUser?.departmentId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only move patterns to courses in your department",
          });
        }
      }

      const nextExamType = input.examType || pattern.examType;
      const nextTotalMarks = input.totalMarks || pattern.totalMarks;

      if (nextExamType === "END_SEMESTER" && nextTotalMarks !== 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End Semester patterns must have 100 total marks",
        });
      }
      if (
        (nextExamType === "SESSIONAL_1" || nextExamType === "SESSIONAL_2") &&
        nextTotalMarks !== 50
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sessional patterns must have 50 total marks",
        });
      }

      // Update the pattern
      const updatedPattern = await prisma.questionPaperPattern.update({
        where: { id: input.id },
        data: {
          courseId: input.courseId,
          patternName: input.patternName,
          academicYear: input.academicYear,
          semesterType: input.semesterType,
          examType: input.examType,
          totalMarks: input.totalMarks,
          duration: input.duration,
          partAStructure: input.partAStructure
            ? (input.partAStructure as Prisma.InputJsonValue)
            : undefined,
          partBStructure: input.partBStructure
            ? (input.partBStructure as Prisma.InputJsonValue)
            : undefined,
          instructions: input.instructions,
          // Any modification restarts the approval chain.
          status: "PENDING_MC_APPROVAL",
          mcApproved: false,
          pcApproved: false,
          hodApproved: false,
          deanApproved: false,
          mcApprovedAt: null,
          pcApprovedAt: null,
          hodApprovedAt: null,
          deanApprovedAt: null,
          mcApprovedById: null,
          pcApprovedById: null,
          hodApprovedById: null,
          deanApprovedById: null,
          mcRemarks: null,
          pcRemarks: null,
          hodRemarks: null,
          deanRemarks: null,
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
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      const skip = (page - 1) * limit;

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      const userDepartmentId = currentUser?.departmentId || null;
      const requiresDepartmentScope =
        userRole === "COURSE_COORDINATOR" ||
        userRole === "MODULE_COORDINATOR" ||
        userRole === "PROGRAM_COORDINATOR" ||
        userRole === "HOD" ||
        userRole === "DEAN" ||
        userRole === "CONTROLLER_OF_EXAMINATION";

      if (requiresDepartmentScope && !userDepartmentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Assign your faculty account to a department to view patterns",
        });
      }

      const roleScope: Prisma.QuestionPaperPatternWhereInput =
        userRole === "COURSE_COORDINATOR"
          ? {
              course: {
                courseCoordinatorId: userId,
                departmentId: userDepartmentId || undefined,
              },
            }
          : userRole === "MODULE_COORDINATOR"
            ? {
                course: {
                  moduleCoordinatorId: userId,
                  departmentId: userDepartmentId || undefined,
                },
              }
            : userRole === "PROGRAM_COORDINATOR"
              ? {
                  course: {
                    programCoordinatorId: userId,
                    departmentId: userDepartmentId || undefined,
                  },
                }
              : userRole === "HOD"
                ? {
                    course: {
                      departmentId: userDepartmentId || undefined,
                      department: { hodId: userId },
                    },
                  }
                : userRole === "DEAN"
                  ? {
                      course: {
                        departmentId: userDepartmentId || undefined,
                        department: { deanId: userId },
                      },
                    }
                  : userRole === "CONTROLLER_OF_EXAMINATION"
                    ? {
                        course: {
                          departmentId: userDepartmentId || undefined,
                        },
                      }
                    : { id: "__no_access__" };

      const where: Prisma.QuestionPaperPatternWhereInput = {
        ...roleScope,
        ...(courseId && { courseId }),
        ...(examType && { examType }),
        ...(semesterType && { semesterType }),
        ...(status && { status }),
      };

      if (
        (userRole === "HOD" ||
          userRole === "DEAN" ||
          userRole === "CONTROLLER_OF_EXAMINATION") &&
        !status
      ) {
        where.status = {
          in: ["APPROVED"],
        };
      }

      if (
        (userRole === "HOD" || userRole === "DEAN") &&
        status &&
        status !== "APPROVED"
      ) {
        return {
          patterns: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

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
                department: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
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
              departmentId: true,
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

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      const userDepartmentId = currentUser?.departmentId || null;
      const requiresDepartmentScope =
        userRole === "COURSE_COORDINATOR" ||
        userRole === "MODULE_COORDINATOR" ||
        userRole === "PROGRAM_COORDINATOR" ||
        userRole === "HOD" ||
        userRole === "DEAN" ||
        userRole === "CONTROLLER_OF_EXAMINATION";

      if (requiresDepartmentScope && !userDepartmentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Assign your faculty account to a department to access patterns",
        });
      }

      const canAccess =
        (userRole === "COURSE_COORDINATOR" &&
          pattern.course.courseCoordinator.id === userId &&
          pattern.course.departmentId === userDepartmentId) ||
        (userRole === "MODULE_COORDINATOR" &&
          pattern.course.moduleCoordinator.id === userId &&
          pattern.course.departmentId === userDepartmentId) ||
        (userRole === "PROGRAM_COORDINATOR" &&
          pattern.course.programCoordinator.id === userId &&
          pattern.course.departmentId === userDepartmentId) ||
        (userRole === "CONTROLLER_OF_EXAMINATION" &&
          pattern.course.departmentId === userDepartmentId);

      if (!canAccess && (userRole === "HOD" || userRole === "DEAN")) {
        if (pattern.status !== "APPROVED") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Pattern is not visible until coordinator approvals are complete",
          });
        }

        const deptAccess = await prisma.course.findUnique({
          where: { id: pattern.course.id },
          select: {
            departmentId: true,
            department: {
              select: {
                hodId: true,
                deanId: true,
              },
            },
          },
        });

        if (
          !deptAccess?.department ||
          deptAccess.departmentId !== userDepartmentId ||
          (userRole === "HOD" && deptAccess.department.hodId !== userId) ||
          (userRole === "DEAN" && deptAccess.department.deanId !== userId)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this pattern",
          });
        }
      } else if (!canAccess && userRole !== "HOD" && userRole !== "DEAN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this pattern",
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
      const partA_marksEach = partA_count > 0 ? partAStructure[0].marks : 0;

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

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    const userDepartmentId = currentUser?.departmentId || null;

    if (!userDepartmentId) {
      return { patterns: [] };
    }

    let where: Prisma.QuestionPaperPatternWhereInput = {};

    if (userRole === "MODULE_COORDINATOR") {
      // Get patterns pending MC approval for courses where user is MC
      const courses = await prisma.course.findMany({
        where: {
          moduleCoordinatorId: userId,
          departmentId: userDepartmentId,
        },
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
        where: {
          programCoordinatorId: userId,
          departmentId: userDepartmentId,
        },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);

      where = {
        courseId: { in: courseIds },
        status: "PENDING_PC_APPROVAL",
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
   * Approve a pattern (MC, PC)
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

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      const userDepartmentId = currentUser?.departmentId || null;

      if (!userDepartmentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Assign your faculty account to a department before approving patterns",
        });
      }

      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.patternId },
        include: {
          course: {
            select: {
              departmentId: true,
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
        if (pattern.course.departmentId !== userDepartmentId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only approve patterns in your department",
          });
        }

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
        if (pattern.course.departmentId !== userDepartmentId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only approve patterns in your department",
          });
        }

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
            status: "APPROVED",
          },
        });

        return {
          success: true,
          message: "Pattern approved by Program Coordinator",
          pattern: updatedPattern,
        };
      }

      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to approve patterns",
      });
    }),

  /**
   * Reject a pattern (MC, PC)
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

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      const userDepartmentId = currentUser?.departmentId || null;

      if (!userDepartmentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Assign your faculty account to a department before rejecting patterns",
        });
      }

      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.patternId },
        include: {
          course: {
            select: {
              departmentId: true,
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
          pattern.course.departmentId === userDepartmentId &&
          pattern.status === "PENDING_MC_APPROVAL" &&
          pattern.course.moduleCoordinatorId === userId) ||
        (userRole === "PROGRAM_COORDINATOR" &&
          pattern.course.departmentId === userDepartmentId &&
          pattern.status === "PENDING_PC_APPROVAL" &&
          pattern.course.programCoordinatorId === userId)
      ) {
        // Store rejection remarks based on role
        const updateData: Prisma.QuestionPaperPatternUpdateInput = {
          status: "REJECTED",
        };

        if (userRole === "MODULE_COORDINATOR") {
          updateData.mcRemarks = input.remarks;
        } else if (userRole === "PROGRAM_COORDINATOR") {
          updateData.pcRemarks = input.remarks;
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
   * Delete a pattern (allowed for all scoped roles)
   */
  deletePattern: coordinatorProcedure
    .input(deletePatternSchema)
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
        where: { id: input.id },
        include: {
          course: {
            select: {
              departmentId: true,
              courseCoordinatorId: true,
              moduleCoordinatorId: true,
              programCoordinatorId: true,
              department: {
                select: {
                  hodId: true,
                  deanId: true,
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

      if (!canManagePatternForRole(userRole, userId, pattern.course)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this pattern",
        });
      }

      if (
        userRole === "COURSE_COORDINATOR" ||
        userRole === "MODULE_COORDINATOR" ||
        userRole === "PROGRAM_COORDINATOR" ||
        userRole === "HOD" ||
        userRole === "DEAN"
      ) {
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { departmentId: true },
        });

        if (
          !currentUser?.departmentId ||
          currentUser.departmentId !== pattern.course.departmentId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only manage patterns within your department",
          });
        }
      }

      const generatedPaperCount = await prisma.questionPaper.count({
        where: { patternId: input.id },
      });

      if (generatedPaperCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete this pattern because papers are already generated from it",
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
  getApprovedPatterns: paperCommitteeProcedure
    .input(
      z
        .object({
          courseId: z.string().uuid("Invalid course ID").optional(),
          examType: z.enum(examTypeArray).optional(),
          semesterType: z.enum(semesterTypeArray).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      const userDepartmentId = currentUser?.departmentId || null;

      const where: Prisma.QuestionPaperPatternWhereInput = {
        status: { in: ["APPROVED"] },
        ...(input?.courseId && { courseId: input.courseId }),
        ...(input?.examType && { examType: input.examType }),
        ...(input?.semesterType && { semesterType: input.semesterType }),
      };

      if (userRole === "HOD") {
        if (!userDepartmentId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Assign your faculty account to a department to view approved patterns",
          });
        }
        where.course = {
          departmentId: userDepartmentId,
          department: {
            hodId: userId,
          },
        };
      }

      if (userRole === "DEAN") {
        if (!userDepartmentId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Assign your faculty account to a department to view approved patterns",
          });
        }
        where.course = {
          departmentId: userDepartmentId,
          department: {
            deanId: userId,
          },
        };
      }

      if (userRole === "CONTROLLER_OF_EXAMINATION") {
        if (!userDepartmentId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Assign your faculty account to a department to view approved patterns",
          });
        }

        where.course = {
          departmentId: userDepartmentId,
        };
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
        const partA_marksEach = partA_count > 0 ? partAStructure[0].marks : 0;

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
