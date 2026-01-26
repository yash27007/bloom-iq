/**
 * Vector Database Service - PostgreSQL with pgvector
 *
 * Handles vector storage and retrieval for RAG (Retrieval-Augmented Generation)
 * Uses PostgreSQL with pgvector extension via Neon DB.
 * 
 * Note: Embeddings are stored in the Material_Chunk table as Float[] arrays.
 * For similarity search, we use cosine distance calculation.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface ChunkMetadata {
  materialId: string;
  unit: number;
  chunkIndex: number;
  title?: string;
  tokenCount: number;
  [key: string]: unknown;
}

export class VectorDBService {
  constructor() {
    // No external connection needed - uses Prisma/PostgreSQL
  }

  /**
   * Test connection to database
   */
  async testConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.debug("VectorDB", "PostgreSQL connection successful");
      return true;
    } catch (error) {
      logger.error(
        "VectorDB",
        "PostgreSQL connection test failed",
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Store chunks with embeddings in PostgreSQL
   */
  async storeChunks(
    chunks: Array<{
      content: string;
      embedding: number[];
      metadata: ChunkMetadata;
    }>
  ): Promise<void> {
    try {
      // Use transaction for batch insert
      await prisma.$transaction(
        chunks.map((chunk) =>
          prisma.material_Chunk.create({
            data: {
              materialId: chunk.metadata.materialId,
              unit: chunk.metadata.unit,
              chunkIndex: chunk.metadata.chunkIndex,
              title: chunk.metadata.title || null,
              content: chunk.content,
              embedding: chunk.embedding,
              tokenCount: chunk.metadata.tokenCount,
              metadata: chunk.metadata as object,
            },
          })
        )
      );

      logger.info("VectorDB", `Stored ${chunks.length} chunks in PostgreSQL`, {
        chunkCount: chunks.length,
        materialId: chunks[0]?.metadata?.materialId,
      });
    } catch (error) {
      logger.error(
        "VectorDB",
        "Failed to store chunks in PostgreSQL",
        error instanceof Error ? error : new Error(String(error)),
        { chunkCount: chunks.length }
      );
      throw error;
    }
  }

  /**
   * Search for relevant chunks using cosine similarity
   * 
   * Note: For production with large datasets, enable pgvector extension
   * and use vector similarity operators for better performance.
   */
  async searchChunks(
    queryEmbedding: number[],
    filters?: {
      materialId?: string;
      unit?: number;
    },
    limit: number = 5
  ): Promise<
    Array<{
      content: string;
      metadata: ChunkMetadata;
      distance: number;
    }>
  > {
    try {
      // Build where clause
      const where: Record<string, unknown> = {};
      if (filters?.materialId) {
        where.materialId = filters.materialId;
      }
      if (filters?.unit !== undefined && filters?.unit !== null) {
        where.unit = filters.unit;
      }

      // Get chunks with embeddings
      const chunks = await prisma.material_Chunk.findMany({
        where,
        select: {
          id: true,
          content: true,
          embedding: true,
          materialId: true,
          unit: true,
          chunkIndex: true,
          title: true,
          tokenCount: true,
          metadata: true,
        },
      });

      if (chunks.length === 0) {
        logger.debug("VectorDB", "No chunks found for query", { filters });
        return [];
      }

      // Calculate cosine similarity for each chunk
      const chunksWithDistance = chunks
        .map((chunk) => {
          const distance = this.cosineSimilarity(queryEmbedding, chunk.embedding);
          return {
            content: chunk.content,
            metadata: {
              materialId: chunk.materialId,
              unit: chunk.unit,
              chunkIndex: chunk.chunkIndex,
              title: chunk.title || undefined,
              tokenCount: chunk.tokenCount,
              ...(chunk.metadata as object || {}),
            } as ChunkMetadata,
            distance: 1 - distance, // Convert similarity to distance
          };
        })
        .sort((a, b) => a.distance - b.distance) // Sort by distance (ascending)
        .slice(0, limit);

      logger.debug("VectorDB", `Found ${chunksWithDistance.length} relevant chunks`, {
        filters,
        limit,
      });

      return chunksWithDistance;
    } catch (error) {
      logger.error(
        "VectorDB",
        "Failed to search chunks",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Delete chunks for a specific material
   */
  async deleteMaterialChunks(materialId: string): Promise<void> {
    try {
      const result = await prisma.material_Chunk.deleteMany({
        where: { materialId },
      });

      logger.info("VectorDB", `Deleted ${result.count} chunks for material ${materialId}`, {
        materialId,
        deletedCount: result.count,
      });
    } catch (error) {
      logger.error(
        "VectorDB",
        "Failed to delete chunks",
        error instanceof Error ? error : new Error(String(error)),
        { materialId }
      );
      throw error;
    }
  }

  /**
   * Get chunk count for a material
   */
  async getChunkCount(materialId: string, unit?: number): Promise<number> {
    try {
      const where: Record<string, unknown> = { materialId };
      if (unit !== undefined && unit !== null) {
        where.unit = unit;
      }

      const count = await prisma.material_Chunk.count({ where });

      logger.debug("VectorDB", "Chunk count retrieved", {
        materialId,
        unit,
        count,
      });

      return count;
    } catch (error) {
      logger.error(
        "VectorDB",
        "Failed to get chunk count",
        error instanceof Error ? error : new Error(String(error)),
        { materialId, unit }
      );
      return 0;
    }
  }

  /**
   * Check if chunks exist for a material
   */
  async hasChunksForMaterial(materialId: string): Promise<boolean> {
    try {
      const count = await this.getChunkCount(materialId);
      return count > 0;
    } catch {
      return false;
    }
  }
}
