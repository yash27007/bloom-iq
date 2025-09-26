import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/types/auth";
import { hashPassword } from "@/lib/hash-password";
import { PrismaClientKnownRequestError } from "@/generated/prisma/runtime/library";
import { TRPCError } from "@trpc/server";
export const userRouter = createTRPCRouter({
  signUp: baseProcedure.input(signUpSchema).mutation(async ({ input }) => {
    console.log("Signning in the user");
    console.log("User data:", input);
    try {
      await prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          facultyId: input.facultyId,
          email: input.email,
          password: await hashPassword(input.password),
          role: input.role,
          designation: input.designation,
        },
      });

      return {
        success: true,
        message: "User created successfully",
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
        message:
          error instanceof Error ? error.message : "Failed to create user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  }),
});
