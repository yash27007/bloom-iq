/**
 * Course Service
 *
 * Handles all course-related business logic including:
 * - Course creation with coordinator validation
 * - Course retrieval with pagination and filtering
 * - Course updates with coordinator role checks
 * - Course deletion with dependency checks
 * - Coordinator eligibility validation
 */

import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@/generated/prisma/runtime/library";
import type { Prisma, Role } from "@/generated/prisma";
import { paginate, safeOrderBy } from "@/validators/common.validators";
import {
  courseSortableKeys,
  type CourseSortableKey,
} from "@/validators/course.validators";
import type { ServiceResult } from "./types";

/**
 * Course data transfer objects
 */
export type CreateCourseInput = {
  course_code: string;
  name: string;
  description: string;
  courseCoordinatorId: string;
  moduleCoordinatorId: string;
  programCoordinatorId: string;
};

export type UpdateCourseInput = {
  id: string;
  course_code?: string;
  name?: string;
  description?: string;
  courseCoordinatorId?: string;
  moduleCoordinatorId?: string;
  programCoordinatorId?: string;
};

export type ListCoursesInput = {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder: "asc" | "desc";
};

export type CourseResponse = {
  id: string;
  course_code: string;
  name: string;
  description?: string;
  courseCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    designation: string;
  };
  moduleCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    designation: string;
  };
  programCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    designation: string;
  };
  _count?: {
    questions: number;
    material: number;
    questionGenerationJobs: number;
  };
};

export type EligibleCoordinator = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  facultyId: string;
  designation: string;
};

/**
 * Service class for course operations
 */
export class CourseService {
  /**
   * Validate coordinator roles and active status
   */
  private static async validateCoordinatorRoles(input: {
    courseCoordinatorId?: string;
    moduleCoordinatorId?: string;
    programCoordinatorId?: string;
  }): Promise<void> {
    const { courseCoordinatorId, moduleCoordinatorId, programCoordinatorId } =
      input;

    if (courseCoordinatorId) {
      const user = await prisma.user.findUnique({
        where: { id: courseCoordinatorId },
        select: { role: true, isActive: true },
      });

      if (!user) {
        throw new Error("Course coordinator not found.");
      }
      if (user.role !== "COURSE_COORDINATOR") {
        throw new Error(
          "Selected course coordinator must have COURSE_COORDINATOR role."
        );
      }
      if (!user.isActive) {
        throw new Error("Course coordinator must be active.");
      }
    }

    if (moduleCoordinatorId) {
      const user = await prisma.user.findUnique({
        where: { id: moduleCoordinatorId },
        select: { role: true, isActive: true },
      });

      if (!user) {
        throw new Error("Module coordinator not found.");
      }
      if (user.role !== "MODULE_COORDINATOR") {
        throw new Error(
          "Selected module coordinator must have MODULE_COORDINATOR role."
        );
      }
      if (!user.isActive) {
        throw new Error("Module coordinator must be active.");
      }
    }

    if (programCoordinatorId) {
      const user = await prisma.user.findUnique({
        where: { id: programCoordinatorId },
        select: { role: true, isActive: true },
      });

      if (!user) {
        throw new Error("Program coordinator not found.");
      }
      if (user.role !== "PROGRAM_COORDINATOR") {
        throw new Error(
          "Selected program coordinator must have PROGRAM_COORDINATOR role."
        );
      }
      if (!user.isActive) {
        throw new Error("Program coordinator must be active.");
      }
    }
  }

  /**
   * Create a new course
   */
  static async createCourse(
    input: CreateCourseInput
  ): Promise<ServiceResult<CourseResponse>> {
    // Validate coordinator roles
    await this.validateCoordinatorRoles(input);

    try {
      const course = await prisma.course.create({
        data: {
          course_code: input.course_code,
          name: input.name,
          description: input.description,
          courseCoordinator: { connect: { id: input.courseCoordinatorId } },
          moduleCoordinator: { connect: { id: input.moduleCoordinatorId } },
          programCoordinator: { connect: { id: input.programCoordinatorId } },
        },
        select: {
          id: true,
          course_code: true,
          name: true,
          description: true,
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
        },
      });

      return {
        data: course as CourseResponse,
        message: "Course created successfully.",
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Course code already exists.");
        }
        if (error.code === "P2003") {
          throw new Error("One or more coordinators not found.");
        }
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to create course.");
    }
  }

  /**
   * List courses with pagination, search, and filtering
   */
  static async listCourses(
    input: ListCoursesInput
  ): Promise<ServiceResult<CourseResponse[]>> {
    const { page, limit, search, sortBy, sortOrder } = input;
    const { skip, take } = paginate(page, limit);

    const where: Prisma.CourseWhereInput = {};
    if (search) {
      where.OR = [
        { course_code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
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
          description: true,
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

    return {
      data: courses as CourseResponse[],
      page,
      limit,
      total,
    };
  }

  /**
   * Get course by ID with full details
   */
  static async getCourseById(
    id: string
  ): Promise<ServiceResult<CourseResponse>> {
    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        course_code: true,
        name: true,
        description: true,
        courseCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            facultyId: true,
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
            facultyId: true,
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
            facultyId: true,
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
    });

    if (!course) {
      throw new Error("Course not found.");
    }

    return { data: course as CourseResponse };
  }

  /**
   * Update course details
   */
  static async updateCourse(
    input: UpdateCourseInput
  ): Promise<ServiceResult<CourseResponse>> {
    const { id, ...rest } = input;

    // Validate coordinator roles if any are being updated
    await this.validateCoordinatorRoles({
      courseCoordinatorId: rest.courseCoordinatorId,
      moduleCoordinatorId: rest.moduleCoordinatorId,
      programCoordinatorId: rest.programCoordinatorId,
    });

    const data: Prisma.CourseUpdateInput = {};
    if (rest.course_code !== undefined) data.course_code = rest.course_code;
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.description !== undefined) data.description = rest.description;
    if (rest.courseCoordinatorId !== undefined) {
      data.courseCoordinator = { connect: { id: rest.courseCoordinatorId } };
    }
    if (rest.moduleCoordinatorId !== undefined) {
      data.moduleCoordinator = { connect: { id: rest.moduleCoordinatorId } };
    }
    if (rest.programCoordinatorId !== undefined) {
      data.programCoordinator = { connect: { id: rest.programCoordinatorId } };
    }

    if (Object.keys(data).length === 0) {
      throw new Error("No valid fields provided for update.");
    }

    try {
      const course = await prisma.course.update({
        where: { id },
        data,
        select: {
          id: true,
          course_code: true,
          name: true,
          description: true,
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
        },
      });

      return {
        data: course as CourseResponse,
        message: "Course updated successfully.",
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Course not found.");
        }
        if (error.code === "P2002") {
          throw new Error("Course code already exists.");
        }
        if (error.code === "P2003") {
          throw new Error("One or more coordinators not found.");
        }
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update course.");
    }
  }

  /**
   * Delete a course
   */
  static async deleteCourse(id: string): Promise<ServiceResult<null>> {
    try {
      await prisma.course.delete({ where: { id } });
      return { message: "Course deleted successfully." };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error("Course not found.");
      }
      throw new Error("Failed to delete course.");
    }
  }

  /**
   * Bulk delete courses
   */
  static async deleteCourses(ids: string[]): Promise<ServiceResult<null>> {
    try {
      const result = await prisma.course.deleteMany({
        where: { id: { in: ids } },
      });

      return {
        message: `Successfully deleted ${result.count} course(s).`,
      };
    } catch (error) {
      throw new Error("Failed to delete courses.");
    }
  }

  /**
   * Get eligible coordinators by role (excluding already assigned ones)
   */
  static async getEligibleCoordinators(
    role: Role,
    excludeCourseId?: string
  ): Promise<ServiceResult<EligibleCoordinator[]>> {
    // Find all active users with the specified role
    const eligibleUsers = await prisma.user.findMany({
      where: {
        role,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        facultyId: true,
        designation: true,
      },
    });

    // Find users already assigned to courses (excluding the course being edited)
    const assignedUserIds = new Set<string>();

    if (role === "COURSE_COORDINATOR") {
      const courses = await prisma.course.findMany({
        where: excludeCourseId ? { id: { not: excludeCourseId } } : {},
        select: { courseCoordinatorId: true },
      });
      courses.forEach((c) => assignedUserIds.add(c.courseCoordinatorId));
    } else if (role === "MODULE_COORDINATOR") {
      const courses = await prisma.course.findMany({
        where: excludeCourseId ? { id: { not: excludeCourseId } } : {},
        select: { moduleCoordinatorId: true },
      });
      courses.forEach((c) => assignedUserIds.add(c.moduleCoordinatorId));
    } else if (role === "PROGRAM_COORDINATOR") {
      const courses = await prisma.course.findMany({
        where: excludeCourseId ? { id: { not: excludeCourseId } } : {},
        select: { programCoordinatorId: true },
      });
      courses.forEach((c) => assignedUserIds.add(c.programCoordinatorId));
    }

    // Filter out assigned users
    const available = eligibleUsers.filter(
      (user) => !assignedUserIds.has(user.id)
    );

    return { data: available };
  }
}
