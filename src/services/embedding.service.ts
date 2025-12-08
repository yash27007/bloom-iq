/**
 * Embedding Service
 *
 * Handles text embeddings using Ollama's embedding API
 * For local hosting, uses the same Ollama instance
 */

import { chunkContent } from "@/lib/content-chunker";

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
        throw new Error(
          `Ollama embedding API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error("Invalid embedding response format");
      }

      // Estimate token count (rough: 1 token ≈ 4 characters)
      const tokenCount = Math.ceil(text.length / 4);

      return {
        embedding: data.embedding,
        tokenCount,
      };
    } catch (error) {
      console.error("[Embedding Service] Failed to generate embedding:", error);
      throw error;
    }
  }

  /**
   * Chunk content and generate embeddings for all chunks
   */
  async chunkAndEmbed(
    content: string,
    unit: number,
    options?: {
      maxTokensPerChunk?: number;
      minTokensPerChunk?: number;
    }
  ): Promise<ChunkWithEmbedding[]> {
    console.log(`[Embedding] Starting chunking and embedding for unit ${unit}`);
    console.log(`[Embedding] Content length: ${content.length} characters`);

    // Chunk the content
    const chunks = await chunkContent(content, {
      maxTokensPerChunk: options?.maxTokensPerChunk ?? 3000,
      minTokensPerChunk: options?.minTokensPerChunk ?? 500,
      method: "by-heading",
      preserveContext: true,
    });

    console.log(`[Embedding] Created ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    const chunksWithEmbeddings: ChunkWithEmbedding[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(
        `[Embedding] Processing chunk ${i + 1}/${chunks.length}: "${
          chunk.title
        }"`
      );

      try {
        const embeddingResult = await this.generateEmbedding(chunk.content);

        chunksWithEmbeddings.push({
          chunkIndex: i,
          title: chunk.title,
          content: chunk.content,
          embedding: embeddingResult.embedding,
          tokenCount: embeddingResult.tokenCount,
          metadata: chunk.metadata,
        });

        // Small delay to prevent overwhelming the GPU
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`[Embedding] Failed to embed chunk ${i + 1}:`, error);
        // Continue with other chunks even if one fails
        // We'll still store the chunk without embedding
        chunksWithEmbeddings.push({
          chunkIndex: i,
          title: chunk.title,
          content: chunk.content,
          embedding: [], // Empty embedding - will be regenerated later
          tokenCount: chunk.tokens,
          metadata: chunk.metadata,
        });
      }
    }

    console.log(
      `[Embedding] Successfully embedded ${chunksWithEmbeddings.length} chunks`
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
