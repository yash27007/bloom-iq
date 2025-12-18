/**
 * Question Parser Utilities
 *
 * Shared parsing, sanitization, and validation logic for AI-generated questions
 * Used by both Ollama and Gemini providers
 */

import type { GeneratedQuestion } from "../types";
import { logger } from "@/lib/logger";

/**
 * Parse and extract questions from AI API response (handles markdown format)
 *
 * @param response - Raw text response from AI API (may contain markdown)
 * @param providerName - Name of the provider (for logging)
 * @returns Parsed questions array
 * @throws Error if JSON parsing fails or response structure is invalid
 */
export function parseQuestionResponse(
  response: string,
  providerName: string = "AIProvider"
): {
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
      logger.warn(`${providerName}`, "No JSON object found in response", {
        responsePreview: response.substring(0, 200),
      });
      throw new Error("No valid JSON found in response");
    }

    logger.debug(
      `${providerName}`,
      `Attempting to parse JSON (${jsonMatch[0].length} chars)`
    );
    const parsed = JSON.parse(jsonMatch[0]);

    // Handle empty JSON or missing questions array gracefully
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      logger.warn(`${providerName}`, "Empty or invalid response structure", {
        parsed: JSON.stringify(parsed, null, 2),
      });
      return { questions: [] };
    }

    logger.debug(
      `${providerName}`,
      `Found ${parsed.questions.length} questions in response`
    );

    // Log first question structure for debugging
    if (parsed.questions.length > 0) {
      logger.debug(`${providerName}`, "First question structure", {
        question: JSON.stringify(parsed.questions[0], null, 2),
      });
    }

    // Sanitize questions - fill in missing fields with reasonable defaults
    const sanitizedQuestions = sanitizeQuestions(
      parsed.questions,
      providerName
    );

    // Validate questions
    validateQuestions(sanitizedQuestions, providerName);
    validateDifficultyDistribution(sanitizedQuestions, providerName);

    return { questions: sanitizedQuestions };
  } catch (error) {
    logger.error(
      `${providerName}`,
      "Failed to parse question response",
      error instanceof Error ? error : new Error(String(error)),
      { responsePreview: response.substring(0, 200) }
    );
    if (error instanceof SyntaxError) {
      logger.error(
        `${providerName}`,
        "JSON syntax error - response is not valid JSON"
      );
    }
    throw new Error(
      `Failed to parse ${providerName} response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Strip markdown formatting from text while preserving content
 *
 * @param text - Text that may contain markdown formatting
 * @returns Cleaned text without markdown
 */
export function stripMarkdown(text: string): string {
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
 *
 * @param questions - Raw question records from AI response
 * @param providerName - Name of the provider (for logging)
 * @returns Array of sanitized GeneratedQuestion objects
 */
export function sanitizeQuestions(
  questions: Record<string, unknown>[],
  providerName: string = "AIProvider"
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
      logger.warn(`${providerName}`, "Invalid marks value, defaulting", {
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
      question_text: stripMarkdown(rawQuestionText),
      answer_text: stripMarkdown(rawAnswerText),
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
 * Non-blocking validation - only logs warnings without throwing errors
 *
 * @param questions - Array of generated questions to validate
 * @param providerName - Name of the provider (for logging)
 */
export function validateQuestions(
  questions: GeneratedQuestion[],
  providerName: string = "AIProvider"
): void {
  const placeholderPatterns = [
    /\[Mock\s+(EASY|MEDIUM|HARD)\]/i,
    /This is a (TWO|EIGHT|SIXTEEN)-mark answer/i,
    /\[Answer here\]/i,
    /\[Insert.*\]/i,
  ];

  logger.debug(
    `${providerName}`,
    `Checking ${questions.length} questions for quality`
  );

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    // Check for required fields - WARN ONLY, don't throw
    if (
      !question.question_text ||
      question.question_text.trim().length === 0
    ) {
      logger.warn(
        `${providerName}`,
        `Question ${i + 1} has empty question_text - will be filtered out`
      );
      continue; // Skip further validation for this question
    }

    if (!question.answer_text || question.answer_text.trim().length === 0) {
      logger.warn(
        `${providerName}`,
        `Question ${i + 1} has empty answer_text`
      );
    }

    if (!question.difficulty_level) {
      logger.warn(
        `${providerName}`,
        `Question ${i + 1} has missing difficulty_level`
      );
    }

    // Check for placeholder patterns
    for (const pattern of placeholderPatterns) {
      if (pattern.test(question.question_text) || pattern.test(question.answer_text)) {
        logger.warn(
          `${providerName}`,
          `Question ${i + 1} contains placeholder text`
        );
      }
    }
  }
}

/**
 * Validate difficulty distribution
 *
 * @param questions - Array of generated questions
 * @param providerName - Name of the provider (for logging)
 */
export function validateDifficultyDistribution(
  questions: GeneratedQuestion[],
  providerName: string = "AIProvider"
): void {
  const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  questions.forEach((q) => counts[q.difficulty_level]++);

  logger.debug(`${providerName}`, "Difficulty distribution", {
    EASY: counts.EASY,
    MEDIUM: counts.MEDIUM,
    HARD: counts.HARD,
  });

  if (counts.EASY === 0 && counts.HARD === 0) {
    logger.warn(`${providerName}`, "Only MEDIUM questions generated");
  }
}

/**
 * Filter out invalid questions (empty text, placeholders, etc.)
 *
 * @param questions - Array of questions to filter
 * @param providerName - Name of the provider (for logging)
 * @returns Array of valid questions
 */
export function filterValidQuestions(
  questions: GeneratedQuestion[],
  providerName: string = "AIProvider"
): GeneratedQuestion[] {
  return questions.filter((q) => {
    // Must have non-empty question text
    if (!q.question_text || q.question_text.trim().length < 10) {
      logger.warn(
        `${providerName}`,
        "Filtering out question with empty/invalid question_text"
      );
      return false;
    }

    // Must have non-empty answer text
    if (!q.answer_text || q.answer_text.trim().length < 20) {
      logger.warn(
        `${providerName}`,
        "Filtering out question with empty/invalid answer_text"
      );
      return false;
    }

    // Check answer length based on marks/difficulty
    // More lenient requirements - focus on quality over strict word counts
    // Reduced minimums to prevent over-filtering while still ensuring basic quality
    const answerWords = q.answer_text
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    // Very lenient minimums for key-point answers format:
    // Key points are concise, so accept much shorter answers
    // 2 marks = 10 words (3-4 key points), 8 marks = 25 words (5-6 key points), 16 marks = 50 words (6-8 key points)
    const minWords = q.marks === "TWO" ? 10 : q.marks === "EIGHT" ? 25 : 50;

    if (answerWords < minWords) {
      logger.warn(
        `${providerName}`,
        `Filtering out question with answer too short: ${answerWords} words (minimum: ${minWords} for ${q.marks} marks)`
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
        logger.warn(
          `${providerName}`,
          "Filtering out question with placeholder text"
        );
        return false;
      }
    }

    return true;
  });
}

