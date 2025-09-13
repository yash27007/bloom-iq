import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  coordinatorProcedure,
} from "../init";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const questionJobRouter = createTRPCRouter({
  // Start question generation job
  startQuestionGeneration: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        materialId: z.string(),
        unit: z.number().min(1).max(10),
        questionsPerBloomLevel: z.record(z.string(), z.number()).default({
          REMEMBER: 2,
          UNDERSTAND: 3,
          APPLY: 2,
          ANALYZE: 1,
          EVALUATE: 1,
          CREATE: 1,
        }),
        questionTypes: z
          .array(z.enum(["STRAIGHTFORWARD", "PROBLEM_BASED", "SCENARIO_BASED"]))
          .default(["STRAIGHTFORWARD", "PROBLEM_BASED"]),
        difficultyLevels: z
          .array(z.enum(["EASY", "MEDIUM", "HARD"]))
          .default(["EASY", "MEDIUM"]),
        marks: z
          .array(z.enum(["TWO_MARKS", "EIGHT_MARKS", "SIXTEEN_MARKS"]))
          .default(["TWO_MARKS", "EIGHT_MARKS"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const {
        courseId,
        materialId,
        unit,
        questionsPerBloomLevel,
        questionTypes,
        difficultyLevels,
        marks,
      } = input;

      // Verify user has access to this course
      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          OR: [
            { courseCoordinatorId: ctx.session.user.id },
            { moduleCoordinatorId: ctx.session.user.id },
            { programCoordinatorId: ctx.session.user.id },
          ],
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this course",
        });
      }

      // Verify material exists
      const material = await prisma.courseMaterial.findFirst({
        where: {
          id: materialId,
          courseId,
        },
      });

      if (!material) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course material not found",
        });
      }

      // Create job record
      const job = await prisma.questionGenerationJob.create({
        data: {
          courseId,
          materialId,
          unit,
          initiatedById: ctx.session.user.id,
          bloomLevels: JSON.stringify(Object.keys(questionsPerBloomLevel)),
          questionTypes: JSON.stringify(questionTypes),
          difficultyLevels: JSON.stringify(difficultyLevels),
          questionsPerType: JSON.stringify(questionsPerBloomLevel),
          totalQuestions: Object.values(questionsPerBloomLevel).reduce(
            (sum: number, count: number) => sum + count,
            0
          ),
          status: "PENDING",
        },
      });

      // Always use the new markdown-based Inngest function for all environments
      try {
        console.log("🚀 Attempting to send Inngest event:", {
          event: "documents/process-and-generate",
          jobId: job.id,
          courseId,
          materialId,
          unit
        });
        
        // In development, check if we can use Inngest or need to fallback
        if (process.env.NODE_ENV === "development") {
          try {
            await inngest.send({
              name: "documents/process-and-generate",
              data: {
                jobId: job.id,
                courseId,
                materialId,
                unit,
                questionsPerBloomLevel,
                questionTypes,
                difficultyLevels,
                marks,
              },
            });
            console.log("✅ Inngest event sent successfully for job:", job.id);
          } catch (inngestError) {
            // Suppress unused variable warning - we don't need to use inngestError
            void inngestError;
            console.log("⚠️ Inngest not available in development, processing directly...");
            
            // Import and run the processing function directly
            const { processQuestionGenerationDirectly } = await import("@/lib/direct-question-processor");
            
            // Run the function directly without Inngest (fire and forget)
            setImmediate(async () => {
              try {
                await processQuestionGenerationDirectly({
                  jobId: job.id,
                  courseId,
                  materialId,
                  unit,
                  questionsPerBloomLevel,
                  questionTypes,
                  difficultyLevels,
                  marks,
                });
                console.log("✅ Direct processing completed for job:", job.id);
              } catch (directError) {
                console.error("❌ Direct processing failed:", directError);
              }
            });
            
            console.log("✅ Processing started directly (background) for job:", job.id);
          }
        } else {
          // Production: Use Inngest normally
          await inngest.send({
            name: "documents/process-and-generate",
            data: {
              jobId: job.id,
              courseId,
              materialId,
              unit,
              questionsPerBloomLevel,
              questionTypes,
              difficultyLevels,
              marks,
            },
          });
          console.log("✅ Inngest event sent successfully for job:", job.id);
        }
        
      } catch (error) {
        console.error("❌ Failed to trigger question generation:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error,
          error
        });
        
        // Update job status to failed
        await prisma.questionGenerationJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Failed to start processing",
          },
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start question generation: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      return {
        jobId: job.id,
        status: "PENDING",
        message: "Question generation job started successfully",
      };
    }),

  // Get job status
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      const job = await prisma.questionGenerationJob.findUnique({
        where: { id: input.jobId },
        include: {
          course: {
            select: {
              courseName: true,
              courseCode: true,
            },
          },
          material: {
            select: {
              title: true,
              materialType: true,
            },
          },
          initiatedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      // Check if user has access to this job
      const hasAccess =
        job.initiatedById === ctx.session.user.id ||
        ctx.session.user.role === "ADMIN";

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        totalQuestions: job.totalQuestions,
        generatedCount: job.generatedCount,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        course: job.course,
        material: job.material,
        initiatedBy: job.initiatedBy,
        unit: job.unit,
      };
    }),

  // Get all jobs for a course
  getCourseJobs: coordinatorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify access to course
      const course = await prisma.course.findFirst({
        where: {
          id: input.courseId,
          OR: [
            { courseCoordinatorId: ctx.session.user.id },
            { moduleCoordinatorId: ctx.session.user.id },
            { programCoordinatorId: ctx.session.user.id },
          ],
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this course",
        });
      }

      const jobs = await prisma.questionGenerationJob.findMany({
        where: { courseId: input.courseId },
        include: {
          material: {
            select: {
              title: true,
              materialType: true,
            },
          },
          initiatedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return jobs.map((job) => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        totalQuestions: job.totalQuestions,
        generatedCount: job.generatedCount,
        unit: job.unit,
        createdAt: job.createdAt,
        material: job.material,
        initiatedBy: job.initiatedBy,
        errorMessage: job.errorMessage,
      }));
    }),

  // Get generated questions from a job
  getJobQuestions: coordinatorProcedure
    .input(
      z.object({
        jobId: z.string(),
        page: z.number().default(1),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const { jobId, page, limit } = input;

      // Verify job exists and user has access
      const job = await prisma.questionGenerationJob.findUnique({
        where: { id: jobId },
        include: { course: true },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      // Check course access
      const hasAccess =
        job.course.courseCoordinatorId === ctx.session.user.id ||
        job.course.moduleCoordinatorId === ctx.session.user.id ||
        job.course.programCoordinatorId === ctx.session.user.id ||
        ctx.session.user.role === "ADMIN";

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Get questions generated after job creation
      const questions = await prisma.question.findMany({
        where: {
          courseId: job.courseId,
          createdAt: {
            gte: job.createdAt,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalCount = await prisma.question.count({
        where: {
          courseId: job.courseId,
          createdAt: {
            gte: job.createdAt,
          },
        },
      });

      return {
        questions: questions.map((q) => ({
          id: q.id,
          questionText: q.question,
          questionType: q.questionType,
          bloomLevel: q.bloomLevel,
          difficultyLevel: q.difficultyLevel,
          marks: q.marks,
          unit: q.unit,
          topic: q.topic,
          status: q.status,
          options: q.optionA
            ? {
                a: q.optionA,
                b: q.optionB,
                c: q.optionC,
                d: q.optionD,
              }
            : undefined,
          correctAnswer: q.correctAnswer,
          sampleAnswer: q.answer,
          createdAt: q.createdAt,
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      };
    }),

  // Cancel a job (if still pending)
  cancelJob: coordinatorProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const job = await prisma.questionGenerationJob.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (
        job.initiatedById !== ctx.session.user.id &&
        ctx.session.user.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own jobs",
        });
      }

      if (job.status !== "PENDING" && job.status !== "PROCESSING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel completed or failed jobs",
        });
      }

      await prisma.questionGenerationJob.update({
        where: { id: input.jobId },
        data: {
          status: "FAILED",
          errorMessage: "Cancelled by user",
          progress: 0,
        },
      });

      return { success: true, message: "Job cancelled successfully" };
    }),
});
