/**
 * AI Service Types and Interfaces
 *
 * Defines the contract for AI providers to enable easy swapping between
 * different LLM services (Ollama, OpenAI, Anthropic, etc.)
 */

/**
 * Academic level for difficulty scaling
 * Determines the cognitive complexity and Bloom's Taxonomy focus
 */
export type AcademicLevel = "UG" | "PG" | "PHD";

/**
 * Rendering type for rich media support
 */
export type RenderingType = "TEXT" | "LATEX" | "MERMAID" | "MIXED";

/**
 * Academic level configuration mapping
 */
export const ACADEMIC_LEVEL_CONFIG: Record<
  AcademicLevel,
  {
    name: string;
    description: string;
    primaryBloomLevels: string[];
    secondaryBloomLevels: string[];
    complexityFocus: string;
    questionCharacteristics: string[];
  }
> = {
  UG: {
    name: "Undergraduate",
    description: "Focus on fundamental principles and standard applications",
    primaryBloomLevels: ["APPLY", "ANALYZE"],
    secondaryBloomLevels: ["UNDERSTAND", "REMEMBER"],
    complexityFocus:
      "Application of core concepts with straightforward problem-solving",
    questionCharacteristics: [
      "Test fundamental principles",
      "Standard applications and calculations",
      "Clear problem statements",
      "Single-concept focus",
      "Textbook-style questions",
    ],
  },
  PG: {
    name: "Postgraduate",
    description: "Focus on synthesis and advanced problem-solving",
    primaryBloomLevels: ["EVALUATE", "CREATE"],
    secondaryBloomLevels: ["ANALYZE", "APPLY"],
    complexityFocus:
      "Synthesis of multiple concepts with advanced critical thinking",
    questionCharacteristics: [
      "Multi-concept integration",
      "Case study analysis",
      "Research methodology questions",
      "Critical evaluation of approaches",
      "Design and optimization problems",
    ],
  },
  PHD: {
    name: "Doctoral",
    description: "Focus on original synthesis and research-level thinking",
    primaryBloomLevels: ["CREATE", "EVALUATE"],
    secondaryBloomLevels: ["ANALYZE"],
    complexityFocus:
      "Original synthesis, research gap identification, and critical theory",
    questionCharacteristics: [
      "Open-ended research questions",
      "Novel problem formulation",
      "Critical theory analysis",
      "Research gap identification",
      "Cross-disciplinary synthesis",
      "Professional-grade rigor",
    ],
  },
};

/**
 * Question generation parameters
 */
export interface QuestionGenerationParams {
  materialContent: string;
  courseName: string;
  materialName: string;
  unit: number;
  academicLevel?: AcademicLevel; // UG, PG, or PHD
  enableWebSearch?: boolean; // Enable real-world grounding via web search
  enableRichMedia?: boolean; // Enable LaTeX and Mermaid rendering
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
 * Real-world context from web search
 */
export interface RealWorldContext {
  caseStudies: string[];
  researchPapers: string[];
  industryExamples: string[];
  recentDevelopments: string[];
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
  // New fields for enhanced generation
  academic_level?: AcademicLevel;
  rendering_type?: RenderingType;
  latex_content?: string; // LaTeX formatted content if applicable
  mermaid_content?: string; // Mermaid diagram syntax if applicable
  real_world_context?: string; // Real-world grounding reference
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
    params: QuestionGenerationParams,
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
