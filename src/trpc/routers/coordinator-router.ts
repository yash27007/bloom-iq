import { prisma } from "@/lib/prisma";
import { coordinatorProcedure, createTRPCRouter } from "../init";
import * as z from "zod";
import { TRPCError } from "@trpc/server";
import { generateQuestionsWithAI } from "@/lib/ai-question-generator";
import { parsePDFToText } from "@/lib/pdf-parser";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import { logger } from "@/lib/logger";
import { aiService, AIProviderType } from "@/services/ai";

// NOTE: parsePDFInBackground has been moved to MaterialService
// This old function is kept for reference but should not be used
// MaterialService.parsePDFInBackground handles both parsing AND embedding

// Function calling interface for chat
interface FunctionCall {
  name: "search_material" | "none";
  arguments?: {
    query?: string;
    reason?: string;
  };
}

/**
 * Sanitize chat response to remove garbled text and ensure clean output
 */
function sanitizeChatResponse(response: string): string {
  if (!response) return "";

  // Remove any non-printable characters except newlines, tabs, and standard punctuation
  let cleaned = response
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, "") // Remove control characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width characters
    .trim();

  // Check if response contains too many non-ASCII characters (likely garbled)
  const asciiRatio =
    (cleaned.match(/[\x20-\x7E\n\t]/g) || []).length /
    Math.max(cleaned.length, 1);

  if (asciiRatio < 0.7 && cleaned.length > 50) {
    // Response is likely garbled, try to extract English parts
    logger.warn("CoordinatorRouter", "Detected potentially garbled response", {
      asciiRatio,
      length: cleaned.length,
      preview: cleaned.substring(0, 100),
    });

    // Extract sentences that are mostly English
    const sentences = cleaned.split(/[.!?]\s+/);
    const englishSentences = sentences.filter((sentence) => {
      const sentenceAsciiRatio =
        (sentence.match(/[\x20-\x7E]/g) || []).length /
        Math.max(sentence.length, 1);
      return sentenceAsciiRatio > 0.8 && sentence.length > 10;
    });

    if (englishSentences.length > 0) {
      cleaned =
        englishSentences.join(". ") + (cleaned.endsWith(".") ? "." : "");
    } else {
      // If no good sentences found, return a fallback message as Kai
      cleaned =
        "I'm Kai, and I apologize, but I'm having trouble generating a clear response right now. Could you please rephrase your question?";
    }
  }

  // Additional check: if response is mostly non-English characters, replace it
  if (cleaned.length > 20) {
    const englishCharCount = (cleaned.match(/[a-zA-Z0-9\s.,!?;:'"()-]/g) || [])
      .length;
    const englishRatio = englishCharCount / cleaned.length;

    if (englishRatio < 0.5) {
      logger.warn(
        "CoordinatorRouter",
        "Response has low English character ratio, using fallback",
        {
          englishRatio,
          length: cleaned.length,
        }
      );
      cleaned =
        "I'm Kai, and I apologize, but I'm having trouble understanding that. Could you please rephrase your question in English?";
    }
  }

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");

  // Ensure response ends properly
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned = cleaned.trim() + ".";
  }

  return cleaned.trim();
}

/**
 * Generate chat response using the configured AI provider
 */
async function generateChatResponse(
  prompt: string,
  model?: string
): Promise<string> {
  const providerType = (process.env.AI_PROVIDER as AIProviderType) || AIProviderType.OLLAMA;
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const defaultModel = model || process.env.DEFAULT_AI_MODEL || (providerType === AIProviderType.GEMINI ? "gemini-2.5-flash" : "gemma3:4b");

  if (providerType === AIProviderType.GEMINI && apiKey) {
    // Use Gemini SDK
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: defaultModel,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1000,
      },
    });

    return response.text || "";
  } else {
    // Use Ollama API (fallback or default)
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: defaultModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data.response || "";
  }
}

/**
 * Use function calling pattern to let the model decide if it needs material content
 * This makes the model smarter about when to use RAG
 */
async function decideFunctionCall(
  message: string,
  model?: string
): Promise<FunctionCall> {
  const decisionPrompt = `You are a decision-making assistant. Analyze the user's message and decide if you need to search course material.

CRITICAL: Respond with ONLY valid JSON. No markdown, no text before or after the JSON.

Available functions:
1. search_material - Use when user asks about:
   - Concepts, definitions, topics from course material
   - Technical explanations requiring material content
   - Questions like "what is X", "explain Y", "how does Z work"
   - Any question that needs material content to answer

2. none - Use when user:
   - Greets you (hi, hello, hey, etc.)
   - Asks about you (who are you, what's your name)
   - Says thanks, goodbye, casual conversation
   - General questions not about course content

User message: "${message}"

Respond with ONLY this JSON format (no other text):
{
  "name": "search_material" or "none",
  "arguments": {
    "query": "search query if name is search_material, otherwise omit this field",
    "reason": "one sentence explaining your decision"
  }
}`;

  try {
    const providerType = (process.env.AI_PROVIDER as AIProviderType) || AIProviderType.OLLAMA;
    const apiKey = process.env.GEMINI_API_KEY || "";
    const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const defaultModel = model || process.env.DEFAULT_AI_MODEL || (providerType === AIProviderType.GEMINI ? "gemini-2.5-flash" : "gemma3:4b");

    let responseText: string;
    
    if (providerType === AIProviderType.GEMINI && apiKey) {
      // Use Gemini SDK
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const result = await ai.models.generateContent({
        model: defaultModel,
        contents: decisionPrompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 200,
        },
      });
      
      responseText = result.text || "";
    } else {
      // Use Ollama API
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: defaultModel,
          prompt: decisionPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 200,
          },
        }),
      });

      if (!response.ok) {
        logger.warn(
          "CoordinatorRouter",
          "Function calling decision failed, using fallback",
          {
            status: response.status,
          }
        );
        return { name: "none" };
      }

      const data = await response.json();
      responseText = data.response || "";
    }

    if (!response.ok) {
      // Fallback to simple heuristic if function calling fails
      logger.warn(
        "CoordinatorRouter",
        "Function calling decision failed, using fallback",
        {
          status: response.status,
        }
      );
      return { name: "none" };
    }

    // responseText is already set above based on provider type

    // Try to extract JSON from response
    let functionCall: FunctionCall;
    try {
      // Find JSON in response (might have markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        functionCall = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (_parseError) {
      logger.warn(
        "CoordinatorRouter",
        "Failed to parse function call, using fallback",
        {
          response: responseText.substring(0, 200),
        }
      );
      // Fallback: use simple heuristic
      const normalizedMessage = message.toLowerCase().trim();
      const simpleGreetings = [
        "hi",
        "hello",
        "hey",
        "who are you",
        "thanks",
        "thank you",
        "ok",
        "okay",
        "bye",
      ];
      const isGreeting = simpleGreetings.some((g) =>
        normalizedMessage.includes(g)
      );
      functionCall = {
        name: isGreeting ? "none" : "search_material",
        arguments: { query: message },
      };
    }

    logger.debug("CoordinatorRouter", "Function call decision", {
      message,
      decision: functionCall.name,
      reason: functionCall.arguments?.reason,
    });

    return functionCall;
  } catch (error) {
    logger.error(
      "CoordinatorRouter",
      "Function calling error, using fallback",
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
    // Fallback: assume we need to search for most queries
    const normalizedMessage = message.toLowerCase().trim();
    const simpleGreetings = ["hi", "hello", "hey", "who are you"];
    const isGreeting = simpleGreetings.some(
      (g) => normalizedMessage === g || normalizedMessage.startsWith(g + " ")
    );
    return {
      name: isGreeting ? "none" : "search_material",
      arguments: { query: message },
    };
  }
}

// Helper function to ensure chat_history table exists
async function ensureChatHistoryTable() {
  try {
    // Check if table exists by trying to query it
    await prisma.$queryRaw`SELECT 1 FROM "public"."chat_history" LIMIT 1`;
    return true;
  } catch {
    // Table doesn't exist, create it
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "public"."chat_history" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "materialId" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id")
        );
      `);

      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "chat_history_userId_materialId_createdAt_idx" 
        ON "public"."chat_history"("userId", "materialId", "createdAt");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX "chat_history_createdAt_idx" 
        ON "public"."chat_history"("createdAt");
      `);

      // Add foreign keys
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "public"."chat_history" 
        ADD CONSTRAINT "chat_history_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "public"."users"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "public"."chat_history" 
        ADD CONSTRAINT "chat_history_materialId_fkey" 
        FOREIGN KEY ("materialId") REFERENCES "public"."course_material"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);

      logger.info("CoordinatorRouter", "Created chat_history table");
      return true;
    } catch (createError) {
      logger.error(
        "CoordinatorRouter",
        "Failed to create chat_history table",
        undefined,
        createError instanceof Error
          ? createError
          : new Error(String(createError))
      );
      return false;
    }
  }
}

export const coordinatorRouter = createTRPCRouter({
  // Get available AI models (supports both Ollama and Gemini)
  getOllamaModels: coordinatorProcedure.query(async () => {
    try {
      const providerType = (process.env.AI_PROVIDER as AIProviderType) || AIProviderType.OLLAMA;
      const apiKey = process.env.GEMINI_API_KEY || "";

      if (providerType === AIProviderType.GEMINI && apiKey) {
        // Return default Gemini models (SDK doesn't have a direct list method)
        const geminiModels = [
          { name: "gemini-2.5-flash", model: "gemini-2.5-flash" },
          { name: "gemini-2.5-pro", model: "gemini-2.5-pro" },
          { name: "gemini-2.0-flash", model: "gemini-2.0-flash" },
          { name: "gemini-1.5-pro", model: "gemini-1.5-pro" },
          { name: "gemini-1.5-flash", model: "gemini-1.5-flash" },
        ];
        
        logger.debug(
          "CoordinatorRouter",
          `Returning ${geminiModels.length} default Gemini models`
        );
        return geminiModels;
      } else {
        // Fetch Ollama models
        const ollamaUrl =
          process.env.OLLAMA_URL ||
          process.env.OLLAMA_BASE_URL ||
          "http://localhost:11434";

        const response = await fetch(`${ollamaUrl}/api/tags`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          logger.warn("CoordinatorRouter", "Failed to fetch Ollama models", {
            status: response.status,
            statusText: response.statusText,
          });
          // Return default model if fetch fails
          return [{ name: "gemma3:4b", model: "gemma3:4b" }];
        }

        const data = await response.json();
        const models = data.models || [];

        // Extract model names
        const modelList = models.map((model: { name: string }) => ({
          name: model.name,
          model: model.name,
        }));

        logger.debug(
          "CoordinatorRouter",
          `Fetched ${modelList.length} Ollama models`,
          {
            modelCount: modelList.length,
          }
        );

        // If no models found, return default
        if (modelList.length === 0) {
          return [{ name: "gemma3:4b", model: "gemma3:4b" }];
        }

        return modelList;
      }
    } catch (error) {
      logger.error(
        "CoordinatorRouter",
        "Error fetching AI models",
        error instanceof Error ? error : new Error(String(error))
      );
      // Return default model on error based on provider
      const providerType = (process.env.AI_PROVIDER as AIProviderType) || AIProviderType.OLLAMA;
      if (providerType === AIProviderType.GEMINI) {
        return [{ name: "gemini-2.5-flash", model: "gemini-2.5-flash" }];
      }
      return [{ name: "gemma3:4b", model: "gemma3:4b" }];
    }
  }),

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

        // Trigger background PDF parsing and embedding
        // Use MaterialService's parsePDFInBackground which handles both parsing and embedding
        const { MaterialService } = await import("@/services/material.service");

        // Use setTimeout to make it truly async and not block the response
        setTimeout(async () => {
          try {
            // Read and parse the PDF
            const filePath = join(
              process.cwd(),
              "src",
              "uploads",
              input.filename
            );
            const buffer = await readFile(filePath);
            const pdfContent = await parsePDFToText(buffer);

            // Update the database with parsed content
            const material = await prisma.course_Material.update({
              where: { id: courseMaterial.id },
              data: {
                parsedContent: pdfContent.markdown,
                parsingStatus: "COMPLETED",
                parsingError: null,
              },
              select: {
                unit: true,
              },
            });

            // Now trigger embedding using MaterialService (now public)
            await MaterialService.embedMaterialInBackground(
              courseMaterial.id,
              pdfContent.markdown,
              material.unit
            );
          } catch (error) {
            logger.error(
              "CoordinatorRouter",
              `Failed to process material ${courseMaterial.id}`,
              error instanceof Error ? error : new Error(String(error)),
              {
                materialId: courseMaterial.id,
              }
            );
          }
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
        select: {
          id: true,
          courseId: true,
          title: true,
          filePath: true,
          materialType: true,
          unit: true,
          createdAt: true,
          parsedContent: true, // Need this to estimate total chunks
          parsingStatus: true,
          parsingError: true,
          embeddingStatus: true,
          embeddingError: true,
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
          chunks: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      logger.debug("CoordinatorRouter", "Fetching uploaded materials", {
        userId,
        count: materials.length,
      });

      return materials.map((material) => {
        // Estimate total expected chunks from parsed content length
        // Average chunk size: ~8000 characters (2000 tokens * 4 chars/token)
        const contentLength = material.parsedContent?.length || 0;
        const estimatedTotalChunks =
          material.parsingStatus === "COMPLETED" && contentLength > 0
            ? Math.max(1, Math.ceil(contentLength / 8000))
            : 0;

        const currentChunkCount = material.chunks.length;
        const embeddingProgress =
          material.embeddingStatus === "PROCESSING" && estimatedTotalChunks > 0
            ? Math.min(
                100,
                Math.round((currentChunkCount / estimatedTotalChunks) * 100)
              )
            : material.embeddingStatus === "COMPLETED"
            ? 100
            : 0;

        // Log progress for processing materials
        if (
          material.embeddingStatus === "PROCESSING" &&
          estimatedTotalChunks > 0
        ) {
          logger.debug("CoordinatorRouter", "Material embedding progress", {
            materialId: material.id,
            currentChunks: currentChunkCount,
            totalChunks: estimatedTotalChunks,
            progress: embeddingProgress,
          });
        }

        return {
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
          embeddingStatus: material.embeddingStatus,
          embeddingError: material.embeddingError,
          chunkCount: currentChunkCount,
          estimatedTotalChunks,
          embeddingProgress,
        };
      });
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

        logger.info(
          "CoordinatorRouter",
          `Starting deletion of material ${input.materialId}`,
          {
            materialId: input.materialId,
            userId,
          }
        );

        // 1. Delete embeddings from ChromaDB first
        try {
          const { VectorDBService } = await import(
            "@/services/vector-db.service"
          );
          const vectorDB = new VectorDBService();
          await vectorDB.deleteMaterialChunks(input.materialId);
          logger.info(
            "CoordinatorRouter",
            `Deleted ChromaDB embeddings for material ${input.materialId}`,
            {
              materialId: input.materialId,
            }
          );
        } catch (vectorError) {
          logger.warn(
            "CoordinatorRouter",
            `Failed to delete ChromaDB embeddings (may not be initialized)`,
            {
              materialId: input.materialId,
              error:
                vectorError instanceof Error
                  ? vectorError.message
                  : String(vectorError),
            }
          );
          // Continue with deletion even if ChromaDB fails
        }

        // 2. Delete chunks from PostgreSQL (explicitly, though cascade should handle it)
        const deletedChunks = await prisma.material_Chunk.deleteMany({
          where: { materialId: input.materialId },
        });
        logger.info(
          "CoordinatorRouter",
          `Deleted ${deletedChunks.count} chunks from PostgreSQL`,
          {
            materialId: input.materialId,
            chunkCount: deletedChunks.count,
          }
        );

        // 3. Delete related questions
        const deletedQuestions = await prisma.question.deleteMany({
          where: {
            materialId: input.materialId,
          },
        });
        logger.info(
          "CoordinatorRouter",
          `Deleted ${deletedQuestions.count} related questions`,
          {
            materialId: input.materialId,
            questionCount: deletedQuestions.count,
          }
        );

        // 4. Delete related question generation jobs
        const deletedJobs = await prisma.question_Generation_Job.deleteMany({
          where: {
            materialId: input.materialId,
          },
        });
        logger.info(
          "CoordinatorRouter",
          `Deleted ${deletedJobs.count} question generation jobs`,
          {
            materialId: input.materialId,
            jobCount: deletedJobs.count,
          }
        );

        // 5. Delete chat history
        const deletedChatHistory = await prisma.chat_History.deleteMany({
          where: {
            materialId: input.materialId,
          },
        });
        logger.info(
          "CoordinatorRouter",
          `Deleted ${deletedChatHistory.count} chat history entries`,
          {
            materialId: input.materialId,
            chatCount: deletedChatHistory.count,
          }
        );

        // 6. Delete the database record (this will cascade delete any remaining related data)
        await prisma.course_Material.delete({
          where: {
            id: input.materialId,
          },
        });
        logger.info(
          "CoordinatorRouter",
          `Deleted material record: ${input.materialId}`,
          {
            materialId: input.materialId,
          }
        );

        // 7. Delete the physical file from uploads folder
        try {
          const filePath = join(
            process.cwd(),
            "src",
            material.filePath.replace("uploads/", "")
          );
          await unlink(filePath);
          logger.info(
            "CoordinatorRouter",
            `Deleted physical file: ${filePath}`,
            {
              materialId: input.materialId,
              filePath,
            }
          );
        } catch (fileError) {
          logger.warn("CoordinatorRouter", `Failed to delete physical file`, {
            materialId: input.materialId,
            filePath: material.filePath,
            error:
              fileError instanceof Error
                ? fileError.message
                : String(fileError),
          });
          // Continue even if file deletion fails
        }

        logger.info(
          "CoordinatorRouter",
          `Successfully deleted material ${input.materialId}`,
          {
            materialId: input.materialId,
            deletedChunks: deletedChunks.count,
            deletedQuestions: deletedQuestions.count,
            deletedJobs: deletedJobs.count,
            deletedChatHistory: deletedChatHistory.count,
          }
        );

        return {
          success: true,
          filename: material.filePath.replace("uploads/", ""),
          deletedChunks: deletedChunks.count,
          deletedQuestions: deletedQuestions.count,
          deletedJobs: deletedJobs.count,
          deletedChatHistory: deletedChatHistory.count,
        };
      } catch (error) {
        logger.error(
          "CoordinatorRouter",
          `Failed to delete material ${input.materialId}`,
          error instanceof Error ? error : new Error(String(error)),
          {
            materialId: input.materialId,
            userId: ctx.session?.user?.id,
          }
        );
        if (error instanceof TRPCError) {
          throw error;
        }
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
        model: z.string().optional().default("gemma3:4b"),
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

        // Fetch chunks from ChromaDB (with PostgreSQL fallback)
        let chunks: Array<{ content: string }> = [];
        let materialContent = "";

        try {
          // Try ChromaDB first
          const { VectorDBService } = await import(
            "@/services/vector-db.service"
          );
          const vectorDB = new VectorDBService();
          const canConnect = await vectorDB.testConnection();

          if (canConnect) {
            // Get all chunks for this material (we'll combine them all for question generation)
            // For now, we'll use a dummy embedding to get all chunks
            // In a real scenario, you might want to use the material's parsed content embedding
            const { EmbeddingService } = await import(
              "@/services/embedding.service"
            );
            const embeddingService = new EmbeddingService();
            const queryEmbedding = await embeddingService.generateEmbedding(
              material.title
            );

            const chromaChunks = await vectorDB.searchChunks(
              queryEmbedding.embedding,
              { materialId: input.materialId, unit: material.unit },
              100 // Get up to 100 chunks
            );

            if (chromaChunks.length > 0) {
              chunks = chromaChunks.map((c) => ({ content: c.content }));
              materialContent = chunks
                .map((chunk) => chunk.content)
                .join("\n\n");
            }
          }
        } catch (vectorError) {
          console.warn(
            "[Question Generation] ChromaDB not available, falling back to PostgreSQL:",
            vectorError
          );
        }

        // Fallback to PostgreSQL if ChromaDB didn't work or returned no chunks
        if (chunks.length === 0) {
          const dbChunks = await prisma.material_Chunk.findMany({
            where: {
              materialId: input.materialId,
              unit: material.unit,
            },
            orderBy: {
              chunkIndex: "asc",
            },
          });

          if (dbChunks.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Material chunks not found. The material may still be processing embeddings. Please wait a moment and try again.",
            });
          }

          chunks = dbChunks;
          materialContent = chunks.map((chunk) => chunk.content).join("\n\n");
        }

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
            const generatedQuestions = await generateQuestionsWithAI(
              {
                materialContent: materialContent, // Use combined chunks instead of full parsedContent
                courseName: material.course.name,
                materialName: material.title,
                unit: material.unit,
                questionCounts: input.questionCounts,
                bloomLevels: input.bloomLevels,
                questionTypes: input.questionTypes,
              },
              input.model // Pass the model parameter
            );

            // Update job status
            await prisma.question_Generation_Job.update({
              where: { id: job.id },
              data: {
                status: "COMPLETED",
              },
            });

            // Return generated questions for review (don't save to DB yet)
            // Validate and normalize question fields to prevent validation errors
            return {
              success: true,
              jobId: job.id,
              totalQuestions,
              questions: generatedQuestions.map((q) => {
                // Normalize difficultyLevel - ensure it's EASY, MEDIUM, or HARD
                let difficultyLevel = q.difficulty_level?.toUpperCase();
                if (
                  !["EASY", "MEDIUM", "HARD"].includes(difficultyLevel || "")
                ) {
                  // Derive from marks if difficulty is invalid
                  if (q.marks === "TWO") {
                    difficultyLevel = "EASY";
                  } else if (q.marks === "EIGHT") {
                    difficultyLevel = "MEDIUM";
                  } else if (q.marks === "SIXTEEN") {
                    difficultyLevel = "HARD";
                  } else {
                    difficultyLevel = "MEDIUM"; // Default fallback
                  }
                  logger.warn(
                    "CoordinatorRouter",
                    "Invalid difficulty_level, derived from marks",
                    {
                      original: q.difficulty_level,
                      derived: difficultyLevel,
                      marks: q.marks,
                    }
                  );
                }

                // Normalize bloomLevel
                const bloomLevel = q.bloom_level?.toUpperCase() || "UNDERSTAND";

                // Normalize generationType (question_type)
                const generationType =
                  q.question_type?.toUpperCase() || "DIRECT";

                // Normalize marks
                const marks = q.marks?.toUpperCase() || "TWO";

                return {
                  id: `temp_${Date.now()}_${Math.random()}`,
                  question: q.question_text || "",
                  answer: q.answer_text || "",
                  difficultyLevel: difficultyLevel as
                    | "EASY"
                    | "MEDIUM"
                    | "HARD",
                  bloomLevel: bloomLevel as
                    | "REMEMBER"
                    | "UNDERSTAND"
                    | "APPLY"
                    | "ANALYZE"
                    | "EVALUATE"
                    | "CREATE",
                  generationType: generationType as
                    | "DIRECT"
                    | "INDIRECT"
                    | "SCENARIO_BASED"
                    | "PROBLEM_BASED",
                  marks: marks as "TWO" | "EIGHT" | "SIXTEEN",
                };
              }),
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
            difficultyLevel: z
              .union([z.string(), z.enum(["EASY", "MEDIUM", "HARD"])])
              .transform((val) => {
                const str = typeof val === "string" ? val : String(val || "");
                return str.toUpperCase() || "MEDIUM";
              })
              .pipe(z.enum(["EASY", "MEDIUM", "HARD"])),
            bloomLevel: z
              .union([
                z.string(),
                z.enum([
                  "REMEMBER",
                  "UNDERSTAND",
                  "APPLY",
                  "ANALYZE",
                  "EVALUATE",
                  "CREATE",
                ]),
              ])
              .transform((val) => {
                const str = typeof val === "string" ? val : String(val || "");
                return str.toUpperCase() || "UNDERSTAND";
              })
              .pipe(
                z.enum([
                  "REMEMBER",
                  "UNDERSTAND",
                  "APPLY",
                  "ANALYZE",
                  "EVALUATE",
                  "CREATE",
                ])
              ),
            generationType: z
              .union([
                z.string(),
                z.enum([
                  "DIRECT",
                  "INDIRECT",
                  "SCENARIO_BASED",
                  "PROBLEM_BASED",
                ]),
              ])
              .transform((val) => {
                const str = typeof val === "string" ? val : String(val || "");
                return str.toUpperCase() || "DIRECT";
              })
              .pipe(
                z.enum([
                  "DIRECT",
                  "INDIRECT",
                  "SCENARIO_BASED",
                  "PROBLEM_BASED",
                ])
              ),
            marks: z
              .union([z.string(), z.enum(["TWO", "EIGHT", "SIXTEEN"])])
              .transform((val) => {
                const str = typeof val === "string" ? val : String(val || "");
                return str.toUpperCase() || "TWO";
              })
              .pipe(z.enum(["TWO", "EIGHT", "SIXTEEN"])),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        logger.debug("CoordinatorRouter", "saveReviewedQuestions called", {
          courseId: input.courseId,
          materialId: input.materialId,
          questionCount: input.questions.length,
          firstQuestionMarks: input.questions[0]?.marks,
        });

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
        // Values are already normalized by Zod schema transform
        const dbQuestions = input.questions.map((q) => ({
          courseId: input.courseId,
          materialId: input.materialId,
          unit: input.unit,
          question: q.question?.trim() || "",
          answer: q.answer?.trim() || "",
          questionType: q.bloomLevel, // Note: questionType uses bloomLevel in this schema
          difficultyLevel: q.difficultyLevel,
          bloomLevel: q.bloomLevel,
          generationType: q.generationType,
          marks: q.marks,
          materialName: material?.title || "Unknown Material",
          status: "CREATED_BY_COURSE_COORDINATOR" as const,
        }));

        await prisma.question.createMany({
          data: dbQuestions,
        });

        logger.info("CoordinatorRouter", "Questions saved successfully", {
          courseId: input.courseId,
          materialId: input.materialId,
          questionCount: dbQuestions.length,
        });

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

  // Manually trigger embedding for a material (if it got stuck)
  retriggerEmbedding: coordinatorProcedure
    .input(z.object({ materialId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.session?.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Get material
        const material = await prisma.course_Material.findUnique({
          where: { id: input.materialId },
          include: {
            course: {
              select: {
                courseCoordinatorId: true,
              },
            },
          },
        });

        if (!material) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Material not found",
          });
        }

        // Verify user is coordinator for this course
        if (material.course.courseCoordinatorId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized for this course",
          });
        }

        // Check if material has parsed content
        if (!material.parsedContent || material.parsingStatus !== "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Material must be parsed first",
          });
        }

        // Check if already completed
        if (material.embeddingStatus === "COMPLETED") {
          return {
            success: true,
            message: "Embedding already completed",
          };
        }

        logger.info(
          "CoordinatorRouter",
          `Manually triggering embedding for material ${input.materialId}`,
          {
            materialId: input.materialId,
            userId,
          }
        );

        // Trigger embedding by calling the service method
        // We'll need to make embedMaterialInBackground public or create a wrapper
        const { EmbeddingService } = await import(
          "@/services/embedding.service"
        );
        const { VectorDBService } = await import(
          "@/services/vector-db.service"
        );

        // Update status to PROCESSING
        await prisma.course_Material.update({
          where: { id: input.materialId },
          data: { embeddingStatus: "PROCESSING" },
        });

        // Start embedding in background
        const embeddingService = new EmbeddingService();
        const vectorDB = new VectorDBService();

        const chunksWithEmbeddings = await embeddingService.chunkAndEmbed(
          material.parsedContent,
          material.unit,
          {
            onProgress: (current, total) => {
              logger.logEmbeddingProgress(input.materialId, current, total);
            },
          }
        );

        // Store chunks
        const chunksToStore = chunksWithEmbeddings.map((chunk) => ({
          content: chunk.content,
          embedding: chunk.embedding,
          metadata: {
            materialId: input.materialId,
            unit: material.unit,
            chunkIndex: chunk.chunkIndex,
            title: chunk.title,
            tokenCount: chunk.tokenCount,
            ...chunk.metadata,
          },
        }));

        try {
          await vectorDB.storeChunks(chunksToStore);
        } catch (_vectorError) {
          // Fallback to PostgreSQL
          await prisma.material_Chunk.createMany({
            data: chunksWithEmbeddings.map((chunk) => ({
              materialId: input.materialId,
              unit: material.unit,
              chunkIndex: chunk.chunkIndex,
              title: chunk.title,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
              embedding: chunk.embedding,
              metadata: chunk.metadata,
            })),
            skipDuplicates: true,
          });
        }

        // Update status to COMPLETED
        await prisma.course_Material.update({
          where: { id: input.materialId },
          data: {
            embeddingStatus: "COMPLETED",
            embeddingError: null,
          },
        });

        return {
          success: true,
          message: `Embedding completed for ${chunksWithEmbeddings.length} chunks`,
          chunkCount: chunksWithEmbeddings.length,
        };
      } catch (error) {
        logger.error(
          "CoordinatorRouter",
          "Failed to retrigger embedding",
          error instanceof Error ? error : new Error(String(error)),
          {
            materialId: input.materialId,
          }
        );

        // Update status to FAILED
        await prisma.course_Material
          .update({
            where: { id: input.materialId },
            data: {
              embeddingStatus: "FAILED",
              embeddingError:
                error instanceof Error ? error.message : "Unknown error",
            },
          })
          .catch(() => {
            // Ignore update errors
          });

        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrigger embedding",
        });
      }
    }),

  // Chat with PDF
  chatWithPDF: coordinatorProcedure
    .input(
      z.object({
        materialId: z.string(),
        message: z.string().min(1),
        model: z.string().optional(),
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

        // Get material
        const material = await prisma.course_Material.findUnique({
          where: { id: input.materialId },
          include: { course: true },
        });

        if (!material) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Material not found",
          });
        }

        // Check if material is ready
        if (
          material.parsingStatus !== "COMPLETED" ||
          material.embeddingStatus !== "COMPLETED"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Material is still being processed. Please wait.",
          });
        }

        // Ensure chat_history table exists
        const tableExists = await ensureChatHistoryTable();
        if (!tableExists) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to initialize chat system. Please try again.",
          });
        }

        // Save user message
        await prisma.chat_History.create({
          data: {
            userId,
            materialId: input.materialId,
            role: "user",
            content: input.message,
          },
        });

        // Use function calling to let the model decide if it needs material content
        const functionCall = await decideFunctionCall(
          input.message,
          input.model
        );
        const useRAG = functionCall.name === "search_material";

        logger.debug("CoordinatorRouter", "Function calling decision", {
          message: input.message,
          functionCall: functionCall.name,
          reason: functionCall.arguments?.reason,
          useRAG,
        });

        let relevantChunks: string[] = [];

        // Only fetch embeddings and search if the model decided to use search_material
        if (useRAG) {
          // Get relevant chunks using RAG
          const { VectorDBService } = await import(
            "@/services/vector-db.service"
          );
          const { EmbeddingService } = await import(
            "@/services/embedding.service"
          );

          try {
            const vectorDB = new VectorDBService();
            const embeddingService = new EmbeddingService();

            const canConnect = await vectorDB.testConnection();
            if (canConnect) {
              // Check if chunks exist for this material
              const hasChunks = await vectorDB.hasChunksForMaterial(
                input.materialId
              );
              logger.debug("CoordinatorRouter", "ChromaDB chunk check", {
                materialId: input.materialId,
                hasChunks,
              });

              if (!hasChunks) {
                logger.warn(
                  "CoordinatorRouter",
                  "No chunks found in ChromaDB for material",
                  {
                    materialId: input.materialId,
                  }
                );
                // Fall through to PostgreSQL fallback
              } else {
                // Generate embedding for the query
                const queryEmbedding = await embeddingService.generateEmbedding(
                  input.message
                );

                // Try searching with unit filter first
                let chunks = await vectorDB.searchChunks(
                  queryEmbedding.embedding,
                  { materialId: input.materialId, unit: material.unit || 0 },
                  5 // Top 5 most relevant chunks
                );

                // If no results with unit filter, try without unit filter (in case unit was stored differently)
                if (
                  chunks.length === 0 &&
                  material.unit !== undefined &&
                  material.unit !== null
                ) {
                  logger.debug(
                    "CoordinatorRouter",
                    "No chunks found with unit filter, trying without unit",
                    {
                      materialId: input.materialId,
                      unit: material.unit,
                    }
                  );
                  chunks = await vectorDB.searchChunks(
                    queryEmbedding.embedding,
                    { materialId: input.materialId },
                    5
                  );
                }

                relevantChunks = chunks.map((c) => c.content);
                logger.debug(
                  "CoordinatorRouter",
                  "Found chunks from ChromaDB",
                  {
                    chunkCount: chunks.length,
                    materialId: input.materialId,
                    unit: material.unit,
                  }
                );
              }
            }

            // If no chunks from ChromaDB, try PostgreSQL fallback
            if (relevantChunks.length === 0) {
              logger.info(
                "CoordinatorRouter",
                "No chunks from ChromaDB, trying PostgreSQL fallback",
                {
                  materialId: input.materialId,
                  unit: material.unit,
                }
              );
              // Fallback to PostgreSQL
              const dbChunks = await prisma.material_Chunk.findMany({
                where: {
                  materialId: input.materialId,
                  unit: material.unit || 0,
                },
                take: 10, // Get more chunks as fallback
                orderBy: { chunkIndex: "asc" },
              });
              relevantChunks = dbChunks.map((c) => c.content);
              logger.debug("CoordinatorRouter", "Using PostgreSQL chunks", {
                chunkCount: dbChunks.length,
              });
            }
          } catch (vectorError) {
            logger.warn(
              "CoordinatorRouter",
              "Vector search failed, trying PostgreSQL fallback",
              {
                materialId: input.materialId,
                error:
                  vectorError instanceof Error
                    ? vectorError.message
                    : String(vectorError),
              }
            );
            // Fallback: use all chunks from PostgreSQL
            try {
              const dbChunks = await prisma.material_Chunk.findMany({
                where: {
                  materialId: input.materialId,
                  unit: material.unit || 0,
                },
                orderBy: { chunkIndex: "asc" },
                take: 10, // Get more chunks as fallback
              });
              relevantChunks = dbChunks.map((c) => c.content);
              logger.debug(
                "CoordinatorRouter",
                "Using PostgreSQL chunks as fallback",
                {
                  chunkCount: dbChunks.length,
                }
              );
            } catch (dbError) {
              logger.error(
                "CoordinatorRouter",
                "PostgreSQL fallback also failed",
                undefined,
                dbError instanceof Error ? dbError : new Error(String(dbError))
              );
              relevantChunks = [];
            }
          }

          // Check if we have any chunks at all (only for RAG queries)
          if (relevantChunks.length === 0) {
            // Delete the user message since we can't process it
            try {
              await prisma.chat_History.deleteMany({
                where: {
                  userId,
                  materialId: input.materialId,
                  role: "user",
                  content: input.message,
                  createdAt: {
                    gte: new Date(Date.now() - 5000), // Within last 5 seconds
                  },
                },
              });
            } catch {
              // Ignore if table doesn't exist yet
            }

            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "No content available for this material. The material may not have been embedded yet. Please check the material status and try re-embedding if needed.",
            });
          }
        } else {
          logger.debug("CoordinatorRouter", "Skipping RAG for simple query", {
            message: input.message,
          });
        }

        // Only require chunks if RAG was needed
        if (useRAG && relevantChunks.length === 0) {
          logger.warn(
            "CoordinatorRouter",
            "No chunks found for material (RAG required)",
            {
              materialId: input.materialId,
              unit: material.unit,
            }
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No content available for this material. Please ensure the material has been processed and embedded.",
          });
        }

        // Build prompt based on function call decision
        let prompt: string;
        if (useRAG && relevantChunks.length > 0) {
          // Build prompt with context from relevant chunks (function was called and returned results)
          const contextText = relevantChunks
            .map((chunk, idx) => `[Chunk ${idx + 1}]\n${chunk}`)
            .join("\n\n");

          prompt = `You are Kai, a helpful AI assistant specialized in answering questions about course materials.

IMPORTANT RULES:
- Your name is Kai. Always refer to yourself as Kai.
- Respond ONLY in English. Do not use any other languages or characters.
- Keep responses clear, concise, and well-formatted.
- Use proper English grammar and spelling.

You searched the course material and found the following relevant content:

${contextText}

Based on the above content, answer the following question clearly and accurately:

Question: ${input.message}

Provide a clear, concise answer based on the provided content. If the question cannot be answered from the content, politely say so.`;
        } else if (useRAG && relevantChunks.length === 0) {
          // Function was called but no results found
          prompt = `You are Kai, a helpful AI assistant specialized in course materials.

IMPORTANT RULES:
- Your name is Kai. Always refer to yourself as Kai.
- Respond ONLY in English. Do not use any other languages or characters.
- Keep responses clear, concise, and well-formatted.

You searched the course material for the user's question, but no relevant content was found.

User question: ${input.message}

Politely inform the user that you couldn't find relevant information in the material. Offer to help with other questions.`;
        } else {
          // Function call returned "none" - no material search needed
          prompt = `You are Kai, a friendly AI assistant helping students with their course materials.

IMPORTANT RULES:
- Your name is Kai. Always refer to yourself as Kai.
- Respond ONLY in English. Do not use any other languages or characters.
- Keep responses brief, friendly, and conversational.
- Use proper English grammar and spelling.

User message: ${input.message}

Respond naturally:
- If they greet you, greet them back warmly as Kai
- If they ask "who are you" or "what is your name", say "I'm Kai, your AI assistant for course materials!"
- If they ask general questions, answer helpfully
- Keep it brief and friendly`;
        }

        const providerType = (process.env.AI_PROVIDER as AIProviderType) || AIProviderType.OLLAMA;
        const model = input.model || process.env.DEFAULT_AI_MODEL || (providerType === AIProviderType.GEMINI ? "gemini-2.5-flash" : "gemma3:4b");

        logger.debug("CoordinatorRouter", "Sending chat request", {
          provider: providerType,
          model,
          useRAG,
          chunkCount: relevantChunks.length,
          promptLength: prompt.length,
        });

        let answer: string;
        try {
          answer = await generateChatResponse(prompt, model);
          if (!answer) {
            answer = "I'm Kai, and I couldn't generate a response. Please try again.";
          }
        } catch (error) {
          logger.error(
            "CoordinatorRouter",
            "AI API error",
            error instanceof Error ? error : new Error(String(error)),
            {
              provider: providerType,
              model,
            }
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}. Please ensure the AI service is configured correctly.`,
          });
        }

        // Sanitize response: remove garbled text, ensure it's valid English
        answer = sanitizeChatResponse(answer);

        logger.debug("CoordinatorRouter", "Chat response generated", {
          answerLength: answer.length,
          originalLength: data.response?.length || 0,
        });

        // Save assistant response
        await prisma.chat_History.create({
          data: {
            userId,
            materialId: input.materialId,
            role: "assistant",
            content: answer,
          },
        });

        return { answer };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error(
          "CoordinatorRouter",
          "Chat error",
          error instanceof Error ? error : new Error(String(error)),
          { materialId: input.materialId }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to process chat message",
        });
      }
    }),

  // Get chat history
  getChatHistory: coordinatorProcedure
    .input(
      z.object({
        materialId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session?.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Ensure table exists
        await ensureChatHistoryTable();

        // Clean up old messages (24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        await prisma.chat_History.deleteMany({
          where: {
            createdAt: {
              lt: oneDayAgo,
            },
          },
        });

        // Get recent messages
        const messages = await prisma.chat_History.findMany({
          where: {
            userId,
            materialId: input.materialId,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 50, // Last 50 messages
        });

        return {
          messages: messages.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: msg.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error(
          "CoordinatorRouter",
          "Failed to fetch chat history",
          error instanceof Error ? error : new Error(String(error)),
          { materialId: input.materialId }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch chat history",
        });
      }
    }),

  // Clear chat history for a material
  clearChatHistory: coordinatorProcedure
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

        // Ensure table exists
        await ensureChatHistoryTable();

        // Delete all chat history for this material and user
        await prisma.chat_History.deleteMany({
          where: {
            userId,
            materialId: input.materialId,
          },
        });

        logger.info("CoordinatorRouter", "Chat history cleared", {
          userId,
          materialId: input.materialId,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error(
          "CoordinatorRouter",
          "Failed to clear chat history",
          error instanceof Error ? error : new Error(String(error)),
          { materialId: input.materialId }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clear chat history",
        });
      }
    }),

  // Check if syllabus exists for a course
  checkSyllabusExists: coordinatorProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.session?.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Verify the user has access to this course
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
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this course",
          });
        }

        const syllabus = await prisma.course_Material.findFirst({
          where: {
            courseId: input.courseId,
            materialType: "SYLLABUS",
            parsingStatus: "COMPLETED",
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        });

        return {
          exists: !!syllabus,
          syllabus: syllabus || null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check syllabus",
        });
      }
    }),

  // Validate question paper
  validateQuestionPaper: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string(),
        filename: z.string(),
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

        // Verify the user has access to this course
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
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this course",
          });
        }

        // Import validation service
        const {
          validateQuestionPaper,
        } = await import("@/services/question-paper-validation.service");

        // Validate the question paper
        const result = await validateQuestionPaper(
          input.courseId,
          `uploads/${input.filename}`
        );

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error(
          "CoordinatorRouter",
          "Failed to validate question paper",
          error instanceof Error ? error : new Error(String(error)),
          { courseId: input.courseId, filename: input.filename }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to validate question paper",
        });
      }
    }),
});
