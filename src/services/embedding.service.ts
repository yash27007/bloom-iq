/**
 * Embedding Service
 *
 * Handles text embeddings using Ollama's embedding API
 * For local hosting, uses the same Ollama instance
 */

import { chunkContent } from "@/lib/content-chunker";
import { logger } from "@/lib/logger";

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface ChunkWithEmbedding {
  chunkIndex: number;
  title: string;
  content: string;
  embedding: number[];
  tokenCount: number;
  metadata: {
    headingLevel: number;
    hasSubsections: boolean;
    topicKeywords: string[];
  };
}

export class EmbeddingService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl =
      process.env.OLLAMA_URL ||
      process.env.OLLAMA_BASE_URL ||
      "http://localhost:11434";
    this.model = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:v1.5"; // Specialized embedding model
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // Ollama embeddings API - note: not all models support embeddings
      // If embeddings fail, we'll store chunks without embeddings
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text.substring(0, 8000), // Limit text length for embeddings
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `Ollama embedding API error: ${response.status} - ${errorText}`
        );
        logger.error(
          "EmbeddingService",
          "Failed to generate embedding",
          error,
          {
            status: response.status,
            model: this.model,
          }
        );
        throw error;
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        const error = new Error("Invalid embedding response format");
        logger.error("EmbeddingService", "Invalid embedding response", error);
        throw error;
      }

      // Estimate token count (rough: 1 token ≈ 4 characters)
      const tokenCount = Math.ceil(text.length / 4);

      logger.debug("EmbeddingService", "Generated embedding", {
        embeddingLength: data.embedding.length,
        tokenCount,
        textLength: text.length,
      });

      return {
        embedding: data.embedding,
        tokenCount,
      };
    } catch (error) {
      logger.error(
        "EmbeddingService",
        "Failed to generate embedding",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Chunk content and generate embeddings for all chunks
   * @param onProgress Optional callback to report progress (current, total)
   */
  async chunkAndEmbed(
    content: string,
    unit: number,
    options?: {
      maxTokensPerChunk?: number;
      minTokensPerChunk?: number;
      onProgress?: (current: number, total: number) => void;
    }
  ): Promise<ChunkWithEmbedding[]> {
    logger.info(
      "EmbeddingService",
      `Starting chunking and embedding for unit ${unit}`,
      {
        unit,
        contentLength: content.length,
      }
    );

    // Chunk the content
    const chunks = await chunkContent(content, {
      maxTokensPerChunk: options?.maxTokensPerChunk ?? 3000,
      minTokensPerChunk: options?.minTokensPerChunk ?? 500,
      method: "by-heading",
      preserveContext: true,
    });

    logger.info("EmbeddingService", `Created ${chunks.length} chunks`, {
      unit,
      chunkCount: chunks.length,
    });

    // Generate embeddings in parallel batches to improve performance
    // Process 3 chunks at a time to avoid overwhelming the GPU
    const BATCH_SIZE = 3;
    const chunksWithEmbeddings: ChunkWithEmbedding[] = [];

    for (
      let batchStart = 0;
      batchStart < chunks.length;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
      const batch = chunks.slice(batchStart, batchEnd);

      // Process batch in parallel
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const i = batchStart + batchIndex;

        logger.debug(
          "EmbeddingService",
          `Processing chunk ${i + 1}/${chunks.length}`,
          {
            chunkIndex: i,
            chunkTitle: chunk.title,
            unit,
          }
        );

        // Report progress
        if (options?.onProgress) {
          options.onProgress(i + 1, chunks.length);
        }

        try {
          const embeddingResult = await this.generateEmbedding(chunk.content);

          return {
            chunkIndex: i,
            title: chunk.title,
            content: chunk.content,
            embedding: embeddingResult.embedding,
            tokenCount: embeddingResult.tokenCount,
            metadata: chunk.metadata,
            success: true,
          };
        } catch (error) {
          logger.error(
            "EmbeddingService",
            `Failed to embed chunk ${i + 1}`,
            error instanceof Error ? error : new Error(String(error)),
            {
              unit,
              chunkIndex: i,
              chunkTitle: chunk.title,
            }
          );
          // Return chunk without embedding
          return {
            chunkIndex: i,
            title: chunk.title,
            content: chunk.content,
            embedding: [] as number[], // Empty embedding - will be regenerated later
            tokenCount: chunk.tokens,
            metadata: chunk.metadata,
            success: false,
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Add successful chunks to results
      for (const result of batchResults) {
        chunksWithEmbeddings.push({
          chunkIndex: result.chunkIndex,
          title: result.title,
          content: result.content,
          embedding: result.embedding,
          tokenCount: result.tokenCount,
          metadata: result.metadata,
        });
      }

      // Small delay between batches to prevent overwhelming the GPU
      if (batchEnd < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Reduced from 100ms
      }
    }

    logger.info(
      "EmbeddingService",
      `Successfully embedded ${chunksWithEmbeddings.length} chunks`,
      {
        unit,
        totalChunks: chunksWithEmbeddings.length,
      }
    );
    return chunksWithEmbeddings;
  }

  /**
   * Test connection to embedding service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (_error) {
      return false;
    }
  }
}
