/**
 * Material Service
 *
 * Handles background embedding generation for course materials.
 * 
 * NOTE: Files are NOT stored on disk. PDFs are parsed in memory by the upload API
 * and only the parsed content is stored in the database. This is compatible with
 * Vercel's serverless environment (read-only filesystem).
 * 
 * Vector embeddings are stored directly in PostgreSQL (Float[] arrays).
 * For production, use Neon DB which supports pgvector for efficient similarity search.
 */

import { prisma } from "@/lib/prisma";
import { EmbeddingService } from "./embedding.service";
import { VectorDBService } from "./vector-db.service";
import { logger } from "@/lib/logger";

/**
 * Service class for material operations
 */
export class MaterialService {
  /**
   * Background embedding generation (non-blocking)
   * Creates chunks and embeddings for the parsed material
   * Stores embeddings directly in PostgreSQL (Material_Chunk table)
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
      const vectorDB = new VectorDBService();
      await vectorDB.deleteMaterialChunks(materialId);
      logger.info(
        "VectorDB",
        `Deleted existing chunks for material ${materialId}`,
        { materialId }
      );

      // Create embedding service and chunk/embed the content
      const embeddingService = new EmbeddingService();

      // Test if embeddings are available
      const canEmbed = await embeddingService.testConnection();
      if (!canEmbed) {
        logger.warn(
          "EmbeddingService",
          "Embedding service connection failed, will retry",
          { materialId }
        );
      }

      // Use chunkAndEmbed with progress tracking for better performance
      const chunksWithEmbeddings = await embeddingService.chunkAndEmbed(
        content,
        unit,
        {
          maxTokensPerChunk: 3000,
          minTokensPerChunk: 500,
          onProgress: (current, total) => {
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

      // Store all chunks in PostgreSQL via VectorDBService
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

      await vectorDB.storeChunks(chunksToStore);
      logger.info(
        "VectorDB",
        `Stored ${chunksToStore.length} chunks in PostgreSQL`,
        {
          materialId,
          chunkCount: chunksToStore.length,
        }
      );

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
}
