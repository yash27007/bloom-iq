import { Role } from "@/generated/prisma";
import { z } from "zod";

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    facultyId: z.string().min(2).max(100),
    role : z.enum([Role.ADMIN, Role.CONTROLLER_OF_EXAMINATION,Role.COURSE_COORDINATOR,Role.MODULE_COORDINATOR,Role.PROGRAM_COORDINATOR]),
    email: z.email(),
    password: z.string().min(8).max(100),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignUpSchema = z.infer<typeof signUpSchema>;