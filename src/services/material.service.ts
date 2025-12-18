/**
 * Material Service
 *
 * Handles all course material-related business logic including:
 * - Material upload with file storage
 * - Background PDF parsing
 * - Material retrieval with parsing status
 * - Material deletion with file cleanup
 */

import { prisma } from "@/lib/prisma";
import { parsePDFToText, validateParsedContent } from "@/lib/pdf-parser";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import type { Material_Type } from "@/generated/prisma";
import type { ServiceResult } from "./types";
import { EmbeddingService } from "./embedding.service";
import { VectorDBService } from "./vector-db.service";
import { logger } from "@/lib/logger";

/**
 * Material data transfer objects
 */
export type UploadMaterialInput = {
  courseId: string;
  title: string;
  filename: string;
  materialType: Material_Type;
  unit: number;
  uploadedById: string;
};

export type MaterialResponse = {
  id: string;
  title: string;
  filePath: string;
  materialType: Material_Type;
  unit: number;
  parsingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  parsingError?: string | null;
  parsedContent?: string | null;
  createdAt: Date;
  course: {
    id: string;
    course_code: string;
    name: string;
  };
};

/**
 * Service class for material operations
 */
export class MaterialService {
  /**
   * Upload course material
   */
  static async uploadMaterial(
    input: UploadMaterialInput
  ): Promise<ServiceResult<MaterialResponse>> {
    const material = await prisma.course_Material.create({
      data: {
        courseId: input.courseId,
        title: input.title,
        filePath: input.filename,
        materialType: input.materialType,
        unit: input.unit,
        uploadedById: input.uploadedById,
        parsingStatus: "PENDING",
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
    });

    logger.logMaterialUpload(
      material.id,
      input.title,
      input.courseId,
      input.uploadedById
    );

    // Start background PDF parsing (non-blocking)
    this.parsePDFInBackground(material.id, input.filename).catch((error) => {
      logger.error(
        "MaterialService",
        `Failed to start background parsing for ${material.id}`,
        error
      );
    });

    return {
      data: material as MaterialResponse,
      message: "Material uploaded successfully. Parsing will begin shortly.",
    };
  }

  /**
   * Background PDF parsing (non-blocking)
   */
  private static async parsePDFInBackground(
    materialId: string,
    filename: string
  ): Promise<void> {
    const startTime = Date.now();
    try {
      logger.info(
        "PDFParser",
        `Starting background parsing for material ${materialId}`,
        { materialId, filename }
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
        logger.warn("PDFParser", `Validation warnings for ${materialId}`, {
          materialId,
          warnings: validation.warnings,
        });
      }

      logger.info("PDFParser", `PDF parsed successfully`, {
        materialId,
        filename,
        pages: pdfContent.metadata.pages,
        textLength: pdfContent.text.length,
        markdownLength: pdfContent.markdown.length,
      });

      // Update the database with parsed content and get material unit
      const material = await prisma.course_Material.update({
        where: { id: materialId },
        data: {
          parsedContent: pdfContent.markdown,
          parsingStatus: "COMPLETED",
          parsingError: null,
        },
        select: {
          unit: true,
        },
      });

      const parseDuration = Date.now() - startTime;
      logger.logPDFParsing(
        materialId,
        "COMPLETED",
        undefined,
        pdfContent.metadata.pages
      );
      logger.info("PDFParser", `Parsing completed in ${parseDuration}ms`, {
        materialId,
        duration: parseDuration,
      });

      // Validate content before starting embedding
      if (!pdfContent.markdown || pdfContent.markdown.trim().length === 0) {
        logger.warn(
          "MaterialService",
          `No content to embed for material ${materialId}`,
          { materialId }
        );
        await prisma.course_Material.update({
          where: { id: materialId },
          data: {
            embeddingStatus: "FAILED",
            embeddingError: "No parsed content available for embedding",
          },
        });
        return;
      }

      // Start background embedding (non-blocking)
      logger.info(
        "MaterialService",
        `Triggering background embedding for material ${materialId}`,
        {
          materialId,
          contentLength: pdfContent.markdown.length,
          unit: material.unit,
        }
      );

      this.embedMaterialInBackground(
        materialId,
        pdfContent.markdown,
        material.unit
      ).catch((error) => {
        logger.error(
          "MaterialService",
          `Failed to start background embedding for ${materialId}`,
          error instanceof Error ? error : new Error(String(error)),
          {
            materialId,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          }
        );
      });
    } catch (error) {
      const parseDuration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown parsing error";

      logger.error(
        "PDFParser",
        `Error parsing material ${materialId}`,
        error instanceof Error ? error : new Error(errorMessage),
        {
          materialId,
          filename,
          duration: parseDuration,
        }
      );
      logger.logPDFParsing(materialId, "FAILED", errorMessage);

      // Update status to FAILED with error message
      await prisma.course_Material
        .update({
          where: { id: materialId },
          data: {
            parsingStatus: "FAILED",
            parsingError: errorMessage,
          },
        })
        .catch((dbError) => {
          logger.error(
            "PDFParser",
            "Failed to update error status",
            dbError instanceof Error ? dbError : new Error(String(dbError))
          );
        });
    }
  }

  /**
   * Background embedding generation (non-blocking)
   * Creates chunks and embeddings for the parsed material
   * Can be called manually to retrigger embedding for a material
   */
  static async embedMaterialInBackground(
    materialId: string,
    content: string,
    unit: number
  ): Promise<void> {
    const startTime = Date.now();

    // Validate inputs immediately
    if (!content || content.trim().length === 0) {
      const error = new Error("Content is empty or null");
      logger.error(
        "EmbeddingService",
        `Cannot embed empty content for material ${materialId}`,
        error,
        { materialId, unit }
      );
      await prisma.course_Material.update({
        where: { id: materialId },
        data: {
          embeddingStatus: "FAILED",
          embeddingError: "Content is empty or null",
        },
      });
      return;
    }

    try {
      logger.info(
        "EmbeddingService",
        `Starting background embedding for material ${materialId}`,
        {
          materialId,
          unit,
          contentLength: content.length,
        }
      );

      // Update status to PROCESSING
      await prisma.course_Material.update({
        where: { id: materialId },
        data: { embeddingStatus: "PROCESSING" },
      });

      // Delete existing chunks for this material (in case of re-embedding)
      // Delete from PostgreSQL (for backward compatibility)
      await prisma.material_Chunk.deleteMany({
        where: { materialId },
      });

      // Delete from ChromaDB
      const vectorDB = new VectorDBService();
      try {
        await vectorDB.deleteMaterialChunks(materialId);
        logger.info(
          "VectorDB",
          `Deleted existing chunks from ChromaDB for material ${materialId}`,
          { materialId }
        );
      } catch (vectorError) {
        logger.warn(
          "VectorDB",
          `Failed to delete from ChromaDB (may not be initialized)`,
          {
            materialId,
            error:
              vectorError instanceof Error
                ? vectorError.message
                : String(vectorError),
          }
        );
      }

      // Create embedding service and chunk/embed the content
      const embeddingService = new EmbeddingService();

      // Test if embeddings are available
      const canEmbed = await embeddingService.testConnection();
      if (!canEmbed) {
        logger.warn(
          "EmbeddingService",
          "Ollama connection failed, storing chunks without embeddings",
          { materialId }
        );
      }

      // Use chunkAndEmbed with progress tracking for better performance
      // This processes embeddings in parallel batches (3 at a time)
      const chunksWithEmbeddings = await embeddingService.chunkAndEmbed(
        content,
        unit,
        {
          maxTokensPerChunk: 3000,
          minTokensPerChunk: 500,
          onProgress: (current, total) => {
            // Log progress every chunk
            logger.logEmbeddingProgress(materialId, current, total);
          },
        }
      );

      // Filter out chunks with empty embeddings before storing
      const validChunks = chunksWithEmbeddings.filter(
        (chunk) => chunk.embedding && chunk.embedding.length > 0
      );

      if (validChunks.length === 0) {
        logger.warn(
          "EmbeddingService",
          "No chunks with valid embeddings to store",
          { materialId, totalChunks: chunksWithEmbeddings.length }
        );
        throw new Error("No chunks with valid embeddings generated");
      }

      // Batch store all chunks in ChromaDB (much more efficient than one-by-one)
      const chunksToStore = validChunks.map((chunk) => ({
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: {
          materialId,
          unit,
          chunkIndex: chunk.chunkIndex,
          title: chunk.title,
          tokenCount: chunk.tokenCount,
          ...chunk.metadata,
        },
      }));

      // Store all chunks in ChromaDB in one batch operation
      try {
        await vectorDB.storeChunks(chunksToStore);
        logger.info(
          "VectorDB",
          `Stored ${chunksToStore.length} chunks in ChromaDB`,
          {
            materialId,
            chunkCount: chunksToStore.length,
          }
        );
      } catch (vectorError) {
        logger.warn(
          "VectorDB",
          `Failed to store in ChromaDB, falling back to PostgreSQL`,
          {
            materialId,
            error:
              vectorError instanceof Error
                ? vectorError.message
                : String(vectorError),
          }
        );

        // Fallback to PostgreSQL - batch insert for efficiency
        // Only store chunks with valid embeddings
        await prisma.material_Chunk
          .createMany({
            data: validChunks.map((chunk) => ({
              materialId,
              unit,
              chunkIndex: chunk.chunkIndex,
              title: chunk.title,
              content: chunk.content,
              tokenCount: chunk.tokenCount, // Fixed: schema uses tokenCount, not tokens
              embedding: chunk.embedding,
              metadata: chunk.metadata,
            })),
            skipDuplicates: true,
          })
          .catch((dbError) => {
            logger.error(
              "EmbeddingService",
              "Failed to store chunks in PostgreSQL",
              dbError instanceof Error ? dbError : new Error(String(dbError)),
              {
                materialId,
                chunkCount: chunksWithEmbeddings.length,
              }
            );
          });
      }

      // Update status to COMPLETED
      await prisma.course_Material.update({
        where: { id: materialId },
        data: {
          embeddingStatus: "COMPLETED",
          embeddingError: null,
        },
      });

      const embedDuration = Date.now() - startTime;
      logger.logEmbeddingComplete(
        materialId,
        chunksWithEmbeddings.length,
        embedDuration
      );
      logger.info(
        "EmbeddingService",
        `Successfully embedded ${chunksWithEmbeddings.length} chunks`,
        {
          materialId,
          totalChunks: chunksWithEmbeddings.length,
          duration: embedDuration,
        }
      );
    } catch (error) {
      const embedDuration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown embedding error";

      logger.error(
        "EmbeddingService",
        `Error embedding material ${materialId}`,
        error instanceof Error ? error : new Error(errorMessage),
        {
          materialId,
          unit,
          duration: embedDuration,
        }
      );

      // Update status to FAILED with error message
      await prisma.course_Material
        .update({
          where: { id: materialId },
          data: {
            embeddingStatus: "FAILED",
            embeddingError: errorMessage,
          },
        })
        .catch((dbError) => {
          logger.error(
            "EmbeddingService",
            "Failed to update error status",
            dbError instanceof Error ? dbError : new Error(String(dbError))
          );
        });
    }
  }

  /**
   * Get uploaded materials for a coordinator
   */
  static async getMaterialsByCoordinator(
    coordinatorId: string
  ): Promise<ServiceResult<MaterialResponse[]>> {
    const materials = await prisma.course_Material.findMany({
      where: {
        course: {
          OR: [
            { courseCoordinatorId: coordinatorId },
            { moduleCoordinatorId: coordinatorId },
            { programCoordinatorId: coordinatorId },
          ],
        },
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: materials as MaterialResponse[] };
  }

  /**
   * Get material by ID
   */
  static async getMaterialById(
    id: string
  ): Promise<ServiceResult<MaterialResponse>> {
    const material = await prisma.course_Material.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
    });

    if (!material) {
      throw new Error("Material not found.");
    }

    return { data: material as MaterialResponse };
  }

  /**
   * Delete material with complete cleanup:
   * - ChromaDB embeddings
   * - PostgreSQL chunks
   * - Related questions
   * - Question generation jobs
   * - Chat history
   * - Physical file
   */
  static async deleteMaterial(
    materialId: string
  ): Promise<ServiceResult<null>> {
    try {
      logger.info(
        "MaterialService",
        `Starting deletion of material ${materialId}`,
        {
          materialId,
        }
      );

      // Get material details
      const material = await prisma.course_Material.findUnique({
        where: { id: materialId },
        select: {
          filePath: true,
          _count: {
            select: {
              questions: true,
              chunks: true,
            },
          },
        },
      });

      if (!material) {
        throw new Error("Material not found.");
      }

      // 1. Delete embeddings from ChromaDB
      try {
        const vectorDB = new VectorDBService();
        await vectorDB.deleteMaterialChunks(materialId);
        logger.info(
          "MaterialService",
          `Deleted ChromaDB embeddings for material ${materialId}`,
          {
            materialId,
          }
        );
      } catch (vectorError) {
        logger.warn(
          "MaterialService",
          `Failed to delete ChromaDB embeddings (may not be initialized)`,
          {
            materialId,
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
        where: { materialId },
      });
      logger.info(
        "MaterialService",
        `Deleted ${deletedChunks.count} chunks from PostgreSQL`,
        {
          materialId,
          chunkCount: deletedChunks.count,
        }
      );

      // 3. Delete associated questions
      const deletedQuestions = await prisma.question.deleteMany({
        where: { materialId },
      });
      logger.info(
        "MaterialService",
        `Deleted ${deletedQuestions.count} related questions`,
        {
          materialId,
          questionCount: deletedQuestions.count,
        }
      );

      // 4. Delete question generation jobs
      const deletedJobs = await prisma.question_Generation_Job.deleteMany({
        where: { materialId },
      });
      logger.info(
        "MaterialService",
        `Deleted ${deletedJobs.count} question generation jobs`,
        {
          materialId,
          jobCount: deletedJobs.count,
        }
      );

      // 5. Delete chat history
      const deletedChatHistory = await prisma.chat_History.deleteMany({
        where: { materialId },
      });
      logger.info(
        "MaterialService",
        `Deleted ${deletedChatHistory.count} chat history entries`,
        {
          materialId,
          chatCount: deletedChatHistory.count,
        }
      );

      // 6. Delete the database record (this will cascade delete any remaining related data)
      await prisma.course_Material.delete({
        where: { id: materialId },
      });
      logger.info("MaterialService", `Deleted material record: ${materialId}`, {
        materialId,
      });

      // 7. Delete the physical file
      const filePath = join(
        process.cwd(),
        "src",
        material.filePath.replace("uploads/", "")
      );
      try {
        await unlink(filePath);
        logger.info("MaterialService", `Deleted physical file: ${filePath}`, {
          materialId,
          filePath,
        });
      } catch (fileError) {
        logger.warn("MaterialService", `Failed to delete physical file`, {
          materialId,
          filePath,
          error:
            fileError instanceof Error ? fileError.message : String(fileError),
        });
        // Don't throw - file might already be deleted or missing
      }

      logger.info(
        "MaterialService",
        `Successfully deleted material ${materialId}`,
        {
          materialId,
          deletedChunks: deletedChunks.count,
          deletedQuestions: deletedQuestions.count,
          deletedJobs: deletedJobs.count,
          deletedChatHistory: deletedChatHistory.count,
        }
      );

      return {
        message: `Material deleted successfully along with:
          - ${deletedChunks.count} chunk(s)
          - ${deletedQuestions.count} question(s)
          - ${deletedJobs.count} generation job(s)
          - ${deletedChatHistory.count} chat history entry/entries`,
      };
    } catch (error) {
      logger.error(
        "MaterialService",
        `Failed to delete material ${materialId}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          materialId,
        }
      );
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete material.");
    }
  }

  /**
   * Get materials by course ID
   */
  static async getMaterialsByCourse(
    courseId: string
  ): Promise<ServiceResult<MaterialResponse[]>> {
    const materials = await prisma.course_Material.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
      orderBy: [{ unit: "asc" }, { createdAt: "desc" }],
    });

    return { data: materials as MaterialResponse[] };
  }
}
