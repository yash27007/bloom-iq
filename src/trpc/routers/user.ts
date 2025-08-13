import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import * as argon2 from "argon2";
import { Role } from "@/generated/prisma";

export const userRouter = createTRPCRouter({
  // Admin only: Get all users
  getUsers: adminProcedure.query(async () => {
    return await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Admin only: Create user
  createUser: adminProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email(),
        role: z.nativeEnum(Role),
      })
    )
    .mutation(async ({ input }) => {
      const { firstName, lastName, email, role } = input;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Hash the email to use as default password
      const hashedPassword = await argon2.hash(email);

      return await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          role,
          password: hashedPassword,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
    }),

  // Admin only: Update user
  updateUser: adminProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.nativeEnum(Role).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      if (updateData.email) {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findFirst({
          where: {
            email: updateData.email,
            NOT: { id },
          },
        });

        if (existingUser) {
          throw new Error("Email is already taken by another user");
        }
      }

      return await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });
    }),

  // Admin only: Delete user
  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.user.delete({
        where: { id: input.id },
      });
    }),

  // Protected: Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),

  // Protected: Update password
  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { currentPassword, newPassword } = input;
      const userId = ctx.session.user.id;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.password) {
        throw new Error("User not found");
      }

      // Verify current password
      const isValidPassword = await argon2.verify(
        user.password,
        currentPassword
      );
      if (!isValidPassword) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await argon2.hash(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return { success: true };
    }),
});
