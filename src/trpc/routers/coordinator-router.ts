import { prisma } from "@/lib/prisma";
import { coordinatorProcedure, createTRPCRouter } from "../init";
import * as z from "zod";
import { TRPCError } from "@trpc/server";
import { generateQuestionsWithAI } from "@/lib/ai-question-generator";
import { parsePDFToText, validateParsedContent } from "@/lib/pdf-parser";
import { readFile, unlink } from "fs/promises";
import { join } from "path";

/**
 * Background PDF parsing function (non-blocking)
 * This runs asynchronously after the file is uploaded
 */
async function parsePDFInBackground(materialId: string, filename: string) {
  try {
    console.log(
      `[PDF Parser] Starting background parsing for material ${materialId}`
    );

    // Update status to PROCESSING
    await prisma.course_Material.update({
      where: { id: materialId },
      data: { parsingStatus: "PROCESSING" },
    });

    // Read the uploaded PDF file
    const filePath = join(process.cwd(), "src", "uploads", filename);
    const buffer = await readFile(filePath);

    // Parse the PDF content
    const pdfContent = await parsePDFToText(buffer);
    const validation = validateParsedContent(pdfContent);

    if (!validation.isValid) {
      console.warn(
        `[PDF Parser] Validation warnings for ${materialId}:`,
        validation.warnings
      );
    }

    // Log the parsed content as requested
    console.log(
      `\n========== PARSED PDF CONTENT (Material ID: ${materialId}) ==========`
    );
    console.log(`Filename: ${filename}`);
    console.log(`Pages: ${pdfContent.metadata.pages}`);
    console.log(`Text Length: ${pdfContent.text.length} characters`);
    console.log(`Markdown Length: ${pdfContent.markdown.length} characters`);
    console.log(`\n--- Raw Text (Full) ---`);
    console.log(pdfContent.text);
    console.log(`\n--- Markdown Format (Full) ---`);
    console.log(pdfContent.markdown);
    console.log(`\n--- Full Metadata ---`);
    console.log(JSON.stringify(pdfContent.metadata, null, 2));
    console.log(`========== END OF PARSED CONTENT ==========\n`);

    // Update the database with parsed content
    await prisma.course_Material.update({
      where: { id: materialId },
      data: {
        parsedContent: pdfContent.markdown,
        parsingStatus: "COMPLETED",
        parsingError: null,
      },
    });

    console.log(
      `[PDF Parser] Successfully completed parsing for material ${materialId}`
    );
  } catch (error) {
    console.error(`[PDF Parser] Error parsing material ${materialId}:`, error);

    // Update status to FAILED with error message
    await prisma.course_Material
      .update({
        where: { id: materialId },
        data: {
          parsingStatus: "FAILED",
          parsingError:
            error instanceof Error ? error.message : "Unknown parsing error",
        },
      })
      .catch((dbError) => {
        console.error(`[PDF Parser] Failed to update error status:`, dbError);
      });
  }
}

export const coordinatorRouter = createTRPCRouter({
  // Get coordinator details only
  getCoordinatorProfile: coordinatorProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            email: input.email,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            facultyId: true,
            designation: true,
            role: true,
            isActive: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coordinator not found",
          });
        }

        return user;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch coordinator profile",
        });
      }
    }),

  // Get course details linked to the coordinator
  getCoordinatorCourse: coordinatorProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            email: input.email,
          },
          select: {
            id: true,
            role: true,
            courseCoordinatorCourses: {
              select: {
                id: true,
                course_code: true,
                name: true,
                description: true,
                courseCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                moduleCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                programCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                createdAt: true,
                updatedAt: true,
              },
            },
            moduleCoordinatorCourses: {
              select: {
                id: true,
                course_code: true,
                name: true,
                description: true,
                courseCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                moduleCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                programCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                createdAt: true,
                updatedAt: true,
              },
            },
            programCoordinatorCourses: {
              select: {
                id: true,
                course_code: true,
                name: true,
                description: true,
                courseCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                moduleCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                programCoordinator: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    designation: true,
                  },
                },
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Based on the one-to-one relationship, each user should have at most one course
        // Return the course based on their role
        let course = null;

        if (user.courseCoordinatorCourses.length > 0) {
          course = {
            ...user.courseCoordinatorCourses[0],
            coordinatorType: "COURSE_COORDINATOR" as const,
          };
        } else if (user.moduleCoordinatorCourses.length > 0) {
          course = {
            ...user.moduleCoordinatorCourses[0],
            coordinatorType: "MODULE_COORDINATOR" as const,
          };
        } else if (user.programCoordinatorCourses.length > 0) {
          course = {
            ...user.programCoordinatorCourses[0],
            coordinatorType: "PROGRAM_COORDINATOR" as const,
          };
        }

        return course;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch coordinator course",
        });
      }
    }),

  // Get courses where user is course coordinator for material upload
  getCoursesForMaterialUpload: coordinatorProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const courses = await prisma.course.findMany({
        where: {
          courseCoordinatorId: userId,
        },
        select: {
          id: true,
          course_code: true,
          name: true,
          description: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return courses;
    } catch (_error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch courses for material upload",
      });
    }
  }),

  // Upload course material
  uploadCourseMaterial: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1, "Title is required"),
        filename: z.string().min(1, "Filename is required"),
        materialType: z.enum(["SYLLABUS", "UNIT_PDF"]),
        unit: z.number().min(0).max(5).default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session?.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Verify the user is the course coordinator for this course
        const course = await prisma.course.findFirst({
          where: {
            id: input.courseId,
            courseCoordinatorId: userId,
          },
        });

        if (!course) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only upload materials for courses you coordinate",
          });
        }

        // Create the course material record with PENDING parsing status
        const courseMaterial = await prisma.course_Material.create({
          data: {
            courseId: input.courseId,
            title: input.title,
            filePath: `uploads/${input.filename}`,
            materialType: input.materialType,
            unit: input.materialType === "UNIT_PDF" ? input.unit : 0,
            uploadedById: userId,
            parsingStatus: "PENDING", // Initial status
          },
          include: {
            course: {
              select: {
                name: true,
                course_code: true,
              },
            },
            uploadedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        // Trigger background PDF parsing asynchronously (non-blocking)
        // Using setTimeout to make it truly async and not block the response
        setTimeout(async () => {
          await parsePDFInBackground(courseMaterial.id, input.filename);
        }, 0);

        return courseMaterial;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload course material",
        });
      }
    }),

  // Get uploaded materials for the coordinator
  getUploadedMaterials: coordinatorProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const materials = await prisma.course_Material.findMany({
        where: {
          course: {
            courseCoordinatorId: userId,
          },
        },
        include: {
          course: {
            select: {
              course_code: true,
              name: true,
            },
          },
          uploadedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return materials.map((material) => ({
        id: material.id,
        courseId: material.courseId,
        title: material.title,
        filename: material.filePath.replace("uploads/", ""),
        filePath: material.filePath,
        originalName: material.title,
        size: 0, // We don't store file size in DB, could be calculated if needed
        materialType: material.materialType,
        unit: material.unit,
        uploadedAt: material.createdAt.toISOString(),
        course: material.course,
        uploadedBy: material.uploadedBy,
        parsingStatus: material.parsingStatus,
        parsingError: material.parsingError,
        hasParsedContent: !!material.parsedContent,
      }));
    } catch (_error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch uploaded materials",
      });
    }
  }),

  // Delete a course material
  deleteCourseMaterial: coordinatorProcedure
    .input(
      z.object({
        materialId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session?.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Verify the user owns this material (through course coordination)
        const material = await prisma.course_Material.findFirst({
          where: {
            id: input.materialId,
            course: {
              courseCoordinatorId: userId,
            },
          },
        });

        if (!material) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Material not found or you don't have permission to delete it",
          });
        }

        // Delete the physical file from uploads folder
        try {
          const filePath = join(process.cwd(), "src", material.filePath);
          await unlink(filePath);
          console.log(
            `[File Deletion] Successfully deleted file: ${material.filePath}`
          );
        } catch (fileError) {
          console.warn(
            `[File Deletion] Could not delete file: ${material.filePath}`,
            fileError
          );
          // Continue with DB deletion even if file deletion fails
        }

        // Delete related questions first (if any)
        const deletedQuestions = await prisma.question.deleteMany({
          where: {
            materialId: input.materialId,
          },
        });

        console.log(
          `[DB Cleanup] Deleted ${deletedQuestions.count} related questions`
        );

        // Delete related question generation jobs (if any)
        const deletedJobs = await prisma.question_Generation_Job.deleteMany({
          where: {
            materialId: input.materialId,
          },
        });

        console.log(
          `[DB Cleanup] Deleted ${deletedJobs.count} related generation jobs`
        );

        // Delete the database record
        await prisma.course_Material.delete({
          where: {
            id: input.materialId,
          },
        });

        console.log(
          `[DB Cleanup] Successfully deleted material: ${input.materialId}`
        );

        return {
          success: true,
          filename: material.filePath.replace("uploads/", ""),
          deletedQuestions: deletedQuestions.count,
          deletedJobs: deletedJobs.count,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("[Delete Material] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete course material",
        });
      }
    }),

  // Generate questions from course material
  generateQuestions: coordinatorProcedure
    .input(
      z.object({
        materialId: z.string(),
        questionCounts: z.object({
          easy: z.number().min(0).max(50),
          medium: z.number().min(0).max(50),
          hard: z.number().min(0).max(50),
        }),
        bloomLevels: z.object({
          remember: z.number().min(0).max(50),
          understand: z.number().min(0).max(50),
          apply: z.number().min(0).max(50),
          analyze: z.number().min(0).max(50),
          evaluate: z.number().min(0).max(50),
          create: z.number().min(0).max(50),
        }),
        questionTypes: z.object({
          direct: z.number().min(0).max(50),
          indirect: z.number().min(0).max(50),
          scenarioBased: z.number().min(0).max(50),
          problemBased: z.number().min(0).max(50),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get material with course details
        const material = await prisma.course_Material.findUnique({
          where: { id: input.materialId },
          include: {
            course: true,
            uploadedBy: true,
          },
        });

        if (!material) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Course material not found",
          });
        }

        // Check if user is the course coordinator for this material
        if (material.course.courseCoordinatorId !== ctx.session?.user?.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only the course coordinator can generate questions for this material",
          });
        }

        // Check if material is parsed and embedded
        if (!material.parsedContent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Material must be parsed before questions can be generated. Please re-upload the material.",
          });
        }

        // Fetch chunks for this material and unit
        const chunks = await prisma.material_Chunk.findMany({
          where: {
            materialId: input.materialId,
            unit: material.unit,
          },
          orderBy: {
            chunkIndex: "asc",
          },
        });

        if (chunks.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Material chunks not found. The material may still be processing embeddings. Please wait a moment and try again.",
          });
        }

        // Combine all chunks into a single context
        const materialContent = chunks.map((chunk) => chunk.content).join("\n\n");

        console.log(`[Question Generation] Material ID: ${material.id}`);
        console.log(`[Question Generation] Material Title: ${material.title}`);
        console.log(`[Question Generation] Unit: ${material.unit}`);
        console.log(`[Question Generation] Chunks: ${chunks.length}`);
        console.log(
          `[Question Generation] Combined Content Length: ${materialContent.length} characters`
        );

        // Create question generation job
        const job = await prisma.question_Generation_Job.create({
          data: {
            courseId: material.courseId,
            materialId: input.materialId,
            unit: material.unit,
            initiatedById: ctx.session?.user?.id || "",
            status: "PROCESSING",
            totalQuestions: Object.values(input.questionCounts).reduce(
              (sum, count) => sum + count,
              0
            ),
          },
        });

        // Generate questions using AI service
        const totalQuestions = Object.values(input.questionCounts).reduce(
          (sum, count) => sum + count,
          0
        );

        if (totalQuestions > 0) {
          try {
            // Call AI service to generate questions using chunks
            const generatedQuestions = await generateQuestionsWithAI({
              materialContent: materialContent, // Use combined chunks instead of full parsedContent
              courseName: material.course.name,
              materialName: material.title,
              unit: material.unit,
              questionCounts: input.questionCounts,
              bloomLevels: input.bloomLevels,
              questionTypes: input.questionTypes,
            });

            // Update job status
            await prisma.question_Generation_Job.update({
              where: { id: job.id },
              data: {
                status: "COMPLETED",
              },
            });

            // Return generated questions for review (don't save to DB yet)
            return {
              success: true,
              jobId: job.id,
              totalQuestions,
              questions: generatedQuestions.map((q) => ({
                id: `temp_${Date.now()}_${Math.random()}`,
                question: q.question_text,
                answer: q.answer_text,
                difficultyLevel: q.difficulty_level,
                bloomLevel: q.bloom_level,
                generationType: q.question_type,
                marks: q.marks,
              })),
              courseId: material.courseId,
              materialId: input.materialId,
              unit: material.unit,
              message: `Successfully generated ${totalQuestions} questions for review`,
            };
          } catch (aiError) {
            // Update job with error status
            await prisma.question_Generation_Job.update({
              where: { id: job.id },
              data: {
                status: "FAILED",
                errorMessage:
                  aiError instanceof Error
                    ? aiError.message
                    : "AI generation failed",
              },
            });

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate questions using AI service",
            });
          }
        }

        return {
          success: true,
          jobId: job.id,
          totalQuestions: 0,
          questions: [],
          courseId: material.courseId,
          materialId: input.materialId,
          unit: material.unit,
          message: "No questions generated (total count was 0)",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate questions",
        });
      }
    }),

  // Get generated questions for review
  getGeneratedQuestions: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string().optional(),
        materialId: z.string().optional(),
        status: z
          .enum([
            "DRAFT",
            "CREATED_BY_COURSE_COORDINATOR",
            "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR",
            "UNDER_REVIEW_FROM_MODULE_COORDINATOR",
            "ACCEPTED",
            "REJECTED",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const whereConditions: Record<string, string | { in: string[] }> = {};

        if (input.courseId) {
          whereConditions.courseId = input.courseId;
        }

        if (input.materialId) {
          whereConditions.materialId = input.materialId;
        }

        if (input.status) {
          whereConditions.status = input.status;
        }

        // Only show questions from courses where user is coordinator
        const userCourses = await prisma.course.findMany({
          where: {
            courseCoordinatorId: ctx.session?.user?.id || "",
          },
          select: { id: true },
        });

        if (whereConditions.courseId) {
          // Check if user has access to this specific course
          const hasAccess = userCourses.some(
            (course) => course.id === whereConditions.courseId
          );
          if (!hasAccess) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied to questions from this course",
            });
          }
        } else {
          // Filter to only user's courses
          whereConditions.courseId = {
            in: userCourses.map((course) => course.id),
          };
        }

        const questions = await prisma.question.findMany({
          where: whereConditions,
          include: {
            course: {
              select: {
                name: true,
                course_code: true,
              },
            },
            courseMaterial: {
              select: {
                title: true,
                unit: true,
              },
            },
            feedback: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return questions;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch generated questions",
        });
      }
    }),

  // Update question (edit by coordinator)
  updateQuestion: coordinatorProcedure
    .input(
      z.object({
        questionId: z.string(),
        question: z.string().optional(),
        answer: z.string().optional(),
        difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
        bloomLevel: z
          .enum([
            "REMEMBER",
            "UNDERSTAND",
            "APPLY",
            "ANALYZE",
            "EVALUATE",
            "CREATE",
          ])
          .optional(),
        generationType: z
          .enum(["DIRECT", "INDIRECT", "SCENARIO_BASED", "PROBLEM_BASED"])
          .optional(),
        marks: z.enum(["TWO", "EIGHT", "SIXTEEN"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get question with course details
        const question = await prisma.question.findUnique({
          where: { id: input.questionId },
          include: {
            course: true,
          },
        });

        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Question not found",
          });
        }

        // Check if user is the course coordinator
        if (question.course.courseCoordinatorId !== ctx.session?.user?.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the course coordinator can edit this question",
          });
        }

        const { questionId, ...updateData } = input;

        const updatedQuestion = await prisma.question.update({
          where: { id: questionId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });

        return updatedQuestion;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update question",
        });
      }
    }),

  // Approve questions (move to review)
  approveQuestions: coordinatorProcedure
    .input(
      z.object({
        questionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify all questions belong to coordinator's courses
        const questions = await prisma.question.findMany({
          where: {
            id: { in: input.questionIds },
          },
          include: {
            course: true,
          },
        });

        const invalidQuestions = questions.filter(
          (q) => q.course.courseCoordinatorId !== ctx.session?.user?.id
        );

        if (invalidQuestions.length > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Cannot approve questions from courses you don't coordinate",
          });
        }

        // Update questions to reviewed by CC
        await prisma.question.updateMany({
          where: {
            id: { in: input.questionIds },
          },
          data: {
            reviewedByCc: true,
            ccApprovedAt: new Date(),
            status: "UNDER_REVIEW_FROM_MODULE_COORDINATOR",
          },
        });

        return {
          success: true,
          approvedCount: input.questionIds.length,
          message: `Successfully approved ${input.questionIds.length} questions for module coordinator review`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve questions",
        });
      }
    }),

  // Delete question
  deleteQuestion: coordinatorProcedure
    .input(
      z.object({
        questionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get question with course details
        const question = await prisma.question.findUnique({
          where: { id: input.questionId },
          include: {
            course: true,
          },
        });

        if (!question) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Question not found",
          });
        }

        // Check if user is the course coordinator
        if (question.course.courseCoordinatorId !== ctx.session?.user?.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the course coordinator can delete this question",
          });
        }

        // Can't delete if already reviewed by higher coordinators
        if (question.reviewedByMc || question.reviewedByPc) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete questions that have been reviewed by module or program coordinators",
          });
        }

        await prisma.question.delete({
          where: { id: input.questionId },
        });

        return {
          success: true,
          message: "Question deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete question",
        });
      }
    }),

  // Save reviewed questions to database
  saveReviewedQuestions: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        materialId: z.string(),
        unit: z.number(),
        questions: z.array(
          z.object({
            question: z.string(),
            answer: z.string(),
            difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]),
            bloomLevel: z.enum([
              "REMEMBER",
              "UNDERSTAND",
              "APPLY",
              "ANALYZE",
              "EVALUATE",
              "CREATE",
            ]),
            generationType: z.enum([
              "DIRECT",
              "INDIRECT",
              "SCENARIO_BASED",
              "PROBLEM_BASED",
            ]),
            marks: z.enum(["TWO", "EIGHT", "SIXTEEN"]),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(
          "[DEBUG] saveReviewedQuestions input:",
          JSON.stringify(input, null, 2)
        );
        console.log(
          "[DEBUG] First question marks:",
          input.questions[0]?.marks,
          typeof input.questions[0]?.marks
        );

        const userId = ctx.session?.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Verify user is coordinator for this course
        const course = await prisma.course.findFirst({
          where: {
            id: input.courseId,
            courseCoordinatorId: userId,
          },
        });

        if (!course) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized for this course",
          });
        }

        // Get material name
        const material = await prisma.course_Material.findUnique({
          where: { id: input.materialId },
          select: { title: true },
        });

        // Save all reviewed questions to database
        const dbQuestions = input.questions.map((q) => ({
          courseId: input.courseId,
          materialId: input.materialId,
          unit: input.unit,
          question: q.question,
          answer: q.answer,
          questionType: q.bloomLevel,
          difficultyLevel: q.difficultyLevel,
          bloomLevel: q.bloomLevel,
          generationType: q.generationType,
          marks: q.marks,
          materialName: material?.title || "Unknown Material",
          status: "CREATED_BY_COURSE_COORDINATOR" as const,
        }));

        console.log(
          "[DEBUG] About to save questions to DB:",
          JSON.stringify(dbQuestions.slice(0, 1), null, 2)
        );

        await prisma.question.createMany({
          data: dbQuestions,
        });

        console.log("[DEBUG] Questions saved successfully");

        return {
          success: true,
          savedCount: input.questions.length,
          message: `Successfully saved ${input.questions.length} questions to question bank`,
        };
      } catch (error) {
        console.error("[ERROR] Failed to save questions:", error);
        console.error("[ERROR] Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? `Database error: ${error.message}`
              : "Failed to save reviewed questions",
        });
      }
    }),
});
