import PDFParse from "pdf-parse";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ProcessedDocument {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    fileType: string;
    fileName: string;
  };
}

export class DocumentProcessor {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async processDocument(file: File): Promise<ProcessedDocument> {
    const fileType = file.type;
    const fileName = file.name;

    let text: string;
    let pageCount: number | undefined;

    if (fileType === "application/pdf") {
      text = await this.processPDF(file);
      // For simplicity, we'll estimate page count based on text length
      pageCount = Math.ceil(text.length / 3000); // Rough estimate
    } else if (
      fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      text = await this.processDocx(file);
    } else if (fileType === "text/plain") {
      text = await this.processText(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      text,
      metadata: {
        pageCount,
        wordCount,
        fileType,
        fileName,
      },
    };
  }

  private async processPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await PDFParse(buffer);
    return data.text;
  }

  private async processDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  private async processText(file: File): Promise<string> {
    return await file.text();
  }

  async extractKeyTopics(text: string): Promise<string[]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analyze the following academic content and extract 8-12 key topics that could be used for question generation.
Focus on main concepts, theories, definitions, processes, and important details.
Return only the topics as a simple numbered list.

Content:
${text.substring(0, 8000)} // Limit to avoid token limits

Format your response as:
1. Topic name
2. Topic name
...
`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse the numbered list
      const topics = response
        .split("\n")
        .filter((line) => line.match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((topic) => topic.length > 0);

      return topics;
    } catch (error) {
      console.error("Error extracting topics:", error);
      return ["General Concepts", "Key Definitions", "Main Theories"];
    }
  }
}
