import { z } from "zod";
import {
  createTRPCRouter,
  coordinatorProcedure,
  protectedProcedure,
} from "../init";
import { prisma } from "@/lib/prisma";
import { MaterialType } from "@/generated/prisma";
import {
  uploadFileToSupabase,
  deleteFileFromSupabase,
} from "@/lib/supabase-storage";

export const materialRouter = createTRPCRouter({
  // Upload course material
  uploadMaterial: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1, "Title is required"),
        unit: z.number().optional(), // null for syllabus
        filePath: z.string().min(1, "File path is required"),
        materialType: z.nativeEnum(MaterialType),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { courseId, title, unit, filePath, materialType } = input;
      const userId = ctx.session.user.id;

      // Check if user has access to this course
      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          OR: [
            { courseCoordinatorId: userId },
            { moduleCoordinatorId: userId },
            { programCoordinatorId: userId },
          ],
        },
      });

      if (!course) {
        throw new Error("Course not found or you do not have access to it");
      }

      return await prisma.courseMaterial.create({
        data: {
          courseId,
          title,
          unit,
          filePath,
          materialType,
          uploadedById: userId,
        },
        include: {
          course: {
            select: {
              courseCode: true,
              courseName: true,
            },
          },
          uploadedBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    }),

  // Upload material with file to Supabase
  uploadMaterialWithFile: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1, "Title is required"),
        unit: z.number().optional(),
        materialType: z.nativeEnum(MaterialType),
        fileBase64: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { courseId, title, unit, materialType, fileBase64, fileName } =
        input;
      const userId = ctx.session.user.id;

      // Check if user has access to this course
      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          OR: [
            { courseCoordinatorId: userId },
            { moduleCoordinatorId: userId },
            { programCoordinatorId: userId },
          ],
        },
      });

      if (!course) {
        throw new Error("Course not found or you do not have access to it");
      }

      // Convert base64 to File-like object
      const buffer = Buffer.from(fileBase64, "base64");
      const file = new File([buffer], fileName, { type: "application/pdf" });

      // Upload to Supabase
      const folderPath = `courses/${courseId}/${materialType.toLowerCase()}`;
      const publicUrl = await uploadFileToSupabase(file, folderPath);

      if (!publicUrl) {
        throw new Error("Failed to upload file to storage");
      }

      // Save material record to database
      return await prisma.courseMaterial.create({
        data: {
          courseId,
          title,
          unit,
          filePath: publicUrl,
          materialType,
          uploadedById: userId,
        },
        include: {
          course: {
            select: {
              courseCode: true,
              courseName: true,
            },
          },
          uploadedBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    }),

  // Get materials for a course
  getMaterialsByCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Check if user has access to this course
      if (userRole !== "ADMIN") {
        const course = await prisma.course.findFirst({
          where: {
            id: input.courseId,
            OR: [
              { courseCoordinatorId: userId },
              { moduleCoordinatorId: userId },
              { programCoordinatorId: userId },
            ],
          },
        });

        if (!course) {
          throw new Error("Course not found or you do not have access to it");
        }
      }

      return await prisma.courseMaterial.findMany({
        where: { courseId: input.courseId },
        include: {
          uploadedBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { uploadedAt: "desc" },
      });
    }),

  // Delete material
  deleteMaterial: coordinatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Get the material with course info
      const material = await prisma.courseMaterial.findUnique({
        where: { id: input.id },
        include: {
          course: true,
        },
      });

      if (!material) {
        throw new Error("Material not found");
      }

      // Check if user has access (admin or course coordinator who uploaded it)
      if (userRole !== "ADMIN" && material.uploadedById !== userId) {
        // Check if user is coordinator of this course
        const hasAccess =
          material.course.courseCoordinatorId === userId ||
          material.course.moduleCoordinatorId === userId ||
          material.course.programCoordinatorId === userId;

        if (!hasAccess) {
          throw new Error("You do not have permission to delete this material");
        }
      }

      return await prisma.courseMaterial.delete({
        where: { id: input.id },
      });
    }),

  // Get material by ID
  getMaterialById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const material = await prisma.courseMaterial.findUnique({
        where: { id: input.id },
        include: {
          course: true,
          uploadedBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!material) {
        throw new Error("Material not found");
      }

      // Check if user has access to this course
      if (userRole !== "ADMIN") {
        const hasAccess =
          material.course.courseCoordinatorId === userId ||
          material.course.moduleCoordinatorId === userId ||
          material.course.programCoordinatorId === userId;

        if (!hasAccess) {
          throw new Error("You do not have access to this material");
        }
      }

      return material;
    }),
});
