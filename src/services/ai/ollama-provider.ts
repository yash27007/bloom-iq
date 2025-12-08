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
  DEEPSEEK_R1_14B: "deepseek-r1:14b", // Recommended for high-quality question generation
  DEEPSEEK_R1_8B: "deepseek-r1:8b",
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
    // Increased to 40k tokens for generating more content per question
    // This allows for longer, more detailed answers and more questions in a single generation
    // Note: Very high values may cause slower generation or GPU overheating
    // For smaller models like gemma3:4b, consider using RAG with chunking instead
    this.maxTokens = config.maxTokens ?? 40000;
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
    // Increased retries for better chance of meeting requirements
    const maxRetries = 3;

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

      // Filter out invalid questions (empty text, etc.)
      const validQuestions = this.filterValidQuestions(
        parsedResponse.questions
      );

      // Check if we got the expected counts
      const counts = this.countQuestionsByDifficulty(validQuestions);
      const expected = params.questionCounts;

      console.log(
        `[Ollama] Generated ${
          validQuestions.length
        } valid questions (Expected: ${
          expected.easy + expected.medium + expected.hard
        })`
      );
      console.log(
        `[Ollama] Difficulty counts - EASY: ${counts.easy}/${expected.easy}, MEDIUM: ${counts.medium}/${expected.medium}, HARD: ${counts.hard}/${expected.hard}`
      );

      // Check question type counts
      const typeCounts = this.countQuestionsByType(validQuestions);
      const expectedTypes = params.questionTypes;

      console.log(
        `[Ollama] Question type counts - DIRECT: ${typeCounts.direct}/${expectedTypes.direct}, SCENARIO_BASED: ${typeCounts.scenarioBased}/${expectedTypes.scenarioBased}, PROBLEM_BASED: ${typeCounts.problemBased}/${expectedTypes.problemBased}, INDIRECT: ${typeCounts.indirect}/${expectedTypes.indirect}`
      );

      // Calculate total expected and actual
      const totalExpected = expected.easy + expected.medium + expected.hard;
      const totalActual = validQuestions.length;

      // Accept if we have at least 80% of expected questions (less strict retry logic)
      const acceptanceThreshold = 0.8;
      const hasEnoughTotal = totalActual >= totalExpected * acceptanceThreshold;

      // If counts don't match significantly and we haven't exceeded retries, retry with adjusted prompt
      // Only retry if we're missing more than 20% of questions
      const needsRetry =
        !hasEnoughTotal ||
        (expected.easy > 0 &&
          counts.easy < expected.easy * acceptanceThreshold) ||
        (expected.medium > 0 &&
          counts.medium < expected.medium * acceptanceThreshold) ||
        (expected.hard > 0 &&
          counts.hard < expected.hard * acceptanceThreshold) ||
        (expectedTypes.direct > 0 &&
          typeCounts.direct < expectedTypes.direct * acceptanceThreshold) ||
        (expectedTypes.scenarioBased > 0 &&
          typeCounts.scenarioBased <
            expectedTypes.scenarioBased * acceptanceThreshold) ||
        (expectedTypes.problemBased > 0 &&
          typeCounts.problemBased <
            expectedTypes.problemBased * acceptanceThreshold) ||
        (expectedTypes.indirect > 0 &&
          typeCounts.indirect < expectedTypes.indirect * acceptanceThreshold);

      if (needsRetry && retryCount < maxRetries) {
        console.warn(
          `[Ollama] Question counts don't match. Retrying with stronger prompt (attempt ${
            retryCount + 2
          }/${maxRetries + 1})...`
        );
        console.warn(
          `[Ollama] Missing: EASY=${Math.max(
            0,
            expected.easy - counts.easy
          )}, MEDIUM=${Math.max(
            0,
            expected.medium - counts.medium
          )}, HARD=${Math.max(0, expected.hard - counts.hard)}`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.generateQuestionsFromChunk(
          params,
          contentChunk,
          retryCount + 1
        );
      }

      // If we still don't have enough questions after retries, log a warning
      if (needsRetry && retryCount >= maxRetries) {
        console.error(
          `[Ollama] WARNING: Failed to generate required question counts after ${
            maxRetries + 1
          } attempts. Generated: ${validQuestions.length}, Expected: ${
            expected.easy + expected.medium + expected.hard
          }`
        );
      }

      return validQuestions;
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

== MANDATORY REQUIREMENTS - EXACT COUNTS REQUIRED ==

⚠️ CRITICAL: You MUST generate the EXACT number of questions specified. Do NOT generate fewer or more questions.

1. QUESTION COUNT & DIFFICULTY DISTRIBUTION (MANDATORY EXACT COUNTS):
   - EASY difficulty: EXACTLY ${easy} questions (REQUIRED - NOT ${
      easy === 0 ? 0 : easy - 1
    }, NOT ${easy + 1}, EXACTLY ${easy})
     * Marks: 2 marks each
     * Answer length: MINIMUM 50 words, ideally 80-120 words (MUST be detailed, expand with examples)
     * Bloom's: REMEMBER or UNDERSTAND ONLY
     * If ${easy} = 0, generate ZERO easy questions
   
   - MEDIUM difficulty: EXACTLY ${medium} questions (REQUIRED - NOT ${
      medium === 0 ? 0 : medium - 1
    }, NOT ${medium + 1}, EXACTLY ${medium})
     * Marks: 8 marks each
     * Answer length: MINIMUM 200 words, ideally 300-500 words (MUST be comprehensive with examples, comparisons)
     * Bloom's: APPLY or ANALYZE ONLY
     * If ${medium} = 0, generate ZERO medium questions
   
   - HARD difficulty: EXACTLY ${hard} questions (REQUIRED - NOT ${
      hard === 0 ? 0 : hard - 1
    }, NOT ${hard + 1}, EXACTLY ${hard})
     * Marks: 16 marks each
     * Answer length: MINIMUM 500 words, ideally 800-1200 words (MUST be exhaustive with multiple sections)
     * Bloom's: EVALUATE or CREATE ONLY
     * If ${hard} = 0, generate ZERO hard questions

TOTAL QUESTIONS REQUIRED: ${totalQuestions} (EASY: ${easy} + MEDIUM: ${medium} + HARD: ${hard} = ${totalQuestions})

2. BLOOM'S TAXONOMY ALIGNMENT (STRICT):
   - REMEMBER level: ${params.bloomLevels.remember} questions -> EASY, 2 marks
   - UNDERSTAND level: ${
     params.bloomLevels.understand
   } questions -> EASY, 2 marks
   - APPLY level: ${params.bloomLevels.apply} questions -> MEDIUM, 8 marks
   - ANALYZE level: ${params.bloomLevels.analyze} questions -> MEDIUM, 8 marks
   - EVALUATE level: ${params.bloomLevels.evaluate} questions -> HARD, 16 marks
   - CREATE level: ${params.bloomLevels.create} questions -> HARD, 16 marks

3. QUESTION TYPES (MANDATORY EXACT COUNTS):
   - DIRECT type: EXACTLY ${
     params.questionTypes.direct
   } questions (definitions, explanations, lists, identify/name questions)
   - SCENARIO_BASED type: EXACTLY ${
     params.questionTypes.scenarioBased
   } questions (real-world situations, case studies, applied scenarios)
   - PROBLEM_BASED type: EXACTLY ${
     params.questionTypes.problemBased
   } questions (apply theory, solve problems, calculations, step-by-step solutions)
   - INDIRECT type: EXACTLY ${
     params.questionTypes.indirect
   } questions (if specified, otherwise 0)
   
   CRITICAL: You MUST generate the EXACT number of each question type specified above.

4. QUALITY STANDARDS (NON-NEGOTIABLE):
   - Read the material DEEPLY - cover ALL major concepts, definitions, diagrams, classifications
   - Generate questions on definitions, diagrams, comparisons, applications, real-world uses
   - Write DETAILED, exam-ready answers based STRICTLY on material (NO generic content)
   - ANSWER LENGTH IS CRITICAL - Write LONG, DETAILED answers (THIS IS MANDATORY):
     * 2 marks: Write at least 30-50 words MINIMUM (expand with examples, details, context - not just 1-2 sentences)
     * 8 marks: Write at least 100-200 words MINIMUM (comprehensive explanation with multiple points, examples, comparisons, step-by-step breakdowns)
     * 16 marks: Write at least 300-500 words MINIMUM (exhaustive coverage with introduction, multiple sections, examples, analysis, comparisons, conclusion)
   - DO NOT write short answers - Always expand with more detail, examples, explanations, comparisons, step-by-step breakdowns, and context
   - Include marks in question text: "(X Marks)" - REQUIRED for every question
   - Provide bloom_justification for every question explaining why that Bloom's level was chosen
   - Use PLAIN TEXT formatting (NO markdown: no bold asterisks, no italic, no headers, no code blocks)
   - Use structured formatting: numbered lists (1. 2. 3.), bullet points (-), clear paragraphs
   - NO generic/placeholder answers like "[Answer here]" or "as mentioned in material"
   - NO repetition - every question must be unique and cover different concepts
   - Answers must be COMPLETE and DETAILED - no vague or incomplete explanations
   - For HARD questions: Include introduction, multiple subsections, examples, comparisons, critical analysis, conclusion
   - EXPAND your answers - add more detail, examples, explanations, comparisons, and context

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
      "question_type": "DIRECT|SCENARIO_BASED|PROBLEM_BASED|INDIRECT",
      "marks": "TWO|EIGHT|SIXTEEN",
      "unit_number": ${params.unit},
      "course_name": "${params.courseName}",
      "material_name": "${params.materialName}"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Start response with { immediately. NO text before or after JSON.
2. Generate EXACTLY ${totalQuestions} questions total
3. Generate EXACTLY ${easy} EASY questions
4. Generate EXACTLY ${medium} MEDIUM questions  
5. Generate EXACTLY ${hard} HARD questions
6. Generate EXACTLY ${params.questionTypes.direct} DIRECT questions
7. Generate EXACTLY ${
      params.questionTypes.scenarioBased
    } SCENARIO_BASED questions
8. Generate EXACTLY ${params.questionTypes.problemBased} PROBLEM_BASED questions
9. Use marks format: "TWO" for 2 marks, "EIGHT" for 8 marks, "SIXTEEN" for 16 marks
10. ANSWER LENGTH IS CRITICAL - Write LONG, DETAILED answers (THIS IS MANDATORY):
    - 2 marks: MINIMUM 30 words (ideally 50-80) - expand with examples, details, context, explanations
    - 8 marks: MINIMUM 100 words (ideally 200-400) - comprehensive with multiple points, examples, comparisons, step-by-step breakdowns
    - 16 marks: MINIMUM 300 words (ideally 500-800) - exhaustive with introduction, sections, examples, analysis, comparisons, conclusion
11. DO NOT write short answers - Always expand with more detail, examples, explanations, comparisons, step-by-step breakdowns, and context
12. Match Bloom's levels correctly: EASY=REMEMBER/UNDERSTAND, MEDIUM=APPLY/ANALYZE, HARD=EVALUATE/CREATE
13. GENERATE ALL QUESTIONS - Do not stop early. You MUST generate all ${totalQuestions} questions even if it takes longer
14. If you find yourself writing short answers, STOP and EXPAND them with more detail, examples, and explanations

DO NOT generate fewer questions. If you cannot generate all ${totalQuestions} questions, you MUST still try to generate as many as possible.`;
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
      // Clean the response: remove markdown code blocks if present
      let cleanedResponse = response.trim();

      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/gm, "");
      cleanedResponse = cleanedResponse.replace(/\n?```\s*$/gm, "");
      cleanedResponse = cleanedResponse.trim();

      // Try to find JSON object with questions array
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[Ollama] No JSON object found in response");
        console.error("[Ollama] Full response:", response);
        console.error("[Ollama] Cleaned response:", cleanedResponse);
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

  /**
   * Strip markdown formatting from text while preserving content
   */
  private stripMarkdown(text: string): string {
    if (!text || typeof text !== "string") {
      return text;
    }

    let cleaned = text;

    // Remove markdown code blocks (already handled in parseQuestionResponse, but keep for safety)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
    cleaned = cleaned.replace(/`[^`]*`/g, "");

    // Remove markdown links but keep the text: [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Remove markdown images: ![alt](url) -> alt
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");

    // Remove markdown headers (# Header -> Header)
    cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, "$1");

    // Remove bold: **text** or __text__ -> text (handle multiple occurrences, including colons and other punctuation)
    // Match **text** even if text contains special characters
    cleaned = cleaned.replace(/\*\*([^*]+?)\*\*/g, "$1");
    cleaned = cleaned.replace(/__([^_]+?)__/g, "$1");

    // Remove italic: *text* or _text_ -> text (be careful with edge cases)
    // Only match if not part of bold markers
    cleaned = cleaned.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1");
    cleaned = cleaned.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, "$1");

    // Remove markdown list markers but keep content
    // Handle numbered lists: "1. " or "2.  " (with any number of spaces) -> ""
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");
    // Handle bullet points: "- " or "* " or "+ " -> ""
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "");

    // Remove horizontal rules
    cleaned = cleaned.replace(/^[-*_]{3,}$/gm, "");

    // Remove markdown blockquotes: > text -> text
    cleaned = cleaned.replace(/^>\s+(.+)$/gm, "$1");

    // Remove markdown tables (basic) - replace pipe with space
    cleaned = cleaned.replace(/\|/g, " ");

    // Clean up extra whitespace (but preserve intentional line breaks)
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines
    cleaned = cleaned.replace(/[ \t]{2,}/g, " "); // Multiple spaces/tabs to single space (but preserve single spaces)
    cleaned = cleaned.trim();

    return cleaned;
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
      // Handle both numeric ("2", "8", "16") and text ("TWO", "EIGHT", "SIXTEEN") formats
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
        console.warn(
          `[Ollama] Invalid marks value "${rawMarks}" (normalized: "${normalizedMarks}"), defaulting based on difficulty ${normalizedDifficulty}`
        );
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
   * Filter out invalid questions (empty text, placeholders, etc.)
   */
  private filterValidQuestions(
    questions: GeneratedQuestion[]
  ): GeneratedQuestion[] {
    return questions.filter((q) => {
      // Must have non-empty question text
      if (!q.question_text || q.question_text.trim().length < 10) {
        console.warn(
          `[Ollama] Filtering out question with empty/invalid question_text`
        );
        return false;
      }

      // Must have non-empty answer text
      if (!q.answer_text || q.answer_text.trim().length < 20) {
        console.warn(
          `[Ollama] Filtering out question with empty/invalid answer_text`
        );
        return false;
      }

      // Check answer length based on marks/difficulty
      // More lenient requirements - focus on quality over strict word counts
      // Reduced minimums to prevent over-filtering while still ensuring basic quality
      const answerWords = q.answer_text
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      // Very lenient minimums: 2 marks = 15 words, 8 marks = 80 words, 16 marks = 200 words
      // This prevents filtering out valid questions while still removing placeholder/empty answers
      const minWords = q.marks === "TWO" ? 15 : q.marks === "EIGHT" ? 80 : 200;

      if (answerWords < minWords) {
        console.warn(
          `[Ollama] Filtering out question with answer too short: ${answerWords} words (minimum: ${minWords} for ${q.marks} marks)`
        );
        return false;
      }

      // Check for placeholder patterns
      const placeholderPatterns = [
        /\[Mock\s+(EASY|MEDIUM|HARD)\]/i,
        /\[Answer here\]/i,
        /\[Insert.*\]/i,
        /placeholder/i,
      ];

      for (const pattern of placeholderPatterns) {
        if (pattern.test(q.question_text) || pattern.test(q.answer_text)) {
          console.warn(`[Ollama] Filtering out question with placeholder text`);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Count questions by difficulty level
   */
  private countQuestionsByDifficulty(questions: GeneratedQuestion[]): {
    easy: number;
    medium: number;
    hard: number;
  } {
    const counts = { easy: 0, medium: 0, hard: 0 };
    questions.forEach((q) => {
      if (q.difficulty_level === "EASY") counts.easy++;
      else if (q.difficulty_level === "MEDIUM") counts.medium++;
      else if (q.difficulty_level === "HARD") counts.hard++;
    });
    return counts;
  }

  /**
   * Count questions by type
   */
  private countQuestionsByType(questions: GeneratedQuestion[]): {
    direct: number;
    scenarioBased: number;
    problemBased: number;
    indirect: number;
  } {
    const counts = {
      direct: 0,
      scenarioBased: 0,
      problemBased: 0,
      indirect: 0,
    };
    questions.forEach((q) => {
      const type = q.question_type?.toUpperCase();
      if (type === "DIRECT") counts.direct++;
      else if (type === "SCENARIO_BASED") counts.scenarioBased++;
      else if (type === "PROBLEM_BASED") counts.problemBased++;
      else if (type === "INDIRECT") counts.indirect++;
    });
    return counts;
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
        // Updated to match new minimums: 15/80/200
        const minWords =
          question.marks === "TWO"
            ? 15
            : question.marks === "EIGHT"
            ? 80
            : question.marks === "SIXTEEN"
            ? 200
            : 15;

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
