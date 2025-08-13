import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  coordinatorProcedure,
  protectedProcedure,
} from "../init";
import { prisma } from "@/lib/prisma";

export const courseRouter = createTRPCRouter({
  // Admin only: Get all courses
  getCourses: adminProcedure.query(async () => {
    return await prisma.course.findMany({
      include: {
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
      orderBy: { courseCode: "asc" },
    });
  }),

  // Admin only: Create course
  createCourse: adminProcedure
    .input(
      z.object({
        courseCode: z.string().min(1, "Course code is required"),
        courseName: z.string().min(1, "Course name is required"),
        courseCoordinatorId: z
          .string()
          .min(1, "Course coordinator is required"),
        moduleCoordinatorId: z
          .string()
          .min(1, "Module coordinator is required"),
        programCoordinatorId: z
          .string()
          .min(1, "Program coordinator is required"),
      })
    )
    .mutation(async ({ input }) => {
      const {
        courseCode,
        courseName,
        courseCoordinatorId,
        moduleCoordinatorId,
        programCoordinatorId,
      } = input;

      // Check if course code already exists
      const existingCourse = await prisma.course.findUnique({
        where: { courseCode },
      });

      if (existingCourse) {
        throw new Error("Course with this code already exists");
      }

      return await prisma.course.create({
        data: {
          courseCode,
          courseName,
          courseCoordinatorId,
          moduleCoordinatorId,
          programCoordinatorId,
        },
        include: {
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
      });
    }),

  // Admin only: Update course
  updateCourse: adminProcedure
    .input(
      z.object({
        id: z.string(),
        courseCode: z.string().min(1).optional(),
        courseName: z.string().min(1).optional(),
        courseCoordinatorId: z.string().optional(),
        moduleCoordinatorId: z.string().optional(),
        programCoordinatorId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      if (updateData.courseCode) {
        // Check if course code is already taken by another course
        const existingCourse = await prisma.course.findFirst({
          where: {
            courseCode: updateData.courseCode,
            NOT: { id },
          },
        });

        if (existingCourse) {
          throw new Error("Course code is already taken by another course");
        }
      }

      return await prisma.course.update({
        where: { id },
        data: updateData,
        include: {
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
      });
    }),

  // Admin only: Delete course
  deleteCourse: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.course.delete({
        where: { id: input.id },
      });
    }),

  // Coordinator: Get courses they coordinate
  getMyCourses: coordinatorProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return await prisma.course.findMany({
      where: {
        OR: [
          { courseCoordinatorId: userId },
          { moduleCoordinatorId: userId },
          { programCoordinatorId: userId },
        ],
      },
      include: {
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
        _count: {
          select: {
            materials: true,
            questions: true,
          },
        },
      },
      orderBy: { courseName: "asc" },
    });
  }),

  // Protected: Get course by ID (for users who have access)
  getCourseById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Admin can access any course
      if (userRole === "ADMIN") {
        return await prisma.course.findUnique({
          where: { id: input.id },
          include: {
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
            materials: {
              orderBy: { uploadedAt: "desc" },
            },
          },
        });
      }

      // Others can only access courses they coordinate
      return await prisma.course.findFirst({
        where: {
          id: input.id,
          OR: [
            { courseCoordinatorId: userId },
            { moduleCoordinatorId: userId },
            { programCoordinatorId: userId },
          ],
        },
        include: {
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
          materials: {
            orderBy: { uploadedAt: "desc" },
          },
        },
      });
    }),
});
