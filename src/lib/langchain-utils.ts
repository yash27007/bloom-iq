import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { supabase } from "./supabase-storage";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ProcessedChunk {
  content: string;
  metadata: {
    source: string;
    pageNumber?: number;
    chunkIndex: number;
    totalChunks: number;
    topics?: string[];
  };
}

export class LangChainPDFProcessor {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 3000,
      chunkOverlap: 300,
      separators: ["\n\n", "\n", ". ", "! ", "? ", "; ", ": ", " ", ""],
    });
  }

  /**
   * Load and process a PDF file from Supabase Storage
   */
  async loadAndProcessPDF(filePath: string): Promise<ProcessedChunk[]> {
    try {
      console.log("Processing PDF from Supabase:", filePath);

      // Download PDF from Supabase Storage
      const { data, error } = await supabase.storage
        .from("course-materials")
        .download(filePath);

      if (error) {
        throw new Error(`Failed to download PDF: ${error.message}`);
      }

      // Create temporary file
      const tempDir = os.tmpdir();
      const tempFileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.pdf`;
      const tempFilePath = path.join(tempDir, tempFileName);

      // Write blob to temporary file
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(tempFilePath, buffer);

      try {
        // Load PDF using LangChain (simplified without pdfjs import)
        const loader = new PDFLoader(tempFilePath, {
          splitPages: true,
        });

        const documents = await loader.load();
        console.log(`Loaded ${documents.length} pages from PDF`);

        // Split documents into chunks
        const chunks = await this.textSplitter.splitDocuments(documents);
        console.log(`Split into ${chunks.length} chunks`);

        const processedChunks = chunks.map((chunk, index) => ({
          content: chunk.pageContent,
          metadata: {
            source: filePath,
            pageNumber: (chunk.metadata as { loc?: { pageNumber?: number } })
              .loc?.pageNumber,
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        }));

        return processedChunks;
      } finally {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn("Failed to clean up temp file:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw new Error(`Failed to process PDF: ${error}`);
    }
  }

  /**
   * Process text content directly (for already extracted text)
   */
  async processTextContent(
    content: string,
    source: string
  ): Promise<ProcessedChunk[]> {
    const documents = [
      new Document({
        pageContent: content,
        metadata: { source },
      }),
    ];

    const chunks = await this.textSplitter.splitDocuments(documents);

    return chunks.map((chunk, index) => ({
      content: chunk.pageContent,
      metadata: {
        source,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));
  }

  /**
   * Extract key topics from processed chunks
   */
  extractTopicsFromChunks(chunks: ProcessedChunk[]): string[] {
    const topics = new Set<string>();

    chunks.forEach((chunk) => {
      // Simple topic extraction based on common patterns
      const content = chunk.content.toLowerCase();

      // Look for headings and important terms
      const lines = content.split("\n");
      lines.forEach((line) => {
        // Extract potential topics from headings
        if (line.match(/^\d+\.?\s+/) || line.match(/^[a-z]\)\s+/i)) {
          const topic = line
            .replace(/^\d+\.?\s+/, "")
            .replace(/^[a-z]\)\s+/i, "")
            .trim();
          if (topic.length > 3 && topic.length < 50) {
            topics.add(topic);
          }
        }

        // Extract terms in bold or emphasized
        const emphasized = line.match(/\*\*(.*?)\*\*/g);
        if (emphasized) {
          emphasized.forEach((term) => {
            const cleanTerm = term.replace(/\*\*/g, "").trim();
            if (cleanTerm.length > 3 && cleanTerm.length < 30) {
              topics.add(cleanTerm);
            }
          });
        }
      });
    });

    return Array.from(topics).slice(0, 10); // Limit to top 10 topics
  }

  /**
   * Get unit-specific content from chunks
   */
  getUnitContent(chunks: ProcessedChunk[], unit: number): ProcessedChunk[] {
    const unitKeywords = [
      `unit ${unit}`,
      `unit-${unit}`,
      `unit${unit}`,
      `chapter ${unit}`,
      `module ${unit}`,
    ];

    return chunks.filter((chunk) => {
      const content = chunk.content.toLowerCase();
      return unitKeywords.some((keyword) => content.includes(keyword));
    });
  }

  /**
   * Merge chunks for better context while respecting token limits
   */
  mergeChunksForContext(
    chunks: ProcessedChunk[],
    maxTokens: number = 8000
  ): string {
    let mergedContent = "";
    let tokenCount = 0;

    for (const chunk of chunks) {
      const chunkTokens = Math.ceil(chunk.content.length / 4); // Rough token estimation

      if (tokenCount + chunkTokens > maxTokens) {
        break;
      }

      mergedContent += chunk.content + "\n\n";
      tokenCount += chunkTokens;
    }

    return mergedContent.trim();
  }

  /**
   * Clean and normalize content for better AI processing
   */
  cleanContent(content: string): string {
    return content
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/([.!?])\s*([A-Z])/g, "$1 $2") // Ensure proper sentence spacing
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
      .trim();
  }
}
