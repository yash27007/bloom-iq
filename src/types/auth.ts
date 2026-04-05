import * as z from "zod";

export const signUpSchema = z
  .object({
    firstName: z
      .string()
      .min(2, { error: "First name must be at least 2 characters long" }),
    lastName: z
      .string()
      .min(1, { error: "Last name must be at least one character long" }),
    facultyId: z
      .string()
      .min(2, { error: "FacultyId must be at least 2 characters long" }),
    email: z.email({ error: "Please enter a valid email address" }),
    // password: z.string().regex(
    //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
    //   { error: "Password must be at least 6 characters, with an uppercase letter, a lowercase letter, a number, and a special character" }
    // ),
    password: z
      .string()
      .min(6, { error: "Password must be atleast 6 characters" }),
    departmentId: z.string().uuid().optional(),
    role: z.enum([
      "COURSE_COORDINATOR",
      "MODULE_COORDINATOR",
      "PROGRAM_COORDINATOR",
      "HOD",
      "DEAN",
      "CONTROLLER_OF_EXAMINATION",
      "ADMIN",
    ]),
    designation: z.enum([
      "ASSISTANT_PROFESSOR",
      "ASSOCIATE_PROFESSOR",
      "PROFESSOR",
    ]),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "ADMIN" && !data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "Department is required for all faculty roles",
      });
    }
  });

export const loginSchema = z.object({
  email: z.email().min(2, { error: "Enter a valid email" }),
  password: z
    .string()
    .min(6, { error: "Password must be atleast 6 characters long" }),
});
