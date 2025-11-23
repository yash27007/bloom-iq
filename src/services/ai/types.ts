/**
 * AI Service Types and Interfaces
 *
 * Defines the contract for AI providers to enable easy swapping between
 * different LLM services (Ollama, OpenAI, Anthropic, etc.)
 */

/**
 * Question generation parameters
 */
export interface QuestionGenerationParams {
  materialContent: string;
  courseName: string;
  materialName: string;
  unit: number;
  questionCounts: {
    easy: number;
    medium: number;
    hard: number;
  };
  bloomLevels: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  };
  questionTypes: {
    direct: number;
    indirect: number;
    scenarioBased: number;
    problemBased: number;
  };
}

/**
 * Generated question structure
 */
export interface GeneratedQuestion {
  question_text: string;
  answer_text: string;
  difficulty_level: "EASY" | "MEDIUM" | "HARD";
  bloom_level:
    | "REMEMBER"
    | "UNDERSTAND"
    | "APPLY"
    | "ANALYZE"
    | "EVALUATE"
    | "CREATE";
  question_type: "DIRECT" | "INDIRECT" | "SCENARIO_BASED" | "PROBLEM_BASED";
  marks: "TWO" | "EIGHT" | "SIXTEEN";
  bloom_justification?: string; // Optional explanation of why this Bloom's level was chosen
  unit_number: number;
  course_name: string;
  material_name: string;
}

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * AI Provider Interface (Adapter Pattern)
 *
 * All AI providers must implement this interface to ensure
 * compatibility with the question generation system.
 */
export interface AIProvider {
  /**
   * Generate questions from course material
   */
  generateQuestions(
    params: QuestionGenerationParams
  ): Promise<GeneratedQuestion[]>;

  /**
   * Test connection to the AI service
   */
  testConnection(): Promise<boolean>;

  /**
   * List available models
   */
  listAvailableModels(): Promise<string[]>;

  /**
   * Switch to a different model
   */
  switchModel(model: string): void;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
