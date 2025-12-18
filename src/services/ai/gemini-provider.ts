/**
 * Gemini AI Provider
 *
 * Implementation of AIProvider interface for Google Gemini
 * Uses @google/genai SDK
 * API Reference: https://ai.google.dev/gemini-api/docs
 */

import { GoogleGenAI } from "@google/genai";
import { chunkContent } from "@/lib/content-chunker";
import type {
  AIProvider,
  AIProviderConfig,
  QuestionGenerationParams,
  GeneratedQuestion,
} from "./types";
import { OLLAMA_SYSTEM_PROMPT } from "./prompts/ollama-prompt";
import { logger } from "@/lib/logger";
import { parseQuestionResponse } from "./parsers/question-parser";

/**
 * Supported Gemini models
 */
export const GEMINI_MODELS = {
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  GEMINI_2_0_FLASH: "gemini-2.0-flash",
  GEMINI_1_5_PRO: "gemini-1.5-pro",
  GEMINI_1_5_FLASH: "gemini-1.5-flash",
} as const;

/**
 * Gemini AI Service
 * Handles AI model interactions for question generation using Google Gemini
 */
export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI | null;
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private topP: number;

  constructor(config: AIProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || "";

    if (!this.apiKey) {
      logger.warn(
        "GeminiProvider",
        "GEMINI_API_KEY not found in environment variables"
      );
      this.client = null;
    } else {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }

    this.model =
      config.model ||
      process.env.GEMINI_MODEL ||
      process.env.DEFAULT_AI_MODEL ||
      GEMINI_MODELS.GEMINI_2_5_FLASH;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 40000;
    this.topP = config.topP ?? 0.9;
  }

  getProviderName(): string {
    return "Gemini";
  }

  switchModel(model: string): void {
    this.model = model;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client || !this.apiKey) {
        return false;
      }

      // Try a simple generateContent call as a connection test
      await this.client.models.generateContent({
        model: this.model,
        contents: "test",
      });
      return true;
    } catch (_error) {
      return false;
    }
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      if (!this.client || !this.apiKey) {
        return Object.values(GEMINI_MODELS);
      }

      // The SDK doesn't have a direct list() method, so return default models
      // Users can override via GEMINI_MODEL env variable
      return Object.values(GEMINI_MODELS);
    } catch (_error) {
      // Return default models on error
      return Object.values(GEMINI_MODELS);
    }
  }

  /**
   * Generate exam questions using Gemini AI
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

      if (!this.apiKey) {
        throw new Error("GEMINI_API_KEY is required but not found");
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

      const finalQuestions = allQuestions.slice(0, totalQuestions);

      // If we got some questions (even if not all), return them instead of failing
      if (finalQuestions.length > 0) {
        logger.info(
          "GeminiProvider",
          `Generated ${finalQuestions.length} questions (requested ${totalQuestions})`
        );
        return finalQuestions;
      }

      // Only throw if we got absolutely no questions
      throw new Error(
        "Failed to generate any questions from Gemini after all retries"
      );
    } catch (error) {
      logger.error(
        "GeminiProvider",
        "Question generation failed",
        error instanceof Error ? error : new Error(String(error))
      );
      // Re-throw to allow fallback mechanism
      throw error;
    }
  }

  /**
   * Generate questions from a single content chunk
   */
  private async generateQuestionsFromChunk(
    params: QuestionGenerationParams,
    contentChunk: string,
    retryCount: number = 0,
    accumulatedQuestions: GeneratedQuestion[] = []
  ): Promise<GeneratedQuestion[]> {
    const prompt = this.buildPrompt(params, contentChunk);
    const maxRetries = 2;

    try {
      logger.debug(
        "GeminiProvider",
        `Attempt ${retryCount + 1}/${maxRetries + 1}: Generating questions`,
        {
          model: this.model,
          contentLength: contentChunk.length,
        }
      );

      if (!this.client) {
        throw new Error("Gemini client not initialized. Check GEMINI_API_KEY.");
      }

      // Combine system prompt and user prompt
      const fullPrompt = `${OLLAMA_SYSTEM_PROMPT}\n\n${prompt}`;

      // Use the SDK to generate content
      const result = await this.client.models.generateContent({
        model: this.model,
        contents: fullPrompt,
        config: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
          topP: this.topP,
        },
      });

      // Extract text from response (handles markdown format)
      // The response.text property contains the generated text
      const responseText = result.text || "";

      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      const parsed = parseQuestionResponse(responseText, "GeminiProvider");
      const allQuestions = [...accumulatedQuestions, ...parsed.questions];

      // Validate and check if we have enough questions
      const totalRequested =
        params.questionCounts.easy +
        params.questionCounts.medium +
        params.questionCounts.hard;

      if (allQuestions.length >= totalRequested || retryCount >= maxRetries) {
        return allQuestions.slice(0, totalRequested);
      }

      // Retry with adjusted parameters
      const delay = (retryCount + 1) * 3000; // Progressive delay: 3s, 6s
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.generateQuestionsFromChunk(
        params,
        contentChunk,
        retryCount + 1,
        allQuestions
      );
    } catch (error) {
      if (retryCount < maxRetries && accumulatedQuestions.length === 0) {
        const delay = (retryCount + 1) * 3000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.generateQuestionsFromChunk(
          params,
          contentChunk,
          retryCount + 1,
          accumulatedQuestions
        );
      }

      // Return accumulated questions if we have any
      if (accumulatedQuestions.length > 0) {
        logger.warn("GeminiProvider", "Returning partial results after error", {
          accumulatedCount: accumulatedQuestions.length,
          error: error instanceof Error ? error.message : String(error),
        });
        return accumulatedQuestions;
      }

      throw error;
    }
  }

  /**
   * Build prompt for question generation
   */
  private buildPrompt(
    params: QuestionGenerationParams,
    content: string
  ): string {
    const {
      courseName,
      materialName,
      unit,
      questionCounts,
      bloomLevels,
      questionTypes,
    } = params;

    return `Generate exam questions from the following course material.

COURSE INFORMATION:
- Course: ${courseName}
- Material: ${materialName}
- Unit: ${unit}

QUESTION REQUIREMENTS:
- Easy Questions: ${questionCounts.easy} (2 marks each)
- Medium Questions: ${questionCounts.medium} (8 marks each)
- Hard Questions: ${questionCounts.hard} (16 marks each)
- Total: ${
      questionCounts.easy + questionCounts.medium + questionCounts.hard
    } questions

BLOOM'S TAXONOMY DISTRIBUTION:
- REMEMBER: ${bloomLevels.remember}
- UNDERSTAND: ${bloomLevels.understand}
- APPLY: ${bloomLevels.apply}
- ANALYZE: ${bloomLevels.analyze}
- EVALUATE: ${bloomLevels.evaluate}
- CREATE: ${bloomLevels.create}

QUESTION TYPE DISTRIBUTION:
- DIRECT: ${questionTypes.direct}
- INDIRECT: ${questionTypes.indirect}
- SCENARIO_BASED: ${questionTypes.scenarioBased}
- PROBLEM_BASED: ${questionTypes.problemBased}

COURSE MATERIAL:
${content}

Generate questions following the system prompt instructions. Ensure exact counts and proper formatting.`;
  }

  /**
   * Parse and extract questions from Gemini API response (reuses Ollama parser logic)
   * The response is in markdown format, so we need to extract JSON from it
   */
  private parseQuestionResponse(response: string): {
    questions: GeneratedQuestion[];
  } {
    try {
      // Clean the response: remove markdown code blocks if present
      let cleanedResponse = response.trim();

      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/gm, "");
      cleanedResponse = cleanedResponse.replace(/\n?```\s*$/gm, "");
      cleanedResponse = cleanedResponse.trim();

      // Try to find JSON object with questions array
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn("GeminiProvider", "No JSON object found in response", {
          responsePreview: response.substring(0, 200),
        });
        throw new Error("No valid JSON found in response");
      }

      logger.debug(
        "GeminiProvider",
        `Attempting to parse JSON (${jsonMatch[0].length} chars)`
      );
      const parsed = JSON.parse(jsonMatch[0]);

      // Handle empty JSON or missing questions array gracefully
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        logger.warn("GeminiProvider", "Empty or invalid response structure", {
          parsed: JSON.stringify(parsed, null, 2),
        });
        return { questions: [] };
      }

      logger.debug(
        "GeminiProvider",
        `Found ${parsed.questions.length} questions in response`
      );

      // Log first question structure for debugging
      if (parsed.questions.length > 0) {
        logger.debug("GeminiProvider", "First question structure", {
          question: JSON.stringify(parsed.questions[0], null, 2),
        });
      }

      // Sanitize questions - fill in missing fields with reasonable defaults
      const sanitizedQuestions = this.sanitizeQuestions(parsed.questions);

      // Validate questions
      this.validateQuestions(sanitizedQuestions);
      this.validateDifficultyDistribution(sanitizedQuestions);

      return { questions: sanitizedQuestions };
    } catch (error) {
      logger.error(
        "GeminiProvider",
        "Failed to parse question response",
        error instanceof Error ? error : new Error(String(error)),
        { responsePreview: response.substring(0, 200) }
      );
      if (error instanceof SyntaxError) {
        logger.error(
          "GeminiProvider",
          "JSON syntax error - response is not valid JSON"
        );
      }
      throw new Error(
        `Failed to parse Gemini response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Strip markdown formatting from text while preserving content
   * Reused from Ollama provider
   */
  private stripMarkdown(text: string): string {
    if (!text || typeof text !== "string") {
      return text;
    }

    let cleaned = text;

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
    cleaned = cleaned.replace(/`[^`]*`/g, "");

    // Remove markdown links but keep the text: [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Remove markdown images: ![alt](url) -> alt
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");

    // Remove markdown headers (# Header -> Header)
    cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, "$1");

    // Remove bold: **text** or __text__ -> text
    cleaned = cleaned.replace(/\*\*([^*]+?)\*\*/g, "$1");
    cleaned = cleaned.replace(/__([^_]+?)__/g, "$1");

    // Remove italic: *text* or _text_ -> text
    cleaned = cleaned.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1");
    cleaned = cleaned.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, "$1");

    // Remove markdown list markers but keep content
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");

    // Remove horizontal rules
    cleaned = cleaned.replace(/^[-*_]{3,}$/gm, "");

    // Remove markdown blockquotes: > text -> text
    cleaned = cleaned.replace(/^>\s+(.+)$/gm, "$1");

    // Remove markdown tables (basic) - replace pipe with space
    cleaned = cleaned.replace(/\|/g, " ");

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    cleaned = cleaned.replace(/[ \t]{2,}/g, " ");
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Sanitize questions to ensure all required fields are present
   * Reused from Ollama provider with markdown stripping
   */
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
      let marksValue = rawMarks || "";

      // Convert numeric marks to text format
      if (marksValue === "2" || marksValue === "TWO") {
        marksValue = "TWO";
      } else if (marksValue === "8" || marksValue === "EIGHT") {
        marksValue = "EIGHT";
      } else if (marksValue === "16" || marksValue === "SIXTEEN") {
        marksValue = "SIXTEEN";
      } else if (!marksValue) {
        // Default based on difficulty
        marksValue =
          normalizedDifficulty === "EASY"
            ? "TWO"
            : normalizedDifficulty === "HARD"
            ? "SIXTEEN"
            : "EIGHT";
      }

      const normalizedMarks = marksValue.toUpperCase().trim();

      // Log if marks is not a valid value
      if (!["TWO", "EIGHT", "SIXTEEN"].includes(normalizedMarks)) {
        logger.warn("GeminiProvider", "Invalid marks value, defaulting", {
          rawMarks,
          normalizedMarks,
          normalizedDifficulty,
        });
        marksValue =
          normalizedDifficulty === "EASY"
            ? "TWO"
            : normalizedDifficulty === "HARD"
            ? "SIXTEEN"
            : "EIGHT";
      }

      // Map any potential field name variations to standard names
      // Strip markdown from question and answer text
      const rawQuestionText = getTextValue(
        "question_text",
        "question",
        "questionText"
      );
      const rawAnswerText = getTextValue("answer_text", "answer", "answerText");

      const sanitized: GeneratedQuestion = {
        question_text: this.stripMarkdown(rawQuestionText),
        answer_text: this.stripMarkdown(rawAnswerText),
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

  /**
   * Validate generated questions for quality and completeness
   */
  private validateQuestions(questions: GeneratedQuestion[]): void {
    const placeholderPatterns = [
      /\[Mock\s+(EASY|MEDIUM|HARD)\]/i,
      /This is a (TWO|EIGHT|SIXTEEN)-mark answer/i,
      /\[Answer here\]/i,
      /\[Insert.*\]/i,
    ];

    logger.debug(
      "GeminiProvider",
      `Checking ${questions.length} questions for quality`
    );

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      if (
        !question.question_text ||
        question.question_text.trim().length === 0
      ) {
        logger.warn(
          "GeminiProvider",
          `Question ${i + 1} has empty question_text`
        );
        continue;
      }

      if (!question.answer_text || question.answer_text.trim().length === 0) {
        logger.warn(
          "GeminiProvider",
          `Question ${i + 1} has empty answer_text`
        );
      }

      for (const pattern of placeholderPatterns) {
        if (
          pattern.test(question.question_text) ||
          pattern.test(question.answer_text)
        ) {
          logger.warn(
            "GeminiProvider",
            `Question ${i + 1} contains placeholder text`
          );
        }
      }
    }
  }

  /**
   * Validate difficulty distribution
   */
  private validateDifficultyDistribution(questions: GeneratedQuestion[]): void {
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    questions.forEach((q) => counts[q.difficulty_level]++);

    logger.debug("GeminiProvider", "Difficulty distribution", {
      EASY: counts.EASY,
      MEDIUM: counts.MEDIUM,
      HARD: counts.HARD,
    });

    if (counts.EASY === 0 && counts.HARD === 0) {
      logger.warn("GeminiProvider", "Only MEDIUM questions generated");
    }
  }

  /**
   * Adjust question counts proportionally for chunk-based generation
   */
  private adjustQuestionCounts(
    params: QuestionGenerationParams,
    questionsForChunk: number,
    totalQuestions: number
  ): QuestionGenerationParams {
    const ratio = questionsForChunk / totalQuestions;

    return {
      ...params,
      questionCounts: {
        easy: Math.max(0, Math.round(params.questionCounts.easy * ratio)),
        medium: Math.max(0, Math.round(params.questionCounts.medium * ratio)),
        hard: Math.max(0, Math.round(params.questionCounts.hard * ratio)),
      },
      bloomLevels: {
        remember: Math.max(0, Math.round(params.bloomLevels.remember * ratio)),
        understand: Math.max(
          0,
          Math.round(params.bloomLevels.understand * ratio)
        ),
        apply: Math.max(0, Math.round(params.bloomLevels.apply * ratio)),
        analyze: Math.max(0, Math.round(params.bloomLevels.analyze * ratio)),
        evaluate: Math.max(0, Math.round(params.bloomLevels.evaluate * ratio)),
        create: Math.max(0, Math.round(params.bloomLevels.create * ratio)),
      },
      questionTypes: {
        direct: Math.max(0, Math.round(params.questionTypes.direct * ratio)),
        indirect: Math.max(
          0,
          Math.round(params.questionTypes.indirect * ratio)
        ),
        scenarioBased: Math.max(
          0,
          Math.round(params.questionTypes.scenarioBased * ratio)
        ),
        problemBased: Math.max(
          0,
          Math.round(params.questionTypes.problemBased * ratio)
        ),
      },
    };
  }
}
