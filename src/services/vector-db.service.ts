/**
 * ChromaDB Vector Database Service
 *
 * Handles vector storage and retrieval for RAG (Retrieval-Augmented Generation)
 * Based on official ChromaDB TypeScript documentation: https://docs.trychroma.com/docs/overview/getting-started?lang=typescript
 */

import { ChromaClient } from "chromadb";
import { logger } from "@/lib/logger";

export interface ChunkMetadata {
  materialId: string;
  unit: number;
  chunkIndex: number;
  title?: string;
  tokenCount: number;
  [key: string]: any;
}

export class VectorDBService {
  private client: ChromaClient;
  private collectionName: string;

  constructor() {
    const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
    this.collectionName = process.env.CHROMA_COLLECTION || "material_chunks";

    // Initialize ChromaDB client according to official docs
    // For HTTP client, use path option
    this.client = new ChromaClient({
      path: chromaUrl,
    });
  }

  /**
   * Test connection to ChromaDB
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      logger.debug("VectorDB", "ChromaDB connection successful", {
        url: this.collectionName,
      });
      return true;
    } catch (error) {
      logger.error(
        "VectorDB",
        "ChromaDB connection test failed",
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Get or create collection for material chunks
   * According to ChromaDB docs: https://docs.trychroma.com/docs/overview/getting-started?lang=typescript
   */
  private async getOrCreateCollection() {
    try {
      // Try to get existing collection
      const collection = await this.client.getCollection({
        name: this.collectionName,
      });
      return collection;
    } catch (_error) {
      // Collection doesn't exist, create it
      logger.info("VectorDB", `Creating collection: ${this.collectionName}`);
      const collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: { description: "Course material chunks with embeddings" },
      });
      return collection;
    }
  }

  /**
   * Store chunks with embeddings in ChromaDB
   * Based on official ChromaDB add() method
   */
  async storeChunks(
    chunks: Array<{
      content: string;
      embedding: number[];
      metadata: ChunkMetadata;
    }>
  ): Promise<void> {
    const collection = await this.getOrCreateCollection();

    // Prepare data for ChromaDB according to official API
    const ids = chunks.map(
      (_, idx) =>
        `${chunks[idx].metadata.materialId}_${chunks[idx].metadata.chunkIndex}`
    );
    const documents = chunks.map((chunk) => chunk.content);
    const embeddings = chunks.map((chunk) => chunk.embedding);
    const metadatas = chunks.map((chunk) => ({
      materialId: chunk.metadata.materialId,
      unit: chunk.metadata.unit.toString(),
      chunkIndex: chunk.metadata.chunkIndex.toString(),
      title: chunk.metadata.title || "",
      tokenCount: chunk.metadata.tokenCount.toString(),
      ...Object.fromEntries(
        Object.entries(chunk.metadata).filter(
          ([key]) =>
            ![
              "materialId",
              "unit",
              "chunkIndex",
              "title",
              "tokenCount",
            ].includes(key)
        )
      ),
    }));

    try {
      await collection.add({
        ids,
        documents,
        embeddings,
        metadatas,
      });
      logger.info("VectorDB", `Stored ${chunks.length} chunks in ChromaDB`, {
        chunkCount: chunks.length,
        materialId: chunks[0]?.metadata?.materialId,
      });
    } catch (error) {
      logger.error(
        "VectorDB",
        "Failed to store chunks in ChromaDB",
        error instanceof Error ? error : new Error(String(error)),
        {
          chunkCount: chunks.length,
        }
      );
      throw error;
    }
  }

  /**
   * Search for relevant chunks using semantic similarity
   * Based on official ChromaDB query() method
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
    const collection = await this.getOrCreateCollection();

    // Build where clause for filtering according to ChromaDB docs
    // ChromaDB requires $and operator when multiple filters
    const whereConditions: Record<string, any>[] = [];
    if (filters?.materialId) {
      whereConditions.push({ materialId: filters.materialId });
    }
    if (filters?.unit !== undefined && filters?.unit !== null) {
      whereConditions.push({ unit: filters.unit.toString() });
    }

    // Build where clause - use $and if multiple conditions, otherwise use single condition
    let where: Record<string, any> | undefined = undefined;
    if (whereConditions.length === 1) {
      where = whereConditions[0];
    } else if (whereConditions.length > 1) {
      where = { $and: whereConditions };
    }

    try {
      logger.debug("VectorDB", "Searching chunks in ChromaDB", {
        hasWhere: !!where,
        whereConditions: whereConditions.length,
        filters,
        limit,
      });

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: where,
      });

      logger.debug("VectorDB", "ChromaDB query results", {
        hasDocuments: !!results.documents,
        documentsLength: results.documents?.length || 0,
        firstDocLength: results.documents?.[0]?.length || 0,
        hasMetadatas: !!results.metadatas,
        hasDistances: !!results.distances,
      });

      if (
        !results.documents ||
        results.documents.length === 0 ||
        !results.documents[0]
      ) {
        logger.warn("VectorDB", "No documents found in ChromaDB query", {
          filters,
          limit,
        });
        return [];
      }

      // Transform results according to ChromaDB response format
      const chunks = [];
      const documents = results.documents[0];
      const metadatas = results.metadatas?.[0] || [];
      const distances = results.distances?.[0] || [];

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        if (!doc) continue; // Skip null documents

        const metadata = metadatas[i] || {};
        chunks.push({
          content: doc,
          metadata: {
            materialId: metadata.materialId as string,
            unit: parseInt((metadata.unit as string) || "0"),
            chunkIndex: parseInt((metadata.chunkIndex as string) || "0"),
            title: (metadata.title as string) || undefined,
            tokenCount: parseInt((metadata.tokenCount as string) || "0"),
            ...Object.fromEntries(
              Object.entries(metadata).filter(
                ([key]) =>
                  ![
                    "materialId",
                    "unit",
                    "chunkIndex",
                    "title",
                    "tokenCount",
                  ].includes(key)
              )
            ),
          },
          distance: distances[i] || 0,
        });
      }

      logger.debug("VectorDB", `Searched chunks in ChromaDB`, {
        resultCount: chunks.length,
        limit,
        filters,
      });
      return chunks;
    } catch (error) {
      logger.error(
        "VectorDB",
        "Failed to search chunks in ChromaDB",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Delete chunks for a specific material
   * Based on official ChromaDB delete() method
   */
  async deleteMaterialChunks(materialId: string): Promise<void> {
    const collection = await this.getOrCreateCollection();

    try {
      // Get all chunks for this material using where filter
      const results = await collection.get({
        where: { materialId },
      });

      if (results.ids && results.ids.length > 0) {
        await collection.delete({
          ids: results.ids,
        });
        logger.info(
          "VectorDB",
          `Deleted ${results.ids.length} chunks for material ${materialId}`,
          {
            materialId,
            deletedCount: results.ids.length,
          }
        );
      }
    } catch (error) {
      logger.error(
        "VectorDB",
        "Failed to delete chunks from ChromaDB",
        error instanceof Error ? error : new Error(String(error)),
        {
          materialId,
        }
      );
      throw error;
    }
  }

  /**
   * Get chunk count for a material
   * Based on official ChromaDB get() method
   */
  async getChunkCount(materialId: string, unit?: number): Promise<number> {
    const collection = await this.getOrCreateCollection();

    try {
      const where: Record<string, any> = { materialId };
      if (unit !== undefined && unit !== null) {
        where.unit = unit.toString();
      }

      const results = await collection.get({
        where,
      });

      const count = results.ids?.length || 0;
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
   * Check if chunks exist for a material (without unit filter)
   * Useful for debugging
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
