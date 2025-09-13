export interface LLMProvider {
  name: string;
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  extractSections(markdownContent: string, options?: LLMOptions): Promise<DocumentSection[]>;
  generateQuestions(
    sections: DocumentSection[],
    config: QuestionGenerationConfig
  ): Promise<GeneratedQuestion[]>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeout?: number; // Timeout in milliseconds
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  level: number;
  topics?: string[];
  concepts?: string[];
}

export interface QuestionGenerationConfig {
  bloomLevels: BloomLevel[];
  questionTypes: QuestionType[];
  difficultyLevels: DifficultyLevel[];
  questionsPerSection?: number;
  unit?: number;
  courseContext?: string;
}

export interface GeneratedQuestion {
  question: string;
  answer: string;
  bloomLevel: BloomLevel;
  difficultyLevel: DifficultyLevel;
  questionType: QuestionType;
  marks: number;
  unit?: number;
  topic?: string;
  sourceSection?: string;
}

export type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
export type QuestionType = 'STRAIGHTFORWARD' | 'PROBLEM_BASED' | 'SCENARIO_BASED';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * Factory for creating LLM providers
 */
export class LLMProviderFactory {
  private static providers: Map<string, LLMProvider> = new Map();

  static registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  static getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`LLM provider '${name}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  static getDefaultProvider(): LLMProvider {
    // Return Gemini as default, but fallback to first available
    if (this.providers.has('gemini')) {
      return this.providers.get('gemini')!;
    }
    
    const firstProvider = this.providers.values().next().value;
    if (!firstProvider) {
      throw new Error('No LLM providers registered');
    }
    
    return firstProvider;
  }
}
