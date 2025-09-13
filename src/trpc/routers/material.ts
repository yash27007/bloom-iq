import { z } from "zod";
import {
  createTRPCRouter,
  coordinatorProcedure,
  protectedProcedure,
} from "../init";
import { prisma } from "@/lib/prisma";
import { MaterialType } from "@/generated/prisma";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

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
      const { courseId, title, unit, materialType, fileName, fileBase64 } =
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

      // Create uploads directory structure if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const courseDir = path.join(uploadsDir, courseId);
      if (!existsSync(courseDir)) {
        mkdirSync(courseDir, { recursive: true });
      }

      // Create material record first to get the ID
      const material = await prisma.courseMaterial.create({
        data: {
          courseId,
          title,
          unit,
          filePath: '', // Will be updated after file save
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

      // Save file using material ID as filename
      const fileExtension = path.extname(fileName);
      const savedFileName = `${material.id}${fileExtension}`;
      const savedPath = path.join(courseDir, savedFileName);
      const filePath = `uploads/${courseId}/${savedFileName}`;
      
      // Convert base64 to buffer and save file
      const fileBuffer = Buffer.from(fileBase64, 'base64');
      writeFileSync(savedPath, fileBuffer);

      console.log(`✅ Saved file to: ${savedPath}`);

      // Update material record with correct file path
      const updatedMaterial = await prisma.courseMaterial.update({
        where: { id: material.id },
        data: { filePath },
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

      return updatedMaterial;
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
