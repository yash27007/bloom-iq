/**
 * Docker Model Runner Service
 *
 * Clean, plug-and-play LLM integration using Docker Model Runner API
 * Supports models from https://hub.docker.com/u/ai
 *
 * API Reference: https://docs.docker.com/ai/model-runner/api-reference/
 */

import { chunkContent } from "@/lib/content-chunker";

/**
 * Supported AI models from Docker Hub (https://hub.docker.com/u/ai)
 */
export const SUPPORTED_MODELS = {
  LLAMA_3_2_VISION_11B: "ai/llama3.2-vision:11b",
  LLAMA_3_2_3B: "ai/llama3.2:3b",
  LLAMA_3_2_1B: "ai/llama3.2:1b",
  PHI_3_5: "ai/phi3.5:latest",
  GEMMA_2_2B: "ai/gemma2:2b",
  GEMMA_2_9B: "ai/gemma2:9b",
  MISTRAL_7B: "ai/mistral:7b",
  MISTRAL_NEMO_12B: "ai/mistral:nemo",
} as const;

export type SupportedModel =
  (typeof SUPPORTED_MODELS)[keyof typeof SUPPORTED_MODELS];

/**
 * Model Runner configuration
 */
export interface ModelRunnerConfig {
  baseUrl: string;
  model: SupportedModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

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
  unit_number: number;
  course_name: string;
  material_name: string;
}

/**
 * System prompt for AI question generation
 */
const SYSTEM_PROMPT = `You are an expert educational assistant specializing in generating high-quality assessment questions from academic course materials.

Your task is to analyze course content and generate pedagogically sound questions that align with:
- Bloom's Taxonomy levels (Remember, Understand, Apply, Analyze, Evaluate, Create)
- Difficulty levels (Easy, Medium, Hard)
- Question types (Direct, Indirect, Scenario-based, Problem-based)

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no explanatory text before or after
2. Follow the exact JSON structure specified
3. Ensure questions are clear, unambiguous, and academically rigorous
4. Generate answers that are comprehensive and accurate
5. Distribute questions according to the specified counts

DIFFICULTY GUIDELINES:
- Easy: Recall-based, straightforward questions (Bloom's Remember/Understand)
- Medium: Application and analysis questions requiring comprehension
- Hard: Evaluation and creation questions requiring critical thinking

BLOOM'S TAXONOMY EXAMPLES:
- Remember: Define, list, identify, recall facts
- Understand: Explain, summarize, interpret concepts
- Apply: Use concepts to solve problems, demonstrate procedures
- Analyze: Compare, contrast, break down components, examine relationships
- Evaluate: Assess validity, critique arguments, make judgments
- Create: Design solutions, formulate hypotheses, construct new ideas

Return questions in this exact JSON format:
{
  "questions": [
    {
      "question_text": "Question text here",
      "answer_text": "Comprehensive answer here",
      "difficulty_level": "EASY|MEDIUM|HARD",
      "bloom_level": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE",
      "question_type": "DIRECT|INDIRECT|SCENARIO_BASED|PROBLEM_BASED",
      "marks": "TWO|EIGHT|SIXTEEN",
      "unit_number": 1,
      "course_name": "Course name",
      "material_name": "Material name"
    }
  ]
}`;

/**
 * Docker Model Runner Service
 */
export class DockerModelRunnerService {
  private config: ModelRunnerConfig;

  constructor(config: Partial<ModelRunnerConfig> = {}) {
    this.config = {
      baseUrl:
        config.baseUrl ||
        process.env.DOCKER_MODEL_RUNNER_URL ||
        "http://localhost:11435",
      model: config.model || SUPPORTED_MODELS.GEMMA_2_2B,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
      topP: config.topP ?? 0.9,
    };
  }

  /**
   * Switch to a different model
   */
  switchModel(model: SupportedModel): void {
    this.config.model = model;
  }

  /**
   * Generate questions from course material using LLM
   */
  async generateQuestions(
    params: QuestionGenerationParams
  ): Promise<GeneratedQuestion[]> {
    try {
      // Calculate total questions needed
      const totalQuestions =
        params.questionCounts.easy +
        params.questionCounts.medium +
        params.questionCounts.hard;

      if (totalQuestions === 0) {
        throw new Error("Total question count must be greater than 0");
      }

      // Chunk content if it's too large (to avoid context window limits)
      const chunks = await chunkContent(params.materialContent, {
        maxTokensPerChunk: 8000,
      });

      // If content fits in one chunk, generate all questions at once
      if (chunks.length === 1) {
        return await this.generateQuestionsFromChunk(params, chunks[0].content);
      }

      // For multiple chunks, distribute questions across chunks
      const questionsPerChunk = Math.ceil(totalQuestions / chunks.length);
      const allQuestions: GeneratedQuestion[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const remainingQuestions = totalQuestions - allQuestions.length;
        const questionsForThisChunk = Math.min(
          questionsPerChunk,
          remainingQuestions
        );

        if (questionsForThisChunk <= 0) break;

        // Adjust counts proportionally for this chunk
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

      return allQuestions.slice(0, totalQuestions); // Ensure exact count
    } catch (error) {
      console.error("[Docker Model Runner] Question generation failed:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to generate questions from LLM"
      );
    }
  }

  /**
   * Generate questions from a single content chunk
   */
  private async generateQuestionsFromChunk(
    params: QuestionGenerationParams,
    contentChunk: string
  ): Promise<GeneratedQuestion[]> {
    const prompt = this.buildPrompt(params, contentChunk);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          system: SYSTEM_PROMPT,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
            top_p: this.config.topP,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Model Runner API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      const generatedText = data.response;

      // Parse JSON response from LLM
      const parsedResponse = this.parseQuestionResponse(generatedText);
      return parsedResponse.questions;
    } catch (error) {
      console.error("[Docker Model Runner] API call failed:", error);
      throw error;
    }
  }

  /**
   * Build the prompt for question generation
   */
  private buildPrompt(
    params: QuestionGenerationParams,
    content: string
  ): string {
    return `
COURSE: ${params.courseName}
MATERIAL: ${params.materialName}
UNIT: ${params.unit}

QUESTION REQUIREMENTS:
- Easy questions: ${params.questionCounts.easy}
- Medium questions: ${params.questionCounts.medium}
- Hard questions: ${params.questionCounts.hard}

BLOOM'S TAXONOMY DISTRIBUTION:
- Remember: ${params.bloomLevels.remember}
- Understand: ${params.bloomLevels.understand}
- Apply: ${params.bloomLevels.apply}
- Analyze: ${params.bloomLevels.analyze}
- Evaluate: ${params.bloomLevels.evaluate}
- Create: ${params.bloomLevels.create}

QUESTION TYPE DISTRIBUTION:
- Direct: ${params.questionTypes.direct}
- Indirect: ${params.questionTypes.indirect}
- Scenario-based: ${params.questionTypes.scenarioBased}
- Problem-based: ${params.questionTypes.problemBased}

MARKS ALLOCATION:
- TWO marks for easy questions (short answer)
- EIGHT marks for medium questions (detailed explanation)
- SIXTEEN marks for hard questions (comprehensive analysis)

COURSE MATERIAL CONTENT:
${content}

Generate questions in the specified JSON format. Ensure questions are directly derived from the provided content.`;
  }

  /**
   * Parse LLM response into structured questions
   */
  private parseQuestionResponse(response: string): {
    questions: GeneratedQuestion[];
  } {
    try {
      // Extract JSON from response (LLMs sometimes add extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error(
          "Invalid response structure: missing 'questions' array"
        );
      }

      return parsed;
    } catch (error) {
      console.error(
        "[Docker Model Runner] Failed to parse response:",
        response
      );
      throw new Error("Failed to parse LLM response as JSON");
    }
  }

  /**
   * Adjust question counts proportionally for a chunk
   */
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

  /**
   * Test connection to Model Runner
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/`);
      return response.ok;
    } catch (_error) {
      return false;
    }
  }

  /**
   * List available models
   */
  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch (_error) {
      return [];
    }
  }
}

/**
 * Singleton instance for easy access
 */
export const dockerModelRunner = new DockerModelRunnerService();
