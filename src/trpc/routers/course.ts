import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  coordinatorProcedure,
  protectedProcedure,
} from "../init";
import { prisma } from "@/lib/prisma";

export const courseRouter = createTRPCRouter({
  // Debug query to check session data
  debugSession: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    console.log('Debug session - userId:', userId, 'role:', ctx.session.user.role, 'email:', ctx.session.user.email);
    
    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      }
    });
    
    console.log('User from database:', user);
    
    // Check all courses and their coordinator assignments
    const allCourses = await prisma.course.findMany({
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        courseCoordinatorId: true,
        moduleCoordinatorId: true,
        programCoordinatorId: true,
      }
    });
    
    console.log('All courses:', allCourses);
    
    return {
      sessionUser: ctx.session.user,
      dbUser: user,
      allCourses: allCourses,
    };
  }),

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
    const userEmail = ctx.session.user.email;
    const userRole = ctx.session.user.role;
    
    console.log('🔍 getMyCourses DEBUG:');
    console.log('  - User ID from session:', userId);
    console.log('  - User email from session:', userEmail);
    console.log('  - User role from session:', userRole);

    // Get the correct user ID from the database using email
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true, role: true }
    });
    
    if (!dbUser) {
      console.log('❌ User not found in database with email:', userEmail);
      return [];
    }
    
    console.log('  - User found by email:', dbUser);
    const correctUserId = dbUser.id;

    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { courseCoordinatorId: correctUserId },
          { moduleCoordinatorId: correctUserId },
          { programCoordinatorId: correctUserId },
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

    console.log('Found courses:', courses.length, courses.map(c => ({ code: c.courseCode, ccId: c.courseCoordinatorId, mcId: c.moduleCoordinatorId, pcId: c.programCoordinatorId })));
    console.log('  - Detailed course check for user:', userId);
    courses.forEach(course => {
      console.log(`    Course ${course.courseCode}: CC=${course.courseCoordinatorId}, MC=${course.moduleCoordinatorId}, PC=${course.programCoordinatorId}`);
      console.log(`    Matches: CC=${course.courseCoordinatorId === userId}, MC=${course.moduleCoordinatorId === userId}, PC=${course.programCoordinatorId === userId}`);
    });
    
    return courses;
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
