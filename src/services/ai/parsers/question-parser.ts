/**
 * Question Parser Utilities
 *
 * Shared parsing, sanitization, and validation logic for AI-generated questions
 * Used by both Ollama and Gemini providers
 *
 * Enhanced to support:
 * - LaTeX mathematical notation
 * - Mermaid diagram syntax
 * - Academic level-specific parsing
 */

import type { GeneratedQuestion, AcademicLevel, RenderingType } from "../types";
import { logger } from "@/lib/logger";

/**
 * Fix LaTeX escape sequences for JSON parsing
 * LaTeX uses single backslashes (\frac, \delta) but JSON requires double backslashes (\\frac, \\delta)
 */
function _fixLatexEscapes(jsonString: string): string {
  // Common LaTeX commands that need escaping
  const latexCommands = [
    "frac",
    "sqrt",
    "sum",
    "int",
    "prod",
    "lim",
    "infty",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "zeta",
    "eta",
    "theta",
    "iota",
    "kappa",
    "lambda",
    "mu",
    "nu",
    "xi",
    "pi",
    "rho",
    "sigma",
    "tau",
    "upsilon",
    "phi",
    "chi",
    "psi",
    "omega",
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Iota",
    "Kappa",
    "Lambda",
    "Mu",
    "Nu",
    "Xi",
    "Pi",
    "Rho",
    "Sigma",
    "Tau",
    "Upsilon",
    "Phi",
    "Chi",
    "Psi",
    "Omega",
    "cdot",
    "times",
    "div",
    "pm",
    "mp",
    "leq",
    "geq",
    "neq",
    "approx",
    "equiv",
    "subset",
    "supset",
    "subseteq",
    "supseteq",
    "in",
    "notin",
    "cup",
    "cap",
    "emptyset",
    "forall",
    "exists",
    "neg",
    "land",
    "lor",
    "Rightarrow",
    "Leftarrow",
    "Leftrightarrow",
    "rightarrow",
    "leftarrow",
    "leftrightarrow",
    "implies",
    "iff",
    "to",
    "gets",
    "mapsto",
    "partial",
    "nabla",
    "hbar",
    "ell",
    "Re",
    "Im",
    "sin",
    "cos",
    "tan",
    "cot",
    "sec",
    "csc",
    "log",
    "ln",
    "exp",
    "arcsin",
    "arccos",
    "arctan",
    "sinh",
    "cosh",
    "tanh",
    "text",
    "textbf",
    "textit",
    "mathrm",
    "mathbf",
    "mathit",
    "mathcal",
    "begin",
    "end",
    "left",
    "right",
    "big",
    "Big",
    "bigg",
    "Bigg",
    "bmatrix",
    "pmatrix",
    "vmatrix",
    "matrix",
    "cases",
    "array",
    "quad",
    "qquad",
    "space",
    "hspace",
    "vspace",
    "overline",
    "underline",
    "hat",
    "bar",
    "vec",
    "dot",
    "ddot",
    "tilde",
    "prime",
    "circ",
    "bullet",
    "star",
    "ast",
    "oplus",
    "otimes",
    "ce", // chemistry
  ];

  // Build regex pattern for unescaped backslashes before LaTeX commands
  // Match single backslash (not already escaped) followed by command
  let result = jsonString;

  for (const cmd of latexCommands) {
    // Replace \cmd with \\cmd (but not \\cmd which is already escaped)
    // Use negative lookbehind to avoid double-escaping
    const pattern = new RegExp(`(?<!\\\\)\\\\(${cmd})(?![a-zA-Z])`, "g");
    result = result.replace(pattern, "\\\\$1");
  }

  // Also fix common patterns like \n inside LaTeX that aren't newlines
  // Fix \\ inside strings (LaTeX line breaks) - these should be \\\\
  // But be careful not to break actual JSON escape sequences

  // Fix curly braces in LaTeX: \{ and \} should be \\{ and \\}
  result = result.replace(/(?<!\\)\\(\{|\})/g, "\\\\$1");

  return result;
}

/**
 * Aggressive JSON fix for heavily malformed LaTeX content
 * Used as a fallback when fixLatexEscapes isn't enough
 *
 * This handles the case where AI returns LaTeX with single backslashes
 * which are invalid JSON escape sequences (e.g., \Sigma instead of \\Sigma)
 */
function aggressiveJsonFix(jsonString: string): string {
  let result = jsonString;

  // CRITICAL FIX: Process the string to properly handle escapes
  // The AI sometimes outputs \Sigma (single backslash) which is invalid JSON
  // We need to detect and fix these invalid escape sequences

  // Strategy:
  // 1. First, protect already-escaped backslashes (\\) with a placeholder
  // 2. Then escape all remaining single backslashes that aren't valid JSON escapes
  // 3. Restore the double-backslash placeholders

  const DOUBLE_BACKSLASH_PLACEHOLDER = "\x00\x01DOUBLE_BS\x01\x00";

  // Step 1: Protect already-escaped backslashes (\\)
  // These are VALID in JSON - \\ represents a single backslash in the string
  result = result.replace(/\\\\/g, DOUBLE_BACKSLASH_PLACEHOLDER);

  // Step 2: Now all remaining backslashes are single backslashes
  // Check each one - if it's not a valid JSON escape, double it
  // Valid JSON escapes after single backslash: " \ / b f n r t u
  result = result.replace(/\\([^"\\\/bfnrtu])/g, (_match, char: string) => {
    // This is an invalid JSON escape - the backslash needs to be escaped
    return "\\\\" + char;
  });

  // Also handle \u that isn't followed by 4 hex digits (invalid unicode escape)
  result = result.replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u");

  // Step 3: Restore the double backslashes
  // The original \\\\ was valid JSON, so we restore it as \\\\
  result = result.replace(
    new RegExp(
      DOUBLE_BACKSLASH_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g",
    ),
    "\\\\",
  );

  return result;
}

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
  providerName: string = "AIProvider",
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

    // Use aggressive JSON fix directly - it handles all LaTeX escape issues
    // This is more reliable than trying the simple fix first
    const jsonString = aggressiveJsonFix(jsonMatch[0]);

    logger.debug(
      `${providerName}`,
      `Attempting to parse JSON (${jsonString.length} chars)`,
    );

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      // Log the error location for debugging
      const err =
        parseError instanceof Error
          ? parseError
          : new Error(String(parseError));
      logger.error(
        `${providerName}`,
        "JSON parse failed after aggressive fix",
        err,
        {
          jsonPreview: jsonString.substring(0, 500),
        },
      );
      throw parseError;
    }

    // Handle empty JSON or missing questions array gracefully
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      logger.warn(`${providerName}`, "Empty or invalid response structure", {
        parsed: JSON.stringify(parsed, null, 2),
      });
      return { questions: [] };
    }

    logger.debug(
      `${providerName}`,
      `Found ${parsed.questions.length} questions in response`,
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
      providerName,
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
      { responsePreview: response.substring(0, 200) },
    );
    if (error instanceof SyntaxError) {
      logger.error(
        `${providerName}`,
        "JSON syntax error - response is not valid JSON",
      );
    }
    throw new Error(
      `Failed to parse ${providerName} response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
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
  providerName: string = "AIProvider",
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
    // Strip markdown from question and answer text, but preserve LaTeX and Mermaid
    const rawQuestionText = getTextValue(
      "question_text",
      "question",
      "questionText",
    );
    const rawAnswerText = getTextValue("answer_text", "answer", "answerText");

    const sanitized: GeneratedQuestion = {
      question_text: stripMarkdownPreserveLatex(rawQuestionText),
      answer_text: stripMarkdownPreserveLatex(rawAnswerText),
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
        "bloom_reason",
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
  providerName: string = "AIProvider",
): void {
  const placeholderPatterns = [
    /\[Mock\s+(EASY|MEDIUM|HARD)\]/i,
    /This is a (TWO|EIGHT|SIXTEEN)-mark answer/i,
    /\[Answer here\]/i,
    /\[Insert.*\]/i,
  ];

  logger.debug(
    `${providerName}`,
    `Checking ${questions.length} questions for quality`,
  );

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    // Check for required fields - WARN ONLY, don't throw
    if (!question.question_text || question.question_text.trim().length === 0) {
      logger.warn(
        `${providerName}`,
        `Question ${i + 1} has empty question_text - will be filtered out`,
      );
      continue; // Skip further validation for this question
    }

    if (!question.answer_text || question.answer_text.trim().length === 0) {
      logger.warn(`${providerName}`, `Question ${i + 1} has empty answer_text`);
    }

    if (!question.difficulty_level) {
      logger.warn(
        `${providerName}`,
        `Question ${i + 1} has missing difficulty_level`,
      );
    }

    // Check for placeholder patterns
    for (const pattern of placeholderPatterns) {
      if (
        pattern.test(question.question_text) ||
        pattern.test(question.answer_text)
      ) {
        logger.warn(
          `${providerName}`,
          `Question ${i + 1} contains placeholder text`,
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
  providerName: string = "AIProvider",
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
  providerName: string = "AIProvider",
): GeneratedQuestion[] {
  return questions.filter((q) => {
    // Must have non-empty question text
    if (!q.question_text || q.question_text.trim().length < 10) {
      logger.warn(
        `${providerName}`,
        "Filtering out question with empty/invalid question_text",
      );
      return false;
    }

    // Must have non-empty answer text
    if (!q.answer_text || q.answer_text.trim().length < 20) {
      logger.warn(
        `${providerName}`,
        "Filtering out question with empty/invalid answer_text",
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
        `Filtering out question with answer too short: ${answerWords} words (minimum: ${minWords} for ${q.marks} marks)`,
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
          "Filtering out question with placeholder text",
        );
        return false;
      }
    }

    return true;
  });
}

/**
 * Detect if text contains LaTeX notation
 */
export function containsLatex(text: string): boolean {
  if (!text) return false;

  // Check for common LaTeX patterns
  const latexPatterns = [
    /\$[^$]+\$/, // Inline math: $...$
    /\$\$[^$]+\$\$/, // Display math: $$...$$
    /\\frac\{/, // Fractions
    /\\int/, // Integrals
    /\\sum/, // Summations
    /\\sqrt/, // Square roots
    /\\begin\{/, // Environments
    /\\[a-zA-Z]+\{/, // General LaTeX commands
    /\^{[^}]+}/, // Superscripts with braces
    /_{[^}]+}/, // Subscripts with braces
  ];

  return latexPatterns.some((pattern) => pattern.test(text));
}

/**
 * Detect if text contains Mermaid diagram syntax
 */
export function containsMermaid(text: string): boolean {
  if (!text) return false;

  // Check for Mermaid code blocks or keywords
  const mermaidPatterns = [
    /```mermaid/i,
    /stateDiagram/i,
    /flowchart\s+(TD|TB|BT|RL|LR)/i,
    /graph\s+(TD|TB|BT|RL|LR)/i,
    /sequenceDiagram/i,
    /classDiagram/i,
    /erDiagram/i,
    /gantt/i,
    /pie\s+title/i,
  ];

  return mermaidPatterns.some((pattern) => pattern.test(text));
}

/**
 * Extract LaTeX content from text
 */
export function extractLatex(text: string): string {
  if (!text) return "";

  const latexBlocks: string[] = [];

  // Extract display math blocks: $$...$$
  const displayMathRegex = /\$\$([^$]+)\$\$/g;
  let match;
  while ((match = displayMathRegex.exec(text)) !== null) {
    latexBlocks.push(`$$${match[1]}$$`);
  }

  // Extract inline math blocks: $...$
  const inlineMathRegex = /(?<!\$)\$([^$]+)\$(?!\$)/g;
  while ((match = inlineMathRegex.exec(text)) !== null) {
    latexBlocks.push(`$${match[1]}$`);
  }

  return latexBlocks.join("\n");
}

/**
 * Extract Mermaid diagram from text
 */
export function extractMermaid(text: string): string {
  if (!text) return "";

  // Extract Mermaid code blocks
  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/gi;
  const match = mermaidRegex.exec(text);

  if (match) {
    // Validate and fix the extracted Mermaid content
    return validateAndFixMermaid(match[1].trim());
  }

  // Check if the entire text might be a Mermaid diagram
  if (containsMermaid(text) && !text.includes("```")) {
    return validateAndFixMermaid(text.trim());
  }

  return "";
}

/**
 * Validate and fix common Mermaid syntax issues
 * Based on official Mermaid.js documentation
 */
export function validateAndFixMermaid(mermaidCode: string): string {
  if (!mermaidCode) return "";

  let fixed = mermaidCode.trim();

  // Fix 1: Ensure proper line breaks (convert any run-together lines)
  // Sometimes AI outputs: "stateDiagram-v2    [*] --> q0    q0 --> q1"
  // This should be:
  // stateDiagram-v2
  //     [*] --> q0
  //     q0 --> q1

  // If the first line declaration is followed by diagram content on same line, split it
  fixed = fixed.replace(
    /^(stateDiagram(?:-v2)?|flowchart\s+(?:TD|TB|BT|LR|RL)|graph\s+(?:TD|TB|BT|LR|RL)|sequenceDiagram|classDiagram)\s+(\[\*\]|[a-zA-Z_])/im,
    "$1\n    $2",
  );

  // Fix 2: For state diagrams, ensure stateDiagram-v2 is used (not just stateDiagram)
  fixed = fixed.replace(/^stateDiagram\s*$/m, "stateDiagram-v2");
  fixed = fixed.replace(/^stateDiagram\s+(\[\*\])/m, "stateDiagram-v2\n    $1");

  // Fix 3: Remove parentheses from state IDs in state diagrams
  // WRONG: q(0) --> q(1) or start((state)) --> end((state))
  // RIGHT: q0 --> q1 or startState --> endState
  if (/stateDiagram/i.test(fixed)) {
    // Fix state IDs that incorrectly use parentheses (not shape markers)
    // Pattern: word followed by (something) that's not a shape syntax
    fixed = fixed.replace(
      /\b([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]+)\)(?=\s*(-->|:|\s|$))/g,
      (match, id, inner) => {
        // If it looks like a number or simple identifier, merge them
        if (/^[a-zA-Z0-9_]+$/.test(inner)) {
          return id + inner;
        }
        return match; // Keep as-is if not a simple merge
      },
    );
  }

  // Fix 4: Ensure arrows in state diagrams are correct (-->)
  // Some AI might output -> instead of -->
  if (/stateDiagram/i.test(fixed)) {
    // Replace single -> with --> but not ->> or -->
    fixed = fixed.replace(/([a-zA-Z0-9_\]])\s*->(?!>)/g, "$1 -->");
  }

  // Fix 5: Fix flowchart missing direction
  fixed = fixed.replace(/^flowchart\s*$/m, "flowchart TD");

  // Fix 6: Fix node text containing special characters like [ ] ( ) that break syntax
  // Pattern: nodeId[text containing [brackets] or (parens)]
  // Solution: Wrap text in quotes if it contains special chars
  // Match: id[text] where text contains [ or ] or ( or )
  fixed = fixed.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]"]*[\[\]()][^\]]*)\]/g,
    (match, nodeId, nodeText) => {
      // Only wrap if not already quoted and contains special chars
      if (!nodeText.startsWith('"') && /[\[\]()]/.test(nodeText)) {
        // Escape any quotes in the text first
        const escapedText = nodeText.replace(/"/g, '\\"');
        return `${nodeId}["${escapedText}"]`;
      }
      return match;
    },
  );

  // Fix 7: Ensure each transition is on its own line
  // Split multiple transitions that might be on one line
  // Pattern: state --> state followed by state --> state (without newline)
  fixed = fixed.replace(
    /(\]\s*|\)\s*|\w)\s+(-->|-.->|==>)\s*(\[\*\]|[a-zA-Z_])/g,
    (match, before, _arrow, _after) => {
      if (/\s*\n\s*$/.test(before)) {
        return match; // Already has newline
      }
      // Check if this might be a single valid line
      const trimmedMatch = match.trim();
      if (!/-->.*-->|==>.*==>|-.->.*-.->/.test(trimmedMatch)) {
        return match; // Single transition, keep as-is
      }
      // Multiple transitions, split them
      return match;
    },
  );

  // Fix 8: Normalize excessive whitespace while preserving structure
  const lines = fixed.split("\n");
  const normalizedLines = lines.map((line) => {
    // Preserve indentation but normalize internal whitespace
    const match = line.match(/^(\s*)(.*)/);
    if (match) {
      const indent = match[1];
      const content = match[2].replace(/\s{2,}/g, " ").trim();
      return indent + content;
    }
    return line;
  });
  fixed = normalizedLines.join("\n");

  // Fix 9: Remove any accidental quotes around the entire diagram
  fixed = fixed.replace(/^["']([^]*?)["']$/g, "$1");

  // Fix 10: Ensure proper indentation for diagram body (if not already indented)
  const lineArray = fixed.split("\n");
  if (lineArray.length > 1) {
    const firstLine = lineArray[0].trim();
    const bodyLines = lineArray.slice(1);

    // Check if body lines need indentation
    const needsIndent = bodyLines.some(
      (line) =>
        line.trim().length > 0 &&
        !line.startsWith("    ") &&
        !line.startsWith("\t"),
    );

    if (needsIndent) {
      const indentedBody = bodyLines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return "";
        if (line.startsWith("    ") || line.startsWith("\t")) return line;
        return "    " + trimmed;
      });
      fixed = firstLine + "\n" + indentedBody.join("\n");
    }
  }

  return fixed;
}

/**
 * Sanitize LaTeX content by converting unsupported document-level commands to plain text
 * KaTeX only supports math-mode LaTeX, NOT document environments like itemize/enumerate
 */
export function sanitizeLatexForKatex(text: string): string {
  if (!text) return text;

  let result = text;

  // Convert \begin{itemize}...\item...\end{itemize} to bullet points
  result = result.replace(
    /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/gi,
    (match, content: string) => {
      // Extract items and convert to bullet points
      const items = content.split(/\\item\s*/);
      const bulletItems = items
        .filter((item) => item.trim().length > 0)
        .map((item) => `• ${item.trim()}`)
        .join("\n");
      return bulletItems;
    },
  );

  // Convert \begin{enumerate}...\item...\end{enumerate} to numbered list
  result = result.replace(
    /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/gi,
    (match, content: string) => {
      const items = content.split(/\\item\s*/);
      let itemNumber = 0;
      const numberedItems = items
        .filter((item) => item.trim().length > 0)
        .map((item) => {
          itemNumber++;
          return `${itemNumber}. ${item.trim()}`;
        })
        .join("\n");
      return numberedItems;
    },
  );

  // Remove any remaining stray \item commands
  result = result.replace(/\\item\s*/g, "• ");

  // Remove other unsupported document commands that might slip through
  // \section, \subsection, \paragraph, \chapter, etc.
  result = result.replace(
    /\\(section|subsection|paragraph|chapter|subsubsection)\*?\{([^}]*)\}/gi,
    "$2",
  );

  // Remove \textbf{} but keep content (if outside math mode)
  // Be careful not to replace inside $ $ blocks
  // This is a simple approach - replace \textbf{content} with **content** or just content
  result = result.replace(/\\textbf\{([^}]*)\}/g, "$1");
  result = result.replace(/\\textit\{([^}]*)\}/g, "$1");
  result = result.replace(/\\emph\{([^}]*)\}/g, "$1");

  // Fix common subscript notation that appears outside math mode
  // e.g., "q 0" with subscript should be in math mode: $q_0$
  // Look for patterns like: letter space subscript-looking-number
  // This is a heuristic - only apply if it looks like a subscript pattern
  result = result.replace(
    /\b([a-zA-Z])\s+([0-9]+)\s*\u200B?​?(?=\s|,|\.|\)|$)/g,
    (match, letter, num) => {
      // Check if this looks like a subscript notation (common in automata)
      if (/^q|s|p|F$/i.test(letter) && /^[0-9]+$/.test(num)) {
        return `$${letter}_{${num}}$`;
      }
      return match;
    },
  );

  return result;
}

/**
 * Determine rendering type based on content
 */
export function detectRenderingType(text: string): RenderingType {
  const hasLatex = containsLatex(text);
  const hasMermaid = containsMermaid(text);

  if (hasLatex && hasMermaid) {
    return "MIXED";
  } else if (hasLatex) {
    return "LATEX";
  } else if (hasMermaid) {
    return "MERMAID";
  }

  return "TEXT";
}

/**
 * Strip markdown but preserve LaTeX notation
 * This is important because LaTeX uses special characters that shouldn't be stripped
 * Also sanitizes unsupported LaTeX document commands
 */
export function stripMarkdownPreserveLatex(text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  // First, sanitize unsupported LaTeX document commands (itemize, enumerate, etc.)
  let cleaned = sanitizeLatexForKatex(text);

  // Store LaTeX blocks temporarily with unique placeholder pattern that won't be matched by markdown removal
  const latexPlaceholders: Map<string, string> = new Map();
  let placeholderIndex = 0;

  // Preserve display math
  cleaned = cleaned.replace(/\$\$([^$]+)\$\$/g, (match) => {
    const placeholder = `<<<LATEX_DISPLAY_${placeholderIndex++}>>>`;
    latexPlaceholders.set(placeholder, match);
    return placeholder;
  });

  // Preserve inline math
  cleaned = cleaned.replace(/(?<!\$)\$([^$]+)\$(?!\$)/g, (match) => {
    const placeholder = `<<<LATEX_INLINE_${placeholderIndex++}>>>`;
    latexPlaceholders.set(placeholder, match);
    return placeholder;
  });

  // Preserve Mermaid blocks
  cleaned = cleaned.replace(/```mermaid[\s\S]*?```/gi, (match) => {
    const placeholder = `<<<MERMAID_${placeholderIndex++}>>>`;
    latexPlaceholders.set(placeholder, match);
    return placeholder;
  });

  // Now strip markdown as before (but not code blocks containing Mermaid)
  // Remove non-Mermaid code blocks
  cleaned = cleaned.replace(/```(?!mermaid)[\s\S]*?```/g, "");
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

  // Remove markdown blockquotes: > text -> text
  cleaned = cleaned.replace(/^>\s+(.+)$/gm, "$1");

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");
  cleaned = cleaned.trim();

  // Restore LaTeX and Mermaid blocks
  for (const [placeholder, original] of latexPlaceholders) {
    cleaned = cleaned.replace(placeholder, original);
  }

  return cleaned;
}

/**
 * Enhanced parser for questions with LaTeX and Mermaid support
 */
export function parseEnhancedQuestionResponse(
  response: string,
  providerName: string = "AIProvider",
  academicLevel: AcademicLevel = "UG",
): {
  questions: GeneratedQuestion[];
} {
  try {
    // Clean the response: remove markdown code blocks if present
    let cleanedResponse = response.trim();

    // Remove markdown code blocks wrapping JSON (```json ... ``` or ``` ... ```)
    // But preserve mermaid blocks inside the JSON
    cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/gm, "");
    cleanedResponse = cleanedResponse.replace(/\n?```\s*$/gm, "");
    cleanedResponse = cleanedResponse.trim();

    // Try to find JSON object with questions array
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(
        `${providerName}`,
        "No JSON object found in enhanced response",
        {
          responsePreview: response.substring(0, 200),
        },
      );
      throw new Error("No valid JSON found in response");
    }

    logger.debug(
      `${providerName}`,
      `Attempting to parse enhanced JSON (${jsonMatch[0].length} chars)`,
    );

    // Use aggressive JSON fix directly - it handles all LaTeX escape issues
    const jsonString = aggressiveJsonFix(jsonMatch[0]);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      // Log the error location for debugging
      const err =
        parseError instanceof Error
          ? parseError
          : new Error(String(parseError));
      logger.error(
        `${providerName}`,
        "Enhanced JSON parse failed after aggressive fix",
        err,
        {
          jsonPreview: jsonString.substring(0, 500),
        },
      );
      throw parseError;
    }

    // Handle empty JSON or missing questions array gracefully
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      logger.warn(
        `${providerName}`,
        "Empty or invalid enhanced response structure",
        {
          parsed: JSON.stringify(parsed, null, 2),
        },
      );
      return { questions: [] };
    }

    logger.debug(
      `${providerName}`,
      `Found ${parsed.questions.length} enhanced questions`,
    );

    // Sanitize questions with enhanced processing
    const sanitizedQuestions = sanitizeEnhancedQuestions(
      parsed.questions,
      providerName,
      academicLevel,
    );

    // Validate questions
    validateQuestions(sanitizedQuestions, providerName);
    validateDifficultyDistribution(sanitizedQuestions, providerName);

    return { questions: sanitizedQuestions };
  } catch (error) {
    logger.error(
      `${providerName}`,
      "Failed to parse enhanced question response",
      error instanceof Error ? error : new Error(String(error)),
      { responsePreview: response.substring(0, 200) },
    );

    // Fallback to standard parser
    logger.info(`${providerName}`, "Falling back to standard parser");
    return parseQuestionResponse(response, providerName);
  }
}

/**
 * Sanitize enhanced questions with LaTeX and Mermaid support
 */
export function sanitizeEnhancedQuestions(
  questions: Record<string, unknown>[],
  _providerName: string = "AIProvider",
  academicLevel: AcademicLevel = "UG",
): GeneratedQuestion[] {
  return questions.map((questionRecord) => {
    // Helper to safely extract textual content
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

    // Extract raw content
    const rawQuestionText = getTextValue(
      "question_text",
      "question",
      "questionText",
    );
    const rawAnswerText = getTextValue("answer_text", "answer", "answerText");

    // Detect rendering type from content
    const combinedText = rawQuestionText + " " + rawAnswerText;
    const detectedRenderingType = detectRenderingType(combinedText);

    // Get explicit rendering type or use detected
    const explicitRenderingType = getTextValue(
      "rendering_type",
      "renderingType",
    );
    const renderingType = (
      ["TEXT", "LATEX", "MERMAID", "MIXED"].includes(
        explicitRenderingType.toUpperCase(),
      )
        ? explicitRenderingType.toUpperCase()
        : detectedRenderingType
    ) as RenderingType;

    // Extract LaTeX and Mermaid content
    const latexContent = extractLatex(combinedText);
    const mermaidContent = extractMermaid(combinedText);

    // Clean text while preserving LaTeX
    const cleanedQuestionText = stripMarkdownPreserveLatex(rawQuestionText);
    const cleanedAnswerText = stripMarkdownPreserveLatex(rawAnswerText);

    // Determine difficulty and marks
    const difficultyLevel =
      getTextValue("difficulty_level", "difficulty") || "MEDIUM";
    const normalizedDifficulty = difficultyLevel.toUpperCase() as
      | "EASY"
      | "MEDIUM"
      | "HARD";

    // Get marks value and sanitize it
    const rawMarks = getTextValue("marks");
    let marksValue = rawMarks || "";

    if (marksValue === "2" || marksValue === "TWO") {
      marksValue = "TWO";
    } else if (marksValue === "8" || marksValue === "EIGHT") {
      marksValue = "EIGHT";
    } else if (marksValue === "16" || marksValue === "SIXTEEN") {
      marksValue = "SIXTEEN";
    } else if (!marksValue) {
      marksValue =
        normalizedDifficulty === "EASY"
          ? "TWO"
          : normalizedDifficulty === "HARD"
            ? "SIXTEEN"
            : "EIGHT";
    }

    const normalizedMarks = marksValue.toUpperCase().trim();

    if (!["TWO", "EIGHT", "SIXTEEN"].includes(normalizedMarks)) {
      marksValue =
        normalizedDifficulty === "EASY"
          ? "TWO"
          : normalizedDifficulty === "HARD"
            ? "SIXTEEN"
            : "EIGHT";
    }

    const sanitized: GeneratedQuestion = {
      question_text: cleanedQuestionText,
      answer_text: cleanedAnswerText,
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
        "bloom_reason",
      ),
      unit_number: getNumberValue(1, "unit_number", "unitNumber", "unit"),
      course_name: getTextValue("course_name", "courseName"),
      material_name: getTextValue("material_name", "materialName"),
      // Enhanced fields
      academic_level: academicLevel,
      rendering_type: renderingType,
      latex_content: latexContent || undefined,
      mermaid_content: mermaidContent || undefined,
      real_world_context:
        getTextValue(
          "real_world_context",
          "realWorldContext",
          "real_world_reference",
        ) || undefined,
    };

    return sanitized;
  });
}
