import { adminProcedure, createTRPCRouter } from "@/trpc/init";
import { signUpSchema } from "@/types/auth-schema";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/app/actions";
import { PrismaClientKnownRequestError } from "@/generated/prisma/runtime/library";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Role } from "@/generated/prisma";

export const adminRouter = createTRPCRouter({
  // user crud
  addUser: adminProcedure.input(signUpSchema).mutation(async ({ input }) => {
    console.log("Admin adding user:", input);

    try {
      const user = await prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          facultyId: input.facultyId,
          email: input.email,
          password: await hashPassword(input.password),
          role: input.role,
        },
      });

      return {
        success: true,
        message: "User created successfully by admin",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          facultyId: user.facultyId,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Error creating user:", error);

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          // Handle unique constraint violations
          const target = error.meta?.target as string[] | undefined;
          let message = "A user with this information already exists";

          if (target?.includes("email")) {
            message = "User with this email already exists";
          } else if (target?.includes("facultyId")) {
            message = "User with this faculty ID already exists";
          }

          throw new TRPCError({
            message,
            code: "CONFLICT",
          });
        }
      }

      throw new TRPCError({
        message: "Failed to create user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  }),

  getUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        role: z.nativeEnum(Role).optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, role } = input;
      const skip = (page - 1) * limit;

      const where = role ? { role } : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            facultyId: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await prisma.user.delete({
          where: { id: input.id },
        });

        return {
          success: true,
          message: "User deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting user:", error);

        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === "P2025") {
            throw new TRPCError({
              message: "User not found",
              code: "NOT_FOUND",
            });
          }
        }

        throw new TRPCError({
          message: "Failed to delete user",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.nativeEnum(Role),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const user = await prisma.user.update({
          where: { id: input.id },
          data: { role: input.role },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        });

        return {
          success: true,
          message: "User role updated successfully",
          user,
        };
      } catch (error) {
        console.error("Error updating user role:", error);

        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === "P2025") {
            throw new TRPCError({
              message: "User not found",
              code: "NOT_FOUND",
            });
          }
        }

        throw new TRPCError({
          message: "Failed to update user role",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});
