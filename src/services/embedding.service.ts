/**
 * Embedding Service
 *
 * Handles text embeddings using Google's embedding API or Ollama.
 * For Vercel deployment, uses Google's text-embedding-004 model.
 * For local development with Ollama, uses nomic-embed-text.
 * 
 * Supports round-robin API key rotation for Gemini to avoid rate limits.
 */

import { chunkContent } from "@/lib/content-chunker";
import { logger } from "@/lib/logger";
import { geminiKeyManager } from "@/lib/gemini-key-manager";

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

type EmbeddingProvider = "GOOGLE" | "OLLAMA";

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private ollamaBaseUrl: string;
  private ollamaModel: string;

  constructor() {
    // Determine provider based on environment
    const aiProvider = process.env.AI_PROVIDER?.toUpperCase() || "GEMINI";
    this.provider = aiProvider === "OLLAMA" ? "OLLAMA" : "GOOGLE";
    
    this.ollamaBaseUrl =
      process.env.OLLAMA_URL ||
      process.env.OLLAMA_BASE_URL ||
      "http://localhost:11434";
    this.ollamaModel = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:v1.5";
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.provider === "GOOGLE") {
      return this.generateGoogleEmbedding(text);
    }
    return this.generateOllamaEmbedding(text);
  }

  /**
   * Generate embedding using Google's API
   */
  private async generateGoogleEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const apiKey = geminiKeyManager.getNextKey();
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: {
              parts: [{ text: text.substring(0, 8000) }], // Limit text length
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check for rate limiting
        if (response.status === 429) {
          geminiKeyManager.markKeyError(apiKey);
          logger.warn("EmbeddingService", "Rate limited, trying next key");
          // Retry with next key
          return this.generateGoogleEmbedding(text);
        }
        
        throw new Error(`Google embedding API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
        throw new Error("Invalid embedding response format");
      }

      const tokenCount = Math.ceil(text.length / 4);

      logger.debug("EmbeddingService", "Generated Google embedding", {
        embeddingLength: data.embedding.values.length,
        tokenCount,
        textLength: text.length,
      });

      return {
        embedding: data.embedding.values,
        tokenCount,
      };
    } catch (error) {
      logger.error(
        "EmbeddingService",
        "Failed to generate Google embedding",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Generate embedding using Ollama's API
   */
  private async generateOllamaEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: text.substring(0, 8000),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embedding API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error("Invalid embedding response format");
      }

      const tokenCount = Math.ceil(text.length / 4);

      logger.debug("EmbeddingService", "Generated Ollama embedding", {
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
        "Failed to generate Ollama embedding",
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
        provider: this.provider,
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

    // Generate embeddings in parallel batches
    // Use smaller batch size for Google to avoid rate limits
    const BATCH_SIZE = this.provider === "GOOGLE" ? 2 : 3;
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
            embedding: [] as number[],
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

      // Add delay between batches for rate limiting
      if (batchEnd < chunks.length) {
        const delay = this.provider === "GOOGLE" ? 200 : 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.info(
      "EmbeddingService",
      `Successfully embedded ${chunksWithEmbeddings.length} chunks`,
      {
        unit,
        totalChunks: chunksWithEmbeddings.length,
        provider: this.provider,
      }
    );
    return chunksWithEmbeddings;
  }

  /**
   * Test connection to embedding service
   */
  async testConnection(): Promise<boolean> {
    try {
      if (this.provider === "GOOGLE") {
        // Test Google API with a simple embedding
        await this.generateGoogleEmbedding("test");
        return true;
      }
      
      // Test Ollama
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }
}
