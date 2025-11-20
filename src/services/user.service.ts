/**
 * User Service
 *
 * Handles all user-related business logic including:
 * - User creation and validation
 * - User retrieval with pagination and filtering
 * - User updates with constraint handling
 * - User deletion with dependency checks
 */

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash-password";
import { PrismaClientKnownRequestError } from "@/generated/prisma/runtime/library";
import type { Prisma, Role } from "@/generated/prisma";
import { paginate, safeOrderBy } from "@/validators/common.validators";
import {
  userSortableKeys,
  type UserSortableKey,
} from "@/validators/user.validators";
import type { ServiceResult } from "./types";

/**
 * User data transfer objects
 */
export type CreateUserInput = {
  firstName: string;
  lastName: string;
  facultyId: string;
  email: string;
  password: string;
  role: Role;
  designation: "ASSISTANT_PROFESSOR" | "ASSOCIATE_PROFESSOR" | "PROFESSOR";
};

export type UpdateUserInput = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  facultyId?: string;
  designation?: "ASSISTANT_PROFESSOR" | "ASSOCIATE_PROFESSOR" | "PROFESSOR";
  role?: Role;
  isActive?: boolean;
  password?: string;
};

export type ListUsersInput = {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
  sortBy?: string;
  sortOrder: "asc" | "desc";
};

export type UserResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  facultyId: string;
  role: Role;
  designation: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  courseCoordinatorCourses?: Array<{
    id: string;
    course_code: string;
    name: string;
  }>;
  moduleCoordinatorCourses?: Array<{
    id: string;
    course_code: string;
    name: string;
  }>;
  programCoordinatorCourses?: Array<{
    id: string;
    course_code: string;
    name: string;
  }>;
};

/**
 * Service class for user operations
 */
export class UserService {
  /**
   * Create a new user
   */
  static async createUser(
    input: CreateUserInput
  ): Promise<ServiceResult<UserResponse>> {
    try {
      const user = await prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          facultyId: input.facultyId,
          email: input.email,
          password: await hashPassword(input.password),
          role: input.role,
          designation: input.designation,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          facultyId: true,
          role: true,
          designation: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        data: user as UserResponse,
        message: "User created successfully.",
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("email")) {
          throw new Error("User with this email already exists.");
        }
        if (target?.includes("facultyId")) {
          throw new Error("User with this faculty ID already exists.");
        }
        throw new Error("User with this information already exists.");
      }
      throw new Error("Failed to create user.");
    }
  }

  /**
   * List users with pagination, search, and filtering
   */
  static async listUsers(
    input: ListUsersInput
  ): Promise<ServiceResult<UserResponse[]>> {
    const { page, limit, search, role, isActive, sortBy, sortOrder } = input;
    const { skip, take } = paginate(page, limit);

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
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
          isActive: true,
          createdAt: true,
          updatedAt: true,
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

    return {
      data: users as UserResponse[],
      page,
      limit,
      total,
    };
  }

  /**
   * Get user by ID with full details
   */
  static async getUserById(id: string): Promise<ServiceResult<UserResponse>> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        facultyId: true,
        role: true,
        designation: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    if (!user) {
      throw new Error("User not found.");
    }

    return { data: user as UserResponse };
  }

  /**
   * Update user details
   */
  static async updateUser(
    input: UpdateUserInput
  ): Promise<ServiceResult<UserResponse>> {
    const { id, password, ...rest } = input;

    const data: Prisma.UserUpdateInput = {};
    if (rest.firstName !== undefined) data.firstName = rest.firstName;
    if (rest.lastName !== undefined) data.lastName = rest.lastName;
    if (rest.email !== undefined) data.email = rest.email;
    if (rest.facultyId !== undefined) data.facultyId = rest.facultyId;
    if (rest.role !== undefined) data.role = rest.role;
    if (rest.designation !== undefined) data.designation = rest.designation;
    if (rest.isActive !== undefined) data.isActive = rest.isActive;
    if (password) data.password = await hashPassword(password);

    if (Object.keys(data).length === 0) {
      throw new Error("No valid fields provided for update.");
    }

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
          isActive: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      return {
        data: user as UserResponse,
        message: "User updated successfully.",
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("User not found.");
        }
        if (error.code === "P2002") {
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes("email")) {
            throw new Error("Email already exists.");
          }
          if (target?.includes("facultyId")) {
            throw new Error("Faculty ID already exists.");
          }
          throw new Error("A user with this information already exists.");
        }
      }
      throw new Error("Failed to update user.");
    }
  }

  /**
   * Delete user with dependency checks
   */
  static async deleteUser(id: string): Promise<ServiceResult<null>> {
    try {
      // Check if user is assigned to any courses
      const blockingAssignments = await prisma.course.count({
        where: {
          OR: [
            { courseCoordinatorId: id },
            { moduleCoordinatorId: id },
            { programCoordinatorId: id },
          ],
        },
      });

      if (blockingAssignments > 0) {
        throw new Error(
          "Cannot delete a user who is assigned to courses. Reassign those courses first."
        );
      }

      await prisma.user.delete({ where: { id } });

      return { message: "User deleted successfully." };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error("User not found.");
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete user.");
    }
  }

  /**
   * Bulk delete users
   */
  static async deleteUsers(ids: string[]): Promise<ServiceResult<null>> {
    try {
      // Check for blocking assignments
      const blockingAssignments = await prisma.course.count({
        where: {
          OR: [
            { courseCoordinatorId: { in: ids } },
            { moduleCoordinatorId: { in: ids } },
            { programCoordinatorId: { in: ids } },
          ],
        },
      });

      if (blockingAssignments > 0) {
        throw new Error(
          "Cannot delete users who are assigned to courses. Reassign those courses first."
        );
      }

      const result = await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });

      return {
        message: `Successfully deleted ${result.count} user(s).`,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete users.");
    }
  }
}
