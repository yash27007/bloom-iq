/**
 * AI Question Generation Service
 *
 * Facade for AI-powered question generation using pluggable AI providers
 * Supports Ollama and can be extended to support OpenAI, Anthropic, etc.
 */

import { aiService } from "@/services/ai";
import type {
  QuestionGenerationParams,
  GeneratedQuestion,
} from "@/services/ai";

// Re-export types for backward compatibility
export type { QuestionGenerationParams, GeneratedQuestion };

/**
 * Generate questions using the configured AI provider
 *
 * This is a facade that delegates to the appropriate AI provider
 * based on the configuration (currently Ollama)
 *
 * @param params - Question generation parameters (counts, Bloom's levels, material content)
 * @param model - Optional model name to use (defaults to configured model)
 * @returns Array of generated questions with answers
 * @throws Error if generation fails and not in development mode
 */
export async function generateQuestionsWithAI(
  params: QuestionGenerationParams,
  model?: string
): Promise<GeneratedQuestion[]> {
  try {
    // Switch model if provided
    if (model) {
      aiService.switchModel(model);
    }

    console.log(
      `Generating questions using ${aiService.getProviderName()} provider${model ? ` with model ${model}` : ""}`
    );

    const questions = await aiService.generateQuestions(params);

    console.log(`Successfully generated ${questions.length} questions`);

    // If we got some questions (even if not all requested), return them
    if (questions.length > 0) {
      return questions;
    }

    // Only fallback to mocks if we got zero questions
    console.warn("No questions generated, falling back to mock questions");
    if (process.env.NODE_ENV === "development") {
      return generateMockQuestions(params);
    }

    throw new Error(
      `Failed to generate questions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } catch (error) {
    console.error("AI question generation error:", error);

    // Fallback to mock questions in development only if we got zero questions
    if (process.env.NODE_ENV === "development") {
      console.warn("Falling back to mock questions due to error");
      return generateMockQuestions(params);
    }

    throw new Error(
      `Failed to generate questions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Fallback mock question generator for development/testing
 *
 * @param params - Question generation parameters
 * @returns Array of mock questions for testing
 */
function generateMockQuestions(
  params: QuestionGenerationParams
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const { courseName, materialName, unit, questionCounts } = params;

  // Generate EASY questions
  for (let i = 0; i < questionCounts.easy; i++) {
    questions.push({
      question_text: `[DEV MODE] Easy question ${i + 1} for ${materialName}`,
      answer_text: `[DEV MODE] This is a short answer for question ${
        i + 1
      }. In a production environment, this would contain actual content from the course material.`,
      difficulty_level: "EASY",
      bloom_level: "REMEMBER",
      question_type: "DIRECT",
      marks: "TWO",
      unit_number: unit,
      course_name: courseName,
      material_name: materialName,
    });
  }

  // Generate MEDIUM questions
  for (let i = 0; i < questionCounts.medium; i++) {
    questions.push({
      question_text: `[DEV MODE] Medium question ${i + 1} for ${materialName}`,
      answer_text:
        `[DEV MODE] This is a detailed explanation for question ${i + 1}. ` +
        `In a production environment, this would contain comprehensive content from the course material ` +
        `with examples, comparisons, and detailed explanations spanning approximately 400-600 words.`,
      difficulty_level: "MEDIUM",
      bloom_level: "UNDERSTAND",
      question_type: "INDIRECT",
      marks: "EIGHT",
      unit_number: unit,
      course_name: courseName,
      material_name: materialName,
    });
  }

  // Generate HARD questions
  for (let i = 0; i < questionCounts.hard; i++) {
    questions.push({
      question_text: `[DEV MODE] Hard question ${i + 1} for ${materialName}`,
      answer_text:
        `[DEV MODE] This is a comprehensive analysis for question ${i + 1}. ` +
        `In a production environment, this would contain in-depth content from the course material ` +
        `with introduction, multiple subsections, critical analysis, examples, comparisons, ` +
        `and conclusion spanning approximately 800-1200 words.`,
      difficulty_level: "HARD",
      bloom_level: "ANALYZE",
      question_type: "SCENARIO_BASED",
      marks: "SIXTEEN",
      unit_number: unit,
      course_name: courseName,
      material_name: materialName,
    });
  }

  return questions;
}

/**
 * Test connection to AI provider
 *
 * @returns True if connection successful, false otherwise
 */
export async function testAIConnection(): Promise<boolean> {
  return aiService.testConnection();
}

/**
 * List available AI models from the provider
 *
 * @returns Array of available model names
 */
export async function listAvailableModels(): Promise<string[]> {
  return aiService.listAvailableModels();
}

/**
 * Switch to a different AI model
 *
 * @param model - Model name to switch to
 */
export function switchAIModel(model: string): void {
  aiService.switchModel(model);
}
