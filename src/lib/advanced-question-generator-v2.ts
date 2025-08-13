import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { vectorRAG } from "./supabase-vector-rag-v2";
import { prisma } from "./prisma";

// Define enums locally for now
enum Marks {
  TWO_MARKS = "TWO_MARKS",
  EIGHT_MARKS = "EIGHT_MARKS",
  SIXTEEN_MARKS = "SIXTEEN_MARKS",
}

enum QuestionCategory {
  DIRECT = "DIRECT",
  SCENARIO = "SCENARIO",
  PROBLEMATIC = "PROBLEMATIC",
  MIXED = "MIXED",
}

interface BloomLevel {
  level: string;
  description: string;
  keywords: string[];
}

interface GeneratedQuestion {
  questionText: string;
  bloomLevel: string;
  marks: Marks;
  category: QuestionCategory;
  coMapping?: string;
  unit?: number;
  metadata: {
    difficulty: string;
    estimatedTime: string;
    context: string;
  };
}

interface QuestionGenerationRequest {
  courseId: string;
  unit?: number;
  marks: Marks;
  category: QuestionCategory;
  bloomLevel: string;
  coMapping?: string;
  topic?: string;
  count: number;
}

export class AdvancedQuestionGenerator {
  private llm: ChatGoogleGenerativeAI;
  private bloomLevels: BloomLevel[];

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_AI_API_KEY!,
      model: "gemini-1.5-pro",
      temperature: 0.7,
      maxOutputTokens: 8192,
    });

    this.bloomLevels = [
      {
        level: "L1 - Remember",
        description: "Recall facts, basic concepts, and definitions",
        keywords: [
          "define",
          "list",
          "identify",
          "name",
          "state",
          "recall",
          "recognize",
        ],
      },
      {
        level: "L2 - Understand",
        description: "Explain ideas, concepts, and interpret information",
        keywords: [
          "explain",
          "describe",
          "interpret",
          "summarize",
          "compare",
          "discuss",
          "outline",
        ],
      },
      {
        level: "L3 - Apply",
        description: "Use knowledge in new situations and solve problems",
        keywords: [
          "apply",
          "demonstrate",
          "solve",
          "calculate",
          "implement",
          "use",
          "construct",
        ],
      },
      {
        level: "L4 - Analyze",
        description: "Break down information and examine relationships",
        keywords: [
          "analyze",
          "examine",
          "compare",
          "contrast",
          "differentiate",
          "investigate",
        ],
      },
      {
        level: "L5 - Evaluate",
        description: "Make judgments and assess value of ideas",
        keywords: [
          "evaluate",
          "assess",
          "critique",
          "judge",
          "justify",
          "defend",
          "recommend",
        ],
      },
      {
        level: "L6 - Create",
        description: "Generate new ideas, products, or ways of viewing things",
        keywords: [
          "create",
          "design",
          "develop",
          "formulate",
          "compose",
          "construct",
          "propose",
        ],
      },
    ];
  }

  /**
   * Generate contextual questions using RAG
   */
  async generateContextualQuestions(
    request: QuestionGenerationRequest
  ): Promise<GeneratedQuestion[]> {
    try {
      console.log(
        `🎯 Generating ${request.count} questions for ${request.category} (${request.marks} marks)`
      );

      // Get relevant context from vector store
      const context = await vectorRAG.getRelevantContext(
        request.courseId,
        request.unit,
        request.topic,
        10
      );

      if (!context.trim()) {
        throw new Error("No relevant content found for question generation");
      }

      // Get course details
      const course = await prisma.course.findUnique({
        where: { id: request.courseId },
        select: {
          courseCode: true,
          courseName: true,
        },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Find appropriate Bloom level
      const bloomLevel =
        this.bloomLevels.find((bl) =>
          bl.level.toLowerCase().includes(request.bloomLevel.toLowerCase())
        ) || this.bloomLevels[0];

      // Generate questions using AI
      const questions = await this.generateQuestionsWithAI({
        context,
        course,
        request,
        bloomLevel,
      });

      return questions;
    } catch (error) {
      console.error("Error generating contextual questions:", error);
      throw error;
    }
  }

  /**
   * Generate questions using AI with structured prompt
   */
  private async generateQuestionsWithAI({
    context,
    course,
    request,
    bloomLevel,
  }: {
    context: string;
    course: { courseCode: string; courseName: string };
    request: QuestionGenerationRequest;
    bloomLevel: BloomLevel;
  }): Promise<GeneratedQuestion[]> {
    const marksValue = parseInt(request.marks.toString());
    const difficultyMap: Record<number, string> = {
      2: "Easy",
      8: "Medium",
      16: "Hard",
    };

    const timeMap: Record<number, string> = {
      2: "5-8 minutes",
      8: "15-20 minutes",
      16: "30-40 minutes",
    };

    const prompt = `
You are an expert university professor creating ${request.category.toLowerCase()} questions for ${
      course.courseCode
    } - ${course.courseName}.

CONTEXT MATERIAL:
${context}

REQUIREMENTS:
- Generate exactly ${request.count} unique questions
- Marks per question: ${request.marks} (${marksValue} marks)
- Question type: ${request.category}
- Bloom's Taxonomy Level: ${bloomLevel.level} - ${bloomLevel.description}
- Unit: ${request.unit || "Any"}
- Difficulty: ${difficultyMap[marksValue] || "Medium"}
- Course outcome mapping: ${request.coMapping || "CO1"}

BLOOM LEVEL GUIDELINES (${bloomLevel.level}):
Use action verbs: ${bloomLevel.keywords.join(", ")}
${bloomLevel.description}

QUESTION FORMAT GUIDELINES:
For ${marksValue} marks questions:
${
  marksValue === 2
    ? `- Short answer questions (2-3 sentences expected)
  - Focus on key definitions, concepts, or simple applications
  - Clear, direct questions that can be answered concisely`
    : marksValue === 8
    ? `- Medium answer questions (1-2 paragraphs expected) 
  - Require explanation, analysis, or problem-solving
  - May include multiple parts (a), (b), (c)
  - Should demonstrate understanding and application`
    : `- Long answer questions (detailed response expected)
  - Comprehensive analysis, evaluation, or creation tasks
  - Multiple interconnected parts
  - Require deep understanding and critical thinking`
}

OUTPUT FORMAT:
Return a JSON array with exactly ${request.count} questions:
[
  {
    "questionText": "Well-formed question text here",
    "bloomLevel": "${bloomLevel.level}",
    "marks": "${request.marks}",
    "category": "${request.category}",
    "coMapping": "${request.coMapping || "CO1"}",
    "unit": ${request.unit || 1},
    "metadata": {
      "difficulty": "${difficultyMap[marksValue] || "Medium"}",
      "estimatedTime": "${timeMap[marksValue] || "10-15 minutes"}",
      "context": "Brief context about the topic area"
    }
  }
]

IMPORTANT:
- Each question must be unique and non-repetitive
- Questions must be based on the provided context material
- Use appropriate academic language and terminology
- Ensure questions are achievable within the mark allocation
- Include clear instructions and expected response format where needed
- For higher mark questions, consider including sub-parts (a), (b), (c)

Generate exactly ${request.count} questions now:`;

    try {
      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }

      const questions = JSON.parse(jsonMatch[0]);

      // Validate and format questions
      return questions.map(
        (q: {
          questionText: string;
          bloomLevel?: string;
          marks?: string;
          category?: string;
          coMapping?: string;
          unit?: number;
          metadata?: {
            difficulty?: string;
            estimatedTime?: string;
            context?: string;
          };
        }) => ({
          questionText: q.questionText,
          bloomLevel: q.bloomLevel || bloomLevel.level,
          marks: request.marks,
          category: request.category,
          coMapping: q.coMapping || request.coMapping,
          unit: q.unit || request.unit,
          metadata: {
            difficulty:
              q.metadata?.difficulty || difficultyMap[marksValue] || "Medium",
            estimatedTime:
              q.metadata?.estimatedTime ||
              timeMap[marksValue] ||
              "10-15 minutes",
            context: q.metadata?.context || `Unit ${request.unit} content`,
          },
        })
      );
    } catch (error) {
      console.error("Error in AI question generation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate questions: ${errorMessage}`);
    }
  }

  /**
   * Simple question generation for testing
   */
  async generateSimpleQuestions(
    courseId: string,
    count: number = 5
  ): Promise<GeneratedQuestion[]> {
    try {
      return await this.generateContextualQuestions({
        courseId,
        marks: Marks.EIGHT_MARKS,
        category: QuestionCategory.PROBLEMATIC,
        bloomLevel: "L3 - Apply",
        coMapping: "CO1",
        count,
      });
    } catch (error) {
      console.error("Error generating simple questions:", error);
      throw error;
    }
  }
}

export const questionGenerator = new AdvancedQuestionGenerator();
