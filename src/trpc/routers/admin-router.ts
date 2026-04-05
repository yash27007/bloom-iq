import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash-password";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Role } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { signUpSchema } from "@/types/auth";

/**
 * -------------------------------------------------------
 * Types & Utilities
 * -------------------------------------------------------
 */

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const roleArray = Object.values(Role) as [Role, ...Role[]];

// Generic list input (page, limit, search, sorting)
const baseListInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(10), // Increased max limit for scalability
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Whitelists to keep sorting safe & SQL-injection-proof
const userSortableKeys = [
  "firstName",
  "lastName",
  "email",
  "facultyId",
  "role",
  "designation",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;
type UserSortableKey = (typeof userSortableKeys)[number];

const courseSortableKeys = ["course_code", "name"] as const;
type CourseSortableKey = (typeof courseSortableKeys)[number];

function safeOrderBy<T extends string>(
  key: string | undefined,
  order: "asc" | "desc",
  whitelist: readonly T[],
): Record<T, "asc" | "desc"> | undefined {
  if (!key) return undefined;
  if (whitelist.includes(key as T)) {
    return { [key as T]: order } as Record<T, "asc" | "desc">;
  }
  return undefined;
}

function paginate(page: number, limit: number) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

function ok<T>(payload: {
  data?: T;
  page?: number;
  limit?: number;
  total?: number;
  message?: string;
}): ApiResponse<T> {
  const { data, page, limit, total, message } = payload;
  const res: ApiResponse<T> = { success: true, data, message };
  if (page && limit && typeof total === "number") {
    res.pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
  return res;
}

function fail(code: TRPCError["code"], message: string) {
  throw new TRPCError({ code, message });
}

/**
 * -------------------------------------------------------
 * Schemas
 * -------------------------------------------------------
 */

// Users
const updateUserSchema = z.object({
  id: z.string(),
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  facultyId: z.string().min(2).max(100).optional(),
  role: z.enum(roleArray).optional(),
  designation: z
    .enum(["ASSISTANT_PROFESSOR", "ASSOCIATE_PROFESSOR", "PROFESSOR"])
    .optional(),
  departmentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const listUsersInput = baseListInput.extend({
  role: z.enum(roleArray).optional(),
  sortBy: z
    .enum(
      userSortableKeys as unknown as [UserSortableKey, ...UserSortableKey[]],
    )
    .optional(),
});

// Courses
const createCourseSchema = z.object({
  courseCode: z.string().min(2).max(20),
  courseName: z.string().min(2).max(200),
  description: z.string().min(1).max(1000).optional(),
  departmentId: z.string().uuid(),
  courseCoordinatorId: z.string(),
  moduleCoordinatorId: z.string(),
  programCoordinatorId: z.string(),
});

const updateCourseSchema = z.object({
  id: z.string(),
  courseCode: z.string().min(2).max(20).optional(),
  courseName: z.string().min(2).max(200).optional(),
  description: z.string().min(1).max(1000).optional(),
  departmentId: z.string().uuid().optional(),
  courseCoordinatorId: z.string().optional(),
  moduleCoordinatorId: z.string().optional(),
  programCoordinatorId: z.string().optional(),
});

const createDepartmentSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  hodId: z.string().optional(),
  deanId: z.string().optional(),
});

const updateDepartmentSchema = z.object({
  id: z.string(),
  code: z.string().min(2).max(20).optional(),
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  hodId: z.string().nullable().optional(),
  deanId: z.string().nullable().optional(),
});

const listCoursesInput = baseListInput.extend({
  sortBy: z
    .enum(
      courseSortableKeys as unknown as [
        CourseSortableKey,
        ...CourseSortableKey[],
      ],
    )
    .optional(),
});

const eligibleCoordinatorInput = z.object({
  role: z.enum(roleArray).optional(),
  departmentId: z.string().uuid().optional(),
});

const eligibleCoordinatorsForEditInput = z.object({
  role: z.enum(roleArray).optional(),
  currentCourseId: z.string(), // The course being edited
});

// Bulk
const bulkIdsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

/**
 * -------------------------------------------------------
 * Validators
 * -------------------------------------------------------
 */

/*
 * Validates that provided coordinator IDs exist, have the correct Role, and are active.
 * Throws TRPCError on mismatch.
 */
async function validateCoordinatorRoles(input: {
  courseCoordinatorId?: string;
  moduleCoordinatorId?: string;
  programCoordinatorId?: string;
}) {
  const ids = [
    input.courseCoordinatorId,
    input.moduleCoordinatorId,
    input.programCoordinatorId,
  ].filter(Boolean) as string[];

  if (ids.length === 0) return;

  const found = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      role: true,
      isActive: true,
      firstName: true,
      lastName: true,
    },
  });

  if (found.length !== ids.length) {
    fail("BAD_REQUEST", "One or more coordinators not found.");
  }

  const expectedRoleById: Record<string, Role> = {};
  if (input.courseCoordinatorId)
    expectedRoleById[input.courseCoordinatorId] = Role.COURSE_COORDINATOR;
  if (input.moduleCoordinatorId)
    expectedRoleById[input.moduleCoordinatorId] = Role.MODULE_COORDINATOR;
  if (input.programCoordinatorId)
    expectedRoleById[input.programCoordinatorId] = Role.PROGRAM_COORDINATOR;

  for (const u of found) {
    // Check if user is active
    if (!u.isActive) {
      fail(
        "BAD_REQUEST",
        `Cannot assign inactive user ${u.firstName} ${u.lastName} as coordinator.`,
      );
    }

    const expected = expectedRoleById[u.id];
    if (expected && u.role !== expected) {
      fail(
        "BAD_REQUEST",
        `User ${u.firstName} ${u.lastName} must have role ${expected}, found ${u.role}.`,
      );
    }
  }
}

async function validateDepartmentCoordinatorAssignments(input: {
  departmentId?: string;
  courseCoordinatorId?: string;
  moduleCoordinatorId?: string;
  programCoordinatorId?: string;
}) {
  if (!input.departmentId) return;

  const ids = [
    input.courseCoordinatorId,
    input.moduleCoordinatorId,
    input.programCoordinatorId,
  ].filter(Boolean) as string[];

  if (ids.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      departmentId: true,
    },
  });

  for (const user of users) {
    if (user.departmentId !== input.departmentId) {
      fail(
        "BAD_REQUEST",
        `User ${user.firstName} ${user.lastName} is not part of the selected department.`,
      );
    }
  }
}

async function validateDepartmentLeadershipRoles(input: {
  hodId?: string;
  deanId?: string;
}) {
  const ids = [input.hodId, input.deanId].filter(Boolean) as string[];
  if (ids.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, role: true, firstName: true, lastName: true },
  });

  if (input.hodId) {
    const hod = users.find((u) => u.id === input.hodId);
    if (!hod) {
      fail("BAD_REQUEST", "Selected HoD user does not exist.");
      return;
    }
    if (hod.role !== Role.HOD) {
      fail(
        "BAD_REQUEST",
        `User ${hod.firstName} ${hod.lastName} must have HOD role to be assigned as HoD.`,
      );
    }
  }

  if (input.deanId) {
    const dean = users.find((u) => u.id === input.deanId);
    if (!dean) {
      fail("BAD_REQUEST", "Selected Dean user does not exist.");
      return;
    }
    if (dean.role !== Role.DEAN) {
      fail(
        "BAD_REQUEST",
        `User ${dean.firstName} ${dean.lastName} must have DEAN role to be assigned as Dean.`,
      );
    }
  }
}

/**
 * -------------------------------------------------------
 * Admin Router
 * -------------------------------------------------------
 */

export const adminRouter = createTRPCRouter({
  // ==================== USER MANAGEMENT ====================

  /**
   * Create a new user.
   *
   * - Validates input against `signUpSchema`
   * - Hashes password
   * - Handles unique constraint errors (email, facultyId)
   * - Returns lean user payload for table display
   */
  addUser: adminProcedure.input(signUpSchema).mutation(async ({ input }) => {
    try {
      const user = await prisma.user.create({
        data: {
          name: `${input.firstName} ${input.lastName}`, // Better Auth required field
          firstName: input.firstName,
          lastName: input.lastName,
          facultyId: input.facultyId,
          email: input.email,
          password: await hashPassword(input.password),
          role: input.role,
          designation: input.designation,
          departmentId: input.departmentId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          facultyId: true,
          role: true,
          designation: true,
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ok({ data: user, message: "User created successfully." });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("email"))
          fail("CONFLICT", "User with this email already exists.");
        if (target?.includes("facultyId"))
          fail("CONFLICT", "User with this faculty ID already exists.");
        fail("CONFLICT", "User with this information already exists.");
      }
      fail("INTERNAL_SERVER_ERROR", "Failed to create user.");
    }
  }),

  /**
   * Get users with pagination, search & sorting.
   *
   * - search across firstName, lastName, email, facultyId (case-insensitive)
   * - optional role filter
   * - sortable by whitelisted columns
   * - returns lean payload + pagination
   */
  getUsers: adminProcedure.input(listUsersInput).query(async ({ input }) => {
    const { page, limit, search, role, sortBy, sortOrder } = input;
    const { skip, take } = paginate(page, limit);

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { facultyId: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy =
      safeOrderBy<UserSortableKey>(sortBy, sortOrder, userSortableKeys) ??
      ({ createdAt: "desc" } as Prisma.UserOrderByWithRelationInput);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          facultyId: true,
          role: true,
          designation: true,
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Include course relationships
          courseCoordinatorCourses: {
            select: { id: true, course_code: true, name: true },
          },
          moduleCoordinatorCourses: {
            select: { id: true, course_code: true, name: true },
          },
          programCoordinatorCourses: {
            select: { id: true, course_code: true, name: true },
          },
        },
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return ok({
      data: users,
      page,
      limit,
      total,
    });
  }),

  /**
   * Get single user by ID with richer detail (for side panel / drawer).
   */
  getUserById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          facultyId: true,
          role: true,
          designation: true,
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // minimal related signals for context
          courseCoordinatorCourses: {
            select: { id: true, course_code: true, name: true },
          },
          moduleCoordinatorCourses: {
            select: { id: true, course_code: true, name: true },
          },
          programCoordinatorCourses: {
            select: { id: true, course_code: true, name: true },
          },
        },
      });

      if (!user) fail("NOT_FOUND", "User not found.");

      return ok({ data: user });
    }),

  /**
   * Update user fields (firstName, lastName, email, facultyId, role, designation, isActive).
   *
   * - filters undefined keys to avoid accidental overwrites
   * - handles unique constraints
   */
  updateUser: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;

      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          departmentId: true,
        },
      });

      if (!existingUser) {
        fail("NOT_FOUND", "User not found.");
      }

      const nextRole = (rest.role ?? existingUser.role) as Role;
      const nextDepartmentId =
        rest.departmentId !== undefined
          ? (rest.departmentId ?? null)
          : existingUser.departmentId;

      if (nextRole !== Role.ADMIN && !nextDepartmentId) {
        fail("BAD_REQUEST", "Department is required for all faculty roles.");
      }

      if (nextDepartmentId) {
        const [assignedCourse, headedDepartment, deanedDepartment] =
          await Promise.all([
            prisma.course.findFirst({
              where: {
                OR: [
                  { courseCoordinatorId: id },
                  { moduleCoordinatorId: id },
                  { programCoordinatorId: id },
                ],
                departmentId: { not: nextDepartmentId },
              },
              select: { id: true, course_code: true },
            }),
            prisma.department.findFirst({
              where: {
                hodId: id,
                id: { not: nextDepartmentId },
              },
              select: { id: true, code: true },
            }),
            prisma.department.findFirst({
              where: {
                deanId: id,
                id: { not: nextDepartmentId },
              },
              select: { id: true, code: true },
            }),
          ]);

        if (assignedCourse) {
          fail(
            "BAD_REQUEST",
            `Cannot move user to a different department while assigned to course ${assignedCourse.course_code}.`,
          );
        }

        if (headedDepartment) {
          fail(
            "BAD_REQUEST",
            `Cannot move user to a different department while assigned as HoD of ${headedDepartment.code}.`,
          );
        }

        if (deanedDepartment) {
          fail(
            "BAD_REQUEST",
            `Cannot move user to a different department while assigned as Dean of ${deanedDepartment.code}.`,
          );
        }
      }

      const data: Prisma.UserUpdateInput = {};
      if (rest.firstName !== undefined) data.firstName = rest.firstName;
      if (rest.lastName !== undefined) data.lastName = rest.lastName;
      if (rest.email !== undefined) data.email = rest.email;
      if (rest.facultyId !== undefined) data.facultyId = rest.facultyId;
      if (rest.role !== undefined) data.role = rest.role;
      if (rest.designation !== undefined) data.designation = rest.designation;
      if (rest.departmentId !== undefined) {
        data.department = rest.departmentId
          ? { connect: { id: rest.departmentId } }
          : { disconnect: true };
      }
      if (rest.isActive !== undefined) data.isActive = rest.isActive;

      if (Object.keys(data).length === 0)
        fail("BAD_REQUEST", "No valid fields provided for update.");

      try {
        const user = await prisma.user.update({
          where: { id },
          data,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            facultyId: true,
            role: true,
            designation: true,
            department: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            isActive: true,
            updatedAt: true,
          },
        });

        return ok({ data: user, message: "User updated successfully." });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === "P2025") fail("NOT_FOUND", "User not found.");
          if (error.code === "P2002") {
            const target = error.meta?.target as string[] | undefined;
            if (target?.includes("email"))
              fail("CONFLICT", "Email already exists.");
            if (target?.includes("facultyId"))
              fail("CONFLICT", "Faculty ID already exists.");
            fail("CONFLICT", "A user with this information already exists.");
          }
        }
        fail("INTERNAL_SERVER_ERROR", "Failed to update user.");
      }
    }),

  /**
   * Delete a user.
   *
   * - Prevent deletion if user is assigned as any coordinator on a course.
   */
  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const blockingAssignments = await prisma.course.count({
          where: {
            OR: [
              { courseCoordinatorId: input.id },
              { moduleCoordinatorId: input.id },
              { programCoordinatorId: input.id },
              { department: { hodId: input.id } },
              { department: { deanId: input.id } },
            ],
          },
        });

        if (blockingAssignments > 0) {
          fail(
            "BAD_REQUEST",
            "Cannot delete a user who is assigned to courses. Reassign those courses first.",
          );
        }

        await prisma.user.delete({ where: { id: input.id } });

        return ok({ message: "User deleted successfully." });
      } catch (error) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          fail("NOT_FOUND", "User not found.");
        }
        fail("INTERNAL_SERVER_ERROR", "Failed to delete user.");
      }
    }),

  /**
   * Bulk delete users.
   *
   * - Skips users who are assigned to any course; reports how many were skipped
   */
  bulkDeleteUsers: adminProcedure
    .input(bulkIdsSchema)
    .mutation(async ({ input }) => {
      const ids = input.ids;

      // Find users that are blocked by assignments
      const blockedCourseAssignments = await prisma.course.findMany({
        where: {
          OR: [
            { courseCoordinatorId: { in: ids } },
            { moduleCoordinatorId: { in: ids } },
            { programCoordinatorId: { in: ids } },
          ],
        },
        select: {
          courseCoordinatorId: true,
          moduleCoordinatorId: true,
          programCoordinatorId: true,
        },
      });

      const blockedIds = new Set<string>();
      for (const c of blockedCourseAssignments) {
        if (c.courseCoordinatorId) blockedIds.add(c.courseCoordinatorId);
        if (c.moduleCoordinatorId) blockedIds.add(c.moduleCoordinatorId);
        if (c.programCoordinatorId) blockedIds.add(c.programCoordinatorId);
      }

      const deletableIds = ids.filter((id) => !blockedIds.has(id));

      const result = await prisma.user.deleteMany({
        where: { id: { in: deletableIds } },
      });

      return ok({
        message: `Deleted ${result.count} users. Skipped ${blockedIds.size} with course assignments.`,
        data: {
          deletedCount: result.count,
          skippedCount: blockedIds.size,
          skippedIds: Array.from(blockedIds),
        },
      });
    }),

  // ==================== COURSE MANAGEMENT ====================

  /**
   * Create a course with exactly one coordinator of each type.
   *
   * - Validates coordinator existence & role
   * - Handles unique courseCode conflict
   */
  addCourse: adminProcedure
    .input(createCourseSchema)
    .mutation(async ({ input }) => {
      await validateCoordinatorRoles(input);
      await validateDepartmentCoordinatorAssignments(input);

      try {
        const course = await prisma.course.create({
          data: {
            course_code: input.courseCode,
            name: input.courseName,
            description: input.description || "", // Add default description
            departmentId: input.departmentId,
            courseCoordinatorId: input.courseCoordinatorId,
            moduleCoordinatorId: input.moduleCoordinatorId,
            programCoordinatorId: input.programCoordinatorId,
          },
          select: {
            id: true,
            course_code: true,
            name: true,
            department: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            courseCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
            moduleCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
            programCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        });

        return ok({ data: course, message: "Course created successfully." });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === "P2002")
            fail("CONFLICT", "Course code already exists.");
          if (error.code === "P2003")
            fail("BAD_REQUEST", "One or more coordinators not found.");
        }
        fail("INTERNAL_SERVER_ERROR", "Failed to create course.");
      }
    }),

  /**
   * Get courses with pagination, search, sorting.
   *
   * - search across courseCode, courseName, and coordinator names
   * - returns counts for related resources for rich table badges
   */
  getCourses: adminProcedure
    .input(listCoursesInput)
    .query(async ({ input }) => {
      const { page, limit, search, sortBy, sortOrder } = input;
      const { skip, take } = paginate(page, limit);

      const where: Prisma.CourseWhereInput = {};
      if (search) {
        where.OR = [
          { course_code: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          {
            department: {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          {
            courseCoordinator: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          {
            moduleCoordinator: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          {
            programCoordinator: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      const orderBy =
        safeOrderBy<CourseSortableKey>(sortBy, sortOrder, courseSortableKeys) ??
        ({ course_code: "asc" } as Prisma.CourseOrderByWithRelationInput);

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          skip,
          take,
          select: {
            id: true,
            course_code: true,
            name: true,
            department: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            courseCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                designation: true,
              },
            },
            moduleCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                designation: true,
              },
            },
            programCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                designation: true,
              },
            },
            _count: {
              select: {
                questions: true,
                material: true,
                questionGenerationJobs: true,
              },
            },
          },
          orderBy,
        }),
        prisma.course.count({ where }),
      ]);

      return ok({ data: courses, page, limit, total });
    }),

  /**
   * Get a single course by ID with full details.
   */
  getCourseById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const course = await prisma.course.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          course_code: true,
          name: true,
          department: {
            select: {
              id: true,
              code: true,
              name: true,
              hod: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              dean: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          courseCoordinator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              facultyId: true,
              role: true,
            },
          },
          moduleCoordinator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              facultyId: true,
              role: true,
            },
          },
          programCoordinator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              facultyId: true,
              role: true,
            },
          },
          _count: {
            select: {
              questions: true,
              material: true,
              questionGenerationJobs: true,
            },
          },
        },
      });

      if (!course) fail("NOT_FOUND", "Course not found.");

      return ok({ data: course });
    }),

  /**
   * Update a course (fields are optional).
   *
   * - Validates changed coordinator roles
   * - Handles unique courseCode conflict
   */
  updateCourse: adminProcedure
    .input(updateCourseSchema)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;

      const existingCourse = await prisma.course.findUnique({
        where: { id },
        select: { departmentId: true },
      });
      if (!existingCourse) {
        fail("NOT_FOUND", "Course not found.");
        return;
      }

      const effectiveDepartmentId =
        rest.departmentId !== undefined
          ? rest.departmentId
          : existingCourse.departmentId;

      if (!effectiveDepartmentId) {
        fail("BAD_REQUEST", "Department is required for every course.");
      }

      await validateCoordinatorRoles(rest);
      await validateDepartmentCoordinatorAssignments({
        departmentId: effectiveDepartmentId,
        courseCoordinatorId: rest.courseCoordinatorId,
        moduleCoordinatorId: rest.moduleCoordinatorId,
        programCoordinatorId: rest.programCoordinatorId,
      });

      const data: Prisma.CourseUpdateInput = {};
      if (rest.courseCode !== undefined) data.course_code = rest.courseCode;
      if (rest.courseName !== undefined) data.name = rest.courseName;
      if (rest.description !== undefined) data.description = rest.description;
      if (rest.departmentId !== undefined) {
        data.department = { connect: { id: rest.departmentId } };
      }
      if (rest.courseCoordinatorId !== undefined) {
        data.courseCoordinator = { connect: { id: rest.courseCoordinatorId } };
      }
      if (rest.moduleCoordinatorId !== undefined) {
        data.moduleCoordinator = { connect: { id: rest.moduleCoordinatorId } };
      }
      if (rest.programCoordinatorId !== undefined) {
        data.programCoordinator = {
          connect: { id: rest.programCoordinatorId },
        };
      }

      if (Object.keys(data).length === 0)
        fail("BAD_REQUEST", "No valid fields provided for update.");

      try {
        const course = await prisma.course.update({
          where: { id },
          data,
          select: {
            id: true,
            course_code: true,
            name: true,
            department: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            courseCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
            moduleCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
            programCoordinator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        });

        return ok({ data: course, message: "Course updated successfully." });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === "P2025") fail("NOT_FOUND", "Course not found.");
          if (error.code === "P2002")
            fail("CONFLICT", "Course code already exists.");
        }
        fail("INTERNAL_SERVER_ERROR", "Failed to update course.");
      }
    }),

  /**
   * Delete a course.
   *
   * - Prevent deletion if it has related questions, materials, patterns, or generated papers.
   */
  deleteCourse: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const course = await prisma.course.findUnique({
          where: { id: input.id },
          include: {
            _count: {
              select: {
                questions: true,
                material: true,
                questionGenerationJobs: true,
              },
            },
          },
        });

        if (!course) {
          fail("NOT_FOUND", "Course not found.");
          return; // This return is needed for type narrowing, though fail() throws
        }

        const totalRelated = Object.values(course._count).reduce(
          (a, b) => a + b,
          0,
        );
        if (totalRelated > 0) {
          fail(
            "BAD_REQUEST",
            "Cannot delete course with associated questions, materials, patterns, or generated papers. Remove them first.",
          );
        }

        await prisma.course.delete({ where: { id: input.id } });

        return ok({ message: "Course deleted successfully." });
      } catch (error) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          fail("NOT_FOUND", "Course not found.");
        }
        fail("INTERNAL_SERVER_ERROR", "Failed to delete course.");
      }
    }),

  /**
   * Bulk delete courses.
   *
   * - Skips courses with related items (questions/materials/patterns/papers)
   * - Returns counts and skipped IDs
   */
  bulkDeleteCourses: adminProcedure
    .input(bulkIdsSchema)
    .mutation(async ({ input }) => {
      const ids = input.ids;

      // Find deletable vs blocked
      const courses = await prisma.course.findMany({
        where: { id: { in: ids } },
        include: {
          _count: {
            select: {
              questions: true,
              material: true,
              questionGenerationJobs: true,
            },
          },
        },
      });

      const deletableIds: string[] = [];
      const blockedIds: string[] = [];
      for (const c of courses) {
        const total =
          c._count.questions +
          c._count.material +
          c._count.questionGenerationJobs;
        if (total === 0) deletableIds.push(c.id);
        else blockedIds.push(c.id);
      }

      const result = await prisma.course.deleteMany({
        where: { id: { in: deletableIds } },
      });

      return ok({
        message: `Deleted ${result.count} courses. Skipped ${blockedIds.length} with related items.`,
        data: {
          deletedCount: result.count,
          skippedCount: blockedIds.length,
          skippedIds: blockedIds,
        },
      });
    }),

  /**
   * Fetch users eligible to be coordinators.
   *
   * - Only returns active users
   * - Optional `role` filter (e.g., only COURSE_COORDINATOR)
   * - Excludes users already assigned to courses (respects one-to-one constraint)
   * - Sorted by firstName, lastName ASC for nice dropdowns
   */
  getEligibleCoordinators: adminProcedure
    .input(eligibleCoordinatorInput)
    .query(async ({ input }) => {
      const where: Prisma.UserWhereInput = {
        isActive: true, // Only active users can be coordinators
        ...(input.role ? { role: input.role } : {}),
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      };

      const coordinators = await prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          facultyId: true,
          role: true,
          departmentId: true,
          isActive: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });

      return ok({ data: coordinators });
    }),

  /**
   * Fetch users eligible to be coordinators for editing a specific course.
   *
   * - Only returns active users
   * - Optional `role` filter (e.g., only COURSE_COORDINATOR)
   * - Excludes users already assigned to OTHER courses (not the current one)
   * - Includes current coordinators of the course being edited
   * - Sorted by firstName, lastName ASC for nice dropdowns
   */
  getEligibleCoordinatorsForEdit: adminProcedure
    .input(eligibleCoordinatorsForEditInput)
    .query(async ({ input }) => {
      const { role } = input;

      const where: Prisma.UserWhereInput = {
        isActive: true, // Only active users can be coordinators
        ...(role ? { role } : {}),
      };

      const coordinators = await prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          facultyId: true,
          role: true,
          isActive: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });

      return ok({ data: coordinators });
    }),

  // ==================== DEPARTMENT MANAGEMENT ====================
  createDepartment: adminProcedure
    .input(createDepartmentSchema)
    .mutation(async ({ input }) => {
      await validateDepartmentLeadershipRoles({
        hodId: input.hodId,
        deanId: input.deanId,
      });

      const department = await prisma.department.create({
        data: {
          code: input.code,
          name: input.name,
          description: input.description,
          hodId: input.hodId,
          deanId: input.deanId,
        },
      });

      return ok({
        data: department,
        message: "Department created successfully.",
      });
    }),

  getDepartments: adminProcedure.query(async () => {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        hod: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        dean: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            courses: true,
          },
        },
      },
    });

    return ok({ data: departments });
  }),

  updateDepartment: adminProcedure
    .input(updateDepartmentSchema)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const data: Prisma.DepartmentUpdateInput = {};

      await validateDepartmentLeadershipRoles({
        hodId: rest.hodId === null ? undefined : rest.hodId,
        deanId: rest.deanId === null ? undefined : rest.deanId,
      });

      if (rest.code !== undefined) data.code = rest.code;
      if (rest.name !== undefined) data.name = rest.name;
      if (rest.description !== undefined) data.description = rest.description;
      if (rest.hodId !== undefined) {
        data.hod = rest.hodId
          ? { connect: { id: rest.hodId } }
          : { disconnect: true };
      }
      if (rest.deanId !== undefined) {
        data.dean = rest.deanId
          ? { connect: { id: rest.deanId } }
          : { disconnect: true };
      }

      const department = await prisma.department.update({
        where: { id },
        data,
      });

      return ok({
        data: department,
        message: "Department updated successfully.",
      });
    }),

  deleteDepartment: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const linkedCourses = await prisma.course.count({
        where: { departmentId: input.id },
      });
      const linkedUsers = await prisma.user.count({
        where: { departmentId: input.id },
      });

      if (linkedCourses > 0 || linkedUsers > 0) {
        fail(
          "BAD_REQUEST",
          "Cannot delete a department while users or courses are still assigned.",
        );
      }

      await prisma.department.delete({ where: { id: input.id } });

      return ok({ message: "Department deleted successfully." });
    }),
});
