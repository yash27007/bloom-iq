import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
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
    unit?: number;
    topics?: string[];
  };
}

export interface GeneratedQuestion {
  question: string;
  answer: string;
  unit: number;
  marks: number;
  bloomLevel: string;
  difficultyLevel: string;
  questionType: string;
  topics: string[];
  contextSource: string;
}

export interface RAGQuestionContext {
  retrievedChunks: Document[];
  relevantContent: string;
  extractedTopics: string[];
  unit?: number;
}

export class RAGPDFProcessor {
  private textSplitter: RecursiveCharacterTextSplitter;
  private embeddings: GoogleGenerativeAIEmbeddings;
  private llm: ChatGoogleGenerativeAI;
  private vectorStore: MemoryVectorStore | null = null;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", "! ", "? ", "; ", ": ", " ", ""],
    });

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY!,
      model: "text-embedding-004",
    });

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY!,
      model: "gemini-1.5-flash",
      temperature: 0,
    });
  }

  /**
   * Complete RAG pipeline: Load, Split, Embed, Store PDF from Supabase
   */
  async processPDFWithRAG(
    filePath: string,
    unit?: number
  ): Promise<{
    vectorStore: MemoryVectorStore;
    chunks: Document[];
    topics: string[];
  }> {
    console.log("🔍 Starting RAG processing for PDF:", filePath);

    // Step 1: Load PDF from Supabase Storage
    const chunks = await this.loadAndSplitPDF(filePath);
    console.log(`📄 Loaded and split into ${chunks.length} chunks`);

    // Step 2: Add unit metadata if specified
    if (unit) {
      chunks.forEach((chunk) => {
        chunk.metadata.unit = unit;
      });
    }

    // Step 3: Extract topics from chunks
    const topics = this.extractTopicsFromChunks(chunks);
    console.log(`🏷️ Extracted ${topics.length} topics:`, topics.slice(0, 5));

    // Step 4: Create embeddings and vector store
    console.log("🔮 Creating embeddings and vector store...");
    const vectorStore = new MemoryVectorStore(this.embeddings);
    await vectorStore.addDocuments(chunks);
    console.log("✅ Vector store created and populated");

    this.vectorStore = vectorStore;

    return {
      vectorStore,
      chunks,
      topics,
    };
  }

  /**
   * Retrieve relevant context for question generation using RAG
   */
  async retrieveContextForQuestionGeneration(
    query: string,
    bloomLevel: string,
    unit?: number,
    topK: number = 4
  ): Promise<RAGQuestionContext> {
    if (!this.vectorStore) {
      throw new Error(
        "Vector store not initialized. Call processPDFWithRAG first."
      );
    }

    console.log(
      `🔍 Retrieving context for: "${query}" (Bloom: ${bloomLevel}, Unit: ${unit})`
    );

    // Enhance query with Bloom level context
    const enhancedQuery = this.enhanceQueryWithBloomLevel(query, bloomLevel);

    // Retrieve relevant documents
    const filter = unit
      ? (doc: Document) => doc.metadata.unit === unit
      : undefined;
    const retrievedDocs = await this.vectorStore.similaritySearch(
      enhancedQuery,
      topK,
      filter
    );

    console.log(`📋 Retrieved ${retrievedDocs.length} relevant chunks`);

    // Combine retrieved content
    const relevantContent = retrievedDocs
      .map((doc) => doc.pageContent)
      .join("\n\n");

    // Extract topics from retrieved content
    const extractedTopics = this.extractTopicsFromChunks(retrievedDocs);

    return {
      retrievedChunks: retrievedDocs,
      relevantContent,
      extractedTopics,
      unit,
    };
  }

  /**
   * Generate questions using RAG-enhanced context
   */
  async generateQuestionsWithRAG(
    context: RAGQuestionContext,
    config: {
      bloomLevel: string;
      questionType: string;
      difficultyLevel: string;
      marks: number;
      count: number;
    }
  ): Promise<GeneratedQuestion[]> {
    console.log(`🧠 Generating ${config.count} questions using RAG context`);

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert university question paper setter. Use the provided context to generate high-quality academic questions.

CONTEXT:
{context}

TOPICS EXTRACTED:
{topics}

Your task is to generate {count} question(s) with the following specifications:
- Bloom Level: {bloomLevel}
- Question Type: {questionType}
- Difficulty: {difficultyLevel}
- Marks: {marks}
- Unit: {unit}

BLOOM TAXONOMY GUIDELINES:
- REMEMBER: Recall facts, terms, concepts (define, list, identify, name, state)
- UNDERSTAND: Comprehension, interpretation (explain, summarize, interpret, compare)
- APPLY: Use knowledge in new situations (apply, demonstrate, calculate, solve)
- ANALYZE: Break down information, find patterns (analyze, examine, categorize)
- EVALUATE: Make judgments, critique (evaluate, justify, critique, assess)
- CREATE: Combine elements to form new ideas (create, design, develop, formulate)

QUESTION REQUIREMENTS:
1. Questions must be directly relevant to the provided context
2. Must align with the specified Bloom taxonomy level
3. Should test understanding of the extracted topics
4. Must be academically rigorous and university-level
5. Include proper answer/explanation

OUTPUT FORMAT (JSON):
[
  {{
    "question": "Clear, specific question text",
    "answer": "Comprehensive answer or explanation", 
    "unit": {unit},
    "marks": {marks},
    "bloomLevel": "{bloomLevel}",
    "difficultyLevel": "{difficultyLevel}",
    "questionType": "{questionType}",
    "topics": ["relevant", "topics"],
    "contextSource": "Brief reference to source material"
  }}
]

Generate exactly {count} question(s) in valid JSON format.`,
      ],
      ["human", "Generate questions based on the context and requirements."],
    ]);

    const formattedPrompt = await prompt.format({
      context: context.relevantContent.substring(0, 4000), // Limit context size
      topics: context.extractedTopics.join(", "),
      bloomLevel: config.bloomLevel,
      questionType: config.questionType,
      difficultyLevel: config.difficultyLevel,
      marks: config.marks,
      count: config.count,
      unit: context.unit || "General",
    });

    try {
      const response = await this.llm.invoke(formattedPrompt);
      const responseText = response.content as string;

      // Clean and parse JSON response
      let jsonString = responseText.trim();
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const questions = JSON.parse(jsonString);
      console.log(
        `✅ Generated ${
          Array.isArray(questions) ? questions.length : 1
        } questions`
      );

      return Array.isArray(questions) ? questions : [questions];
    } catch (error) {
      console.error("Error generating questions:", error);

      // Fallback question based on context
      const fallbackQuestion = {
        question: `Explain the key concepts related to ${
          context.extractedTopics[0] || "the given topic"
        } covered in the course material.`,
        answer: `This question tests ${config.bloomLevel.toLowerCase()} level understanding of ${
          context.extractedTopics[0] || "fundamental concepts"
        } as covered in the provided context.`,
        unit: context.unit || 1,
        marks: config.marks,
        bloomLevel: config.bloomLevel,
        difficultyLevel: config.difficultyLevel,
        questionType: config.questionType,
        topics: context.extractedTopics.slice(0, 3),
        contextSource: "Course material",
      };

      return [fallbackQuestion];
    }
  }

  /**
   * Private method to load and split PDF
   */
  private async loadAndSplitPDF(filePath: string): Promise<Document[]> {
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
      // Load PDF using LangChain
      const loader = new PDFLoader(tempFilePath, {
        splitPages: true,
      });

      const documents = await loader.load();

      // Split documents into chunks
      const chunks = await this.textSplitter.splitDocuments(documents);

      return chunks;
    } finally {
      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn("Failed to clean up temp file:", cleanupError);
      }
    }
  }

  /**
   * Enhance search query based on Bloom taxonomy level
   */
  private enhanceQueryWithBloomLevel(
    query: string,
    bloomLevel: string
  ): string {
    const bloomEnhancements = {
      REMEMBER: "facts definitions terms concepts basic knowledge",
      UNDERSTAND: "explanation interpretation meaning comprehension",
      APPLY: "application implementation practical use examples",
      ANALYZE: "analysis breakdown components relationships patterns",
      EVALUATE: "evaluation assessment judgment critique comparison",
      CREATE: "design creation synthesis innovation development",
    };

    const enhancement =
      bloomEnhancements[bloomLevel as keyof typeof bloomEnhancements] || "";
    return `${query} ${enhancement}`;
  }

  /**
   * Extract topics from document chunks
   */
  private extractTopicsFromChunks(chunks: Document[]): string[] {
    const topics = new Set<string>();

    chunks.forEach((chunk) => {
      const content = chunk.pageContent.toLowerCase();

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

        // Extract capitalized terms (likely important concepts)
        const capitalizedTerms = line.match(
          /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
        );
        if (capitalizedTerms) {
          capitalizedTerms.forEach((term) => {
            if (
              term.length > 3 &&
              term.length < 30 &&
              !term.match(/^(The|This|That|With|From|When|Where)$/)
            ) {
              topics.add(term.toLowerCase());
            }
          });
        }
      });
    });

    return Array.from(topics).slice(0, 15); // Limit to top 15 topics
  }

  /**
   * Get vector store for external use
   */
  getVectorStore(): MemoryVectorStore | null {
    return this.vectorStore;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.vectorStore = null;
  }
}
