/**
 * Ollama AI Provider
 *
 * Implementation of AIProvider interface for Ollama
 * API Reference: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import { chunkContent } from "@/lib/content-chunker";
import type {
  AIProvider,
  AIProviderConfig,
  QuestionGenerationParams,
  GeneratedQuestion,
} from "./types";
import { OLLAMA_SYSTEM_PROMPT } from "./prompts/ollama-prompt";

/**
 * Supported Ollama models (https://ollama.com/library)
 */
export const OLLAMA_MODELS = {
  GEMMA_3_4B: "gemma3:4b",
  LLAMA_3_2_3B: "llama3.2:3b",
  LLAMA_3_2_1B: "llama3.2:1b",
  LLAMA_3_1_8B: "llama3.1:8b",
  PHI_3_5: "phi3.5:latest",
  GEMMA_2_2B: "gemma2:2b",
  GEMMA_2_9B: "gemma2:9b",
  MISTRAL_7B: "mistral:7b",
  MISTRAL_NEMO_12B: "mistral-nemo:latest",
  QWEN_2_5_7B: "qwen2.5:7b",
} as const;

/**
 * Ollama AI Service
 * Handles AI model interactions for question generation using Ollama
 */
export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private topP: number;

  constructor(config: AIProviderConfig = {}) {
    this.baseUrl =
      config.baseUrl ||
      process.env.OLLAMA_URL ||
      process.env.OLLAMA_BASE_URL ||
      "http://localhost:11434";
    this.model =
      config.model ||
      process.env.OLLAMA_MODEL ||
      process.env.DEFAULT_AI_MODEL ||
      OLLAMA_MODELS.GEMMA_3_4B;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 32000;
    this.topP = config.topP ?? 0.9;
  }

  getProviderName(): string {
    return "Ollama";
  }

  switchModel(model: string): void {
    this.model = model;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (_error) {
      return false;
    }
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch (_error) {
      return [];
    }
  }

  /**
   * Generate exam questions using Ollama AI
   *
   * @param params - Question generation parameters including counts, Bloom's levels, and material content
   * @returns Array of generated questions with answers
   * @throws Error if total question count is 0 or generation fails
   */
  async generateQuestions(
    params: QuestionGenerationParams
  ): Promise<GeneratedQuestion[]> {
    try {
      const totalQuestions =
        params.questionCounts.easy +
        params.questionCounts.medium +
        params.questionCounts.hard;

      if (totalQuestions === 0) {
        throw new Error("Total question count must be greater than 0");
      }

      // Chunk content if too large
      const chunks = await chunkContent(params.materialContent, {
        maxTokensPerChunk: 8000,
      });

      if (chunks.length === 1) {
        return await this.generateQuestionsFromChunk(params, chunks[0].content);
      }

      // Distribute questions across chunks
      const questionsPerChunk = Math.ceil(totalQuestions / chunks.length);
      const allQuestions: GeneratedQuestion[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const remainingQuestions = totalQuestions - allQuestions.length;
        const questionsForThisChunk = Math.min(
          questionsPerChunk,
          remainingQuestions
        );

        if (questionsForThisChunk <= 0) break;

        const adjustedParams = this.adjustQuestionCounts(
          params,
          questionsForThisChunk,
          totalQuestions
        );
        const chunkQuestions = await this.generateQuestionsFromChunk(
          adjustedParams,
          chunks[i].content
        );

        allQuestions.push(...chunkQuestions);
      }

      return allQuestions.slice(0, totalQuestions);
    } catch (error) {
      console.error("[Ollama Provider] Question generation failed:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate questions from Ollama"
      );
    }
  }

  /**
   * Generate questions from a single content chunk
   *
   * @param params - Question generation parameters
   * @param contentChunk - Content chunk to generate questions from
   * @param retryCount - Current retry attempt number
   * @returns Array of generated questions
   * @throws Error if generation fails after max retries
   */
  private async generateQuestionsFromChunk(
    params: QuestionGenerationParams,
    contentChunk: string,
    retryCount: number = 0
  ): Promise<GeneratedQuestion[]> {
    const prompt = this.buildPrompt(params, contentChunk);
    const maxRetries = 2;

    try {
      console.log(
        `[Ollama] Attempt ${retryCount + 1}/${
          maxRetries + 1
        }: Generating questions...`
      );
      console.log(`[Ollama] Model: ${this.model}`);
      console.log(`[Ollama] Content Length: ${contentChunk.length} characters`);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          system: OLLAMA_SYSTEM_PROMPT,
          stream: false,
          format: "json", // Force JSON output mode
          options: {
            temperature: retryCount > 0 ? 0.5 : this.temperature,
            num_predict: this.maxTokens,
            top_p: this.topP,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const generatedText = data.response;

      console.log(
        `[Ollama] Generated ${generatedText.length} characters of response`
      );
      console.log(`[Ollama] Raw Response Preview (first 1000 chars):`);
      console.log(generatedText.substring(0, 1000));
      console.log(`[Ollama] Raw Response End (last 500 chars):`);
      console.log(
        generatedText.substring(Math.max(0, generatedText.length - 500))
      );

      const parsedResponse = this.parseQuestionResponse(generatedText);

      console.log(
        `[Ollama] Successfully generated ${parsedResponse.questions.length} questions`
      );
      return parsedResponse.questions;
    } catch (error) {
      console.error(`[Ollama] Attempt ${retryCount + 1} failed:`, error);

      // Retry on JSON parsing errors or validation errors
      if (
        retryCount < maxRetries &&
        error instanceof Error &&
        (error.message.includes("JSON") ||
          error.message.includes("parse") ||
          error.message.includes("placeholder") ||
          error.message.includes("generic"))
      ) {
        console.log(
          `[Ollama] Retrying (attempt ${retryCount + 2}/${maxRetries + 1})...`
        );
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.generateQuestionsFromChunk(
          params,
          contentChunk,
          retryCount + 1
        );
      }

      throw error;
    }
  }

  private buildPrompt(
    params: QuestionGenerationParams,
    content: string
  ): string {
    const { easy, medium, hard } = params.questionCounts;
    const totalQuestions = easy + medium + hard;

    return `
COURSE: ${params.courseName}
MATERIAL: ${params.materialName}
UNIT: ${params.unit}

== EXAM GENERATION TASK ==

You must generate ${totalQuestions} high-quality, exam-ready questions based STRICTLY on the course material provided below.

== MANDATORY REQUIREMENTS ==

1. QUESTION COUNT & DIFFICULTY DISTRIBUTION:
   - EASY difficulty: EXACTLY ${easy} questions
     * Marks: 2 marks each
     * Answer length: 50-100 words
     * Bloom's: REMEMBER or UNDERSTAND
   
   - MEDIUM difficulty: EXACTLY ${medium} questions
     * Marks: 8 marks each
     * Answer length: 400-600 words
     * Bloom's: APPLY or ANALYZE
   
   - HARD difficulty: EXACTLY ${hard} questions
     * Marks: 16 marks each
     * Answer length: 1000-1500 words
     * Bloom's: EVALUATE or CREATE

2. BLOOM'S TAXONOMY ALIGNMENT (STRICT):
   - REMEMBER level: ${params.bloomLevels.remember} questions -> EASY, 2 marks
   - UNDERSTAND level: ${params.bloomLevels.understand} questions -> EASY, 2 marks
   - APPLY level: ${params.bloomLevels.apply} questions -> MEDIUM, 8 marks
   - ANALYZE level: ${params.bloomLevels.analyze} questions -> MEDIUM, 8 marks
   - EVALUATE level: ${params.bloomLevels.evaluate} questions -> HARD, 16 marks
   - CREATE level: ${params.bloomLevels.create} questions -> HARD, 16 marks

3. QUESTION TYPES (ALL THREE REQUIRED):
   - DIRECT type: ${params.questionTypes.direct} questions (definitions, explanations, lists)
   - SCENARIO_BASED type: ${params.questionTypes.scenarioBased} questions (real-world situations)
   - PROBLEM_BASED type: ${params.questionTypes.problemBased} questions (apply theory, solve problems)

4. QUALITY STANDARDS (NON-NEGOTIABLE):
   - Read the material DEEPLY - cover ALL major concepts
   - Generate questions on definitions, diagrams, comparisons, applications, real-world uses
   - Write DETAILED, exam-ready answers based strictly on material
   - Include marks in question text: "(X Marks)"
   - Provide bloom_justification for every question
   - Use structured formatting (bullet points, tables, paragraphs)
   - NO generic/placeholder answers
   - NO repetition

==================== COURSE MATERIAL STARTS ====================
${content}
==================== COURSE MATERIAL ENDS ====================

== OUTPUT FORMAT ==

Return ONLY valid JSON (no markdown, no extra text):

{
  "questions": [
    {
      "question_text": "Question text here. (X Marks)",
      "answer_text": "Detailed, structured answer based on material...",
      "difficulty_level": "EASY|MEDIUM|HARD",
      "bloom_level": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE",
      "bloom_justification": "Explanation of why this Bloom's level...",
      "question_type": "DIRECT|SCENARIO_BASED|PROBLEM_BASED",
      "marks": "TWO|EIGHT|SIXTEEN",
      "unit_number": ${params.unit},
      "course_name": "${params.courseName}",
      "material_name": "${params.materialName}"
    }
  ]
}

CRITICAL: Start response with { immediately. NO text before or after JSON.`;
  }

  /**
   * Parse and extract questions from Ollama API response
   *
   * @param response - Raw text response from Ollama API
   * @returns Parsed questions array
   * @throws Error if JSON parsing fails or response structure is invalid
   */
  private parseQuestionResponse(response: string): {
    questions: GeneratedQuestion[];
  } {
    try {
      // Try to find JSON object with questions array
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[Ollama] No JSON object found in response");
        console.error("[Ollama] Full response:", response);
        throw new Error("No valid JSON found in response");
      }

      console.log(
        `[Ollama] Attempting to parse JSON (${jsonMatch[0].length} chars)`
      );
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        console.error(
          "[Ollama] Response structure:",
          JSON.stringify(parsed, null, 2)
        );
        throw new Error(
          "Invalid response structure: missing 'questions' array"
        );
      }

      console.log(
        `[Ollama] Found ${parsed.questions.length} questions in response`
      );

      // Log first question structure for debugging
      if (parsed.questions.length > 0) {
        console.log(
          "[Ollama] First question structure:",
          JSON.stringify(parsed.questions[0], null, 2)
        );
      }

      // Sanitize questions - fill in missing fields with reasonable defaults
      const sanitizedQuestions = this.sanitizeQuestions(parsed.questions);

      if (sanitizedQuestions.length > 0) {
        console.log(
          "[Ollama] Sanitized first question:",
          JSON.stringify(sanitizedQuestions[0], null, 2)
        );
      }

      this.validateQuestions(sanitizedQuestions);
      this.validateDifficultyDistribution(sanitizedQuestions);

      return { questions: sanitizedQuestions };
    } catch (error) {
      console.error(
        "[Ollama] Parse error:",
        error instanceof Error ? error.message : String(error)
      );
      if (error instanceof SyntaxError) {
        console.error(
          "[Ollama] JSON syntax error - response is not valid JSON"
        );
      }
      throw new Error(
        `Failed to parse Ollama response as JSON: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private sanitizeQuestions(
    questions: Record<string, unknown>[]
  ): GeneratedQuestion[] {
    return questions.map((questionRecord) => {
      // Helper to safely extract textual content from any shape
      const getTextValue = (...keys: string[]): string => {
        for (const key of keys) {
          if (!(key in questionRecord)) {
            continue;
          }

          const rawValue = questionRecord[key];

          if (typeof rawValue === "string") {
            const trimmed = rawValue.trim();
            if (trimmed.length > 0) {
              return trimmed;
            }
          }

          if (Array.isArray(rawValue)) {
            const arrayValue = rawValue
              .map((item) => (typeof item === "string" ? item : String(item)))
              .join(" ")
              .trim();

            if (arrayValue.length > 0) {
              return arrayValue;
            }
          }

          if (rawValue && typeof rawValue === "object") {
            // Handle nested object with "text" property or fall back to JSON string
            if (
              "text" in (rawValue as Record<string, unknown>) &&
              typeof (rawValue as Record<string, unknown>).text === "string"
            ) {
              const nestedText = (
                (rawValue as Record<string, unknown>).text as string
              ).trim();
              if (nestedText.length > 0) {
                return nestedText;
              }
            }

            const jsonString = JSON.stringify(rawValue);
            if (jsonString.length > 0 && jsonString !== "{}") {
              return jsonString;
            }
          }

          if (rawValue !== undefined && rawValue !== null) {
            const coerced = String(rawValue).trim();
            if (coerced.length > 0) {
              return coerced;
            }
          }
        }

        return "";
      };

      const getNumberValue = (fallback: number, ...keys: string[]): number => {
        for (const key of keys) {
          const rawValue = questionRecord[key];
          if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
            return rawValue;
          }

          if (
            typeof rawValue === "string" &&
            rawValue.trim().length > 0 &&
            !Number.isNaN(Number(rawValue))
          ) {
            return Number(rawValue);
          }
        }

        return fallback;
      };

      const difficultyLevel =
        getTextValue("difficulty_level", "difficulty") || "MEDIUM";
      const normalizedDifficulty = difficultyLevel.toUpperCase() as
        | "EASY"
        | "MEDIUM"
        | "HARD";

      // Get marks value and sanitize it
      const rawMarks = getTextValue("marks");
      const marksValue =
        rawMarks ||
        (normalizedDifficulty === "EASY"
          ? "TWO"
          : normalizedDifficulty === "HARD"
          ? "SIXTEEN"
          : "EIGHT");
      const normalizedMarks = marksValue.toUpperCase().trim();

      // Log if marks is not a valid value
      if (!["TWO", "EIGHT", "SIXTEEN"].includes(normalizedMarks)) {
        console.warn(
          `[Ollama] Invalid marks value "${marksValue}" (normalized: "${normalizedMarks}"), defaulting based on difficulty ${normalizedDifficulty}`
        );
      }

      // Map any potential field name variations to standard names
      const sanitized: GeneratedQuestion = {
        question_text: getTextValue(
          "question_text",
          "question",
          "questionText"
        ),
        answer_text: getTextValue("answer_text", "answer", "answerText"),
        difficulty_level: normalizedDifficulty,
        bloom_level: (
          getTextValue("bloom_level", "bloomLevel") || "UNDERSTAND"
        ).toUpperCase() as GeneratedQuestion["bloom_level"],
        question_type: (
          getTextValue("question_type", "questionType", "type") || "DIRECT"
        ).toUpperCase() as GeneratedQuestion["question_type"],
        marks: (["TWO", "EIGHT", "SIXTEEN"].includes(normalizedMarks)
          ? normalizedMarks
          : normalizedDifficulty === "EASY"
          ? "TWO"
          : normalizedDifficulty === "HARD"
          ? "SIXTEEN"
          : "EIGHT") as "TWO" | "EIGHT" | "SIXTEEN",
        bloom_justification: getTextValue(
          "bloom_justification",
          "bloomJustification",
          "bloom_reason"
        ),
        unit_number: getNumberValue(1, "unit_number", "unitNumber", "unit"),
        course_name: getTextValue("course_name", "courseName"),
        material_name: getTextValue("material_name", "materialName"),
      };

      return sanitized;
    });
  }

  private validateDifficultyDistribution(questions: GeneratedQuestion[]): void {
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    questions.forEach((q) => counts[q.difficulty_level]++);

    console.log(
      `[Ollama Validation] Difficulty: EASY=${counts.EASY}, MEDIUM=${counts.MEDIUM}, HARD=${counts.HARD}`
    );

    if (counts.EASY === 0 && counts.HARD === 0) {
      console.warn("[Ollama] WARNING: Only MEDIUM questions generated");
    }
  }

  /**
   * Validate generated questions for quality and completeness
   * Non-blocking validation - only logs warnings without throwing errors
   *
   * @param questions - Array of generated questions to validate
   */
  private validateQuestions(questions: GeneratedQuestion[]): void {
    const placeholderPatterns = [
      /\[Mock\s+(EASY|MEDIUM|HARD)\]/i,
      /This is a (TWO|EIGHT|SIXTEEN)-mark answer/i,
      /\[Answer here\]/i,
      /\[Insert.*\]/i,
    ];

    console.log(
      `[Ollama Validation] Checking ${questions.length} questions for quality...`
    );

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Check for required fields - WARN ONLY, don't throw
      if (
        !question.question_text ||
        question.question_text.trim().length === 0
      ) {
        console.warn(
          `[Ollama] WARNING: Question ${
            i + 1
          } has empty question_text - will be filtered out`
        );
        continue; // Skip further validation for this question
      }

      if (!question.answer_text || question.answer_text.trim().length === 0) {
        console.warn(
          `[Ollama] WARNING: Question ${i + 1} has empty answer_text`
        );
      }

      if (!question.difficulty_level) {
        console.warn(
          `[Ollama] WARNING: Question ${
            i + 1
          } missing difficulty_level (will default to MEDIUM)`
        );
      }

      if (!question.bloom_level) {
        console.warn(
          `[Ollama] WARNING: Question ${
            i + 1
          } missing bloom_level (will default to UNDERSTAND)`
        );
      }

      if (!question.marks) {
        console.warn(`[Ollama] WARNING: Question ${i + 1} missing marks`);
      }

      // Check for placeholder patterns - WARN ONLY
      for (const pattern of placeholderPatterns) {
        if (
          pattern.test(question.question_text) ||
          pattern.test(question.answer_text)
        ) {
          console.warn(
            `[Ollama] WARNING: Question ${
              i + 1
            } contains placeholder pattern - may be low quality`
          );
        }
      }

      // Validate answer length - WARN ONLY
      if (question.answer_text && question.answer_text.trim().length > 0) {
        const answerWords = question.answer_text
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
        const minWords =
          question.marks === "TWO"
            ? 30
            : question.marks === "EIGHT"
            ? 200
            : question.marks === "SIXTEEN"
            ? 500
            : 30;

        if (answerWords < minWords) {
          console.warn(
            `[Ollama] WARNING: Question ${
              i + 1
            } answer short: ${answerWords} words (expected: ${minWords}+ for ${
              question.marks
            } marks)`
          );
        }
      }

      // Check Bloom's alignment with difficulty - WARN ONLY
      const bloomLevel = question.bloom_level;
      const difficulty = question.difficulty_level;

      if (
        difficulty === "EASY" &&
        !["REMEMBER", "UNDERSTAND"].includes(bloomLevel)
      ) {
        console.warn(
          `[Ollama] WARNING: Question ${
            i + 1
          }: EASY should use REMEMBER/UNDERSTAND, got ${bloomLevel}`
        );
      }

      if (
        difficulty === "MEDIUM" &&
        !["APPLY", "ANALYZE"].includes(bloomLevel)
      ) {
        console.warn(
          `[Ollama] WARNING: Question ${
            i + 1
          }: MEDIUM should use APPLY/ANALYZE, got ${bloomLevel}`
        );
      }

      if (
        difficulty === "HARD" &&
        !["EVALUATE", "CREATE"].includes(bloomLevel)
      ) {
        console.warn(
          `[Ollama] WARNING: Question ${
            i + 1
          }: HARD should use EVALUATE/CREATE, got ${bloomLevel}`
        );
      }
    }

    console.log(`[Ollama Validation] Validation complete (non-blocking)`);
  }

  private adjustQuestionCounts(
    originalParams: QuestionGenerationParams,
    targetCount: number,
    totalCount: number
  ): QuestionGenerationParams {
    const ratio = targetCount / totalCount;

    return {
      ...originalParams,
      questionCounts: {
        easy: Math.ceil(originalParams.questionCounts.easy * ratio),
        medium: Math.ceil(originalParams.questionCounts.medium * ratio),
        hard: Math.ceil(originalParams.questionCounts.hard * ratio),
      },
      bloomLevels: {
        remember: Math.ceil(originalParams.bloomLevels.remember * ratio),
        understand: Math.ceil(originalParams.bloomLevels.understand * ratio),
        apply: Math.ceil(originalParams.bloomLevels.apply * ratio),
        analyze: Math.ceil(originalParams.bloomLevels.analyze * ratio),
        evaluate: Math.ceil(originalParams.bloomLevels.evaluate * ratio),
        create: Math.ceil(originalParams.bloomLevels.create * ratio),
      },
      questionTypes: {
        direct: Math.ceil(originalParams.questionTypes.direct * ratio),
        indirect: Math.ceil(originalParams.questionTypes.indirect * ratio),
        scenarioBased: Math.ceil(
          originalParams.questionTypes.scenarioBased * ratio
        ),
        problemBased: Math.ceil(
          originalParams.questionTypes.problemBased * ratio
        ),
      },
    };
  }
}

/**
 * Singleton instance
 */
export const ollamaProvider = new OllamaProvider();
