/**
 * AI SDK Integration (Vercel AI SDK)
 *
 * Central access point for AI tasks using the Vercel AI SDK with
 * Gemini (Google Generative AI) and Ollama providers.
 *
 * Features:
 * - Round-robin API key rotation for Gemini (avoids rate limiting)
 * - Support for multiple API keys via GEMINI_API_KEY, GEMINI_API_KEY_1, etc.
 * - Multi-level difficulty scaling (UG, PG, PhD)
 * - Real-world grounding via web search
 * - LaTeX and Mermaid diagram support
 */

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2";
import { logger } from "@/lib/logger";
import { geminiKeyManager } from "@/lib/gemini-key-manager";
import type {
  QuestionGenerationParams,
  GeneratedQuestion,
  AcademicLevel,
  RealWorldContext,
} from "./types";
import { ACADEMIC_LEVEL_CONFIG } from "./types";
import { chunkContent } from "@/lib/content-chunker";
import { OLLAMA_SYSTEM_PROMPT } from "./prompts/ollama-prompt";
import {
  getAcademicLevelPrompt,
  getRealWorldContextPrompt,
  getSubjectRenderingGuidance,
} from "./prompts/academic-level-prompts";
import {
  parseQuestionResponse,
  parseEnhancedQuestionResponse,
} from "./parsers/question-parser";
import {
  webSearchService,
  extractTopicsFromContent,
} from "../web-search.service";

/**
 * Available AI providers
 */
export enum AIProviderType {
  OLLAMA = "OLLAMA",
  GEMINI = "GEMINI",
}

/**
 * Get a Gemini provider with the next available API key (round-robin)
 */
function getGeminiProvider() {
  const apiKey = geminiKeyManager.getNextKey();
  return createGoogleGenerativeAI({ apiKey });
}

const rawOllamaUrl =
  process.env.OLLAMA_URL ||
  process.env.OLLAMA_BASE_URL ||
  "http://localhost:11434";
const normalizedOllamaUrl = rawOllamaUrl.endsWith("/api")
  ? rawOllamaUrl
  : `${rawOllamaUrl.replace(/\/$/, "")}/api`;

const ollamaProvider = createOllama({
  baseURL: normalizedOllamaUrl,
});

let modelOverride: string | null = null;

export function getProviderType(
  override?: AIProviderType | string,
): AIProviderType {
  const raw = override || process.env.AI_PROVIDER || "OLLAMA";
  const normalized = raw.toString().trim().toUpperCase();
  return normalized === "GEMINI"
    ? AIProviderType.GEMINI
    : AIProviderType.OLLAMA;
}

export function getProviderName(override?: AIProviderType | string): string {
  return getProviderType(override) === AIProviderType.GEMINI
    ? "Gemini"
    : "Ollama";
}

export function switchAIModel(model: string): void {
  modelOverride = model;
}

function getModelName(
  explicitModel?: string,
  providerOverride?: AIProviderType | string,
): string {
  if (explicitModel) return explicitModel;
  if (modelOverride) return modelOverride;

  const providerType = getProviderType(providerOverride);
  if (providerType === AIProviderType.GEMINI) {
    return (
      process.env.GEMINI_MODEL ||
      process.env.DEFAULT_AI_MODEL ||
      "gemini-2.5-flash"
    );
  }

  return (
    process.env.OLLAMA_MODEL || process.env.DEFAULT_AI_MODEL || "mistral:7b"
  );
}

function getModel(
  explicitModel?: string,
  providerOverride?: AIProviderType | string,
) {
  const providerType = getProviderType(providerOverride);
  const modelName = getModelName(explicitModel, providerOverride);

  if (providerType === AIProviderType.GEMINI) {
    if (geminiKeyManager.getKeyCount() === 0) {
      throw new Error(
        "GEMINI_API_KEY is required but not found. Set GEMINI_API_KEY or GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.",
      );
    }
    // Use round-robin key rotation
    const geminiProvider = getGeminiProvider();
    return { model: geminiProvider(modelName), providerType, modelName };
  }

  return { model: ollamaProvider(modelName), providerType, modelName };
}

export async function generateAIText(
  prompt: string,
  options?: {
    model?: string;
    provider?: AIProviderType | string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  },
): Promise<string> {
  const { model, providerType, modelName } = getModel(
    options?.model,
    options?.provider,
  );
  const { text } = await generateText({
    model,
    prompt,
    temperature: options?.temperature ?? 0.7,
    topP: options?.topP ?? 0.9,
  });

  logger.debug("AIService", "Generated text response", {
    provider: providerType,
    model: modelName,
    promptLength: prompt.length,
    responseLength: text.length,
  });

  return text;
}

export async function generateQuestions(
  params: QuestionGenerationParams,
  model?: string,
  provider?: AIProviderType | string,
): Promise<GeneratedQuestion[]> {
  const totalQuestions =
    params.questionCounts.easy +
    params.questionCounts.medium +
    params.questionCounts.hard;

  if (totalQuestions === 0) {
    throw new Error("Total question count must be greater than 0");
  }

  const academicLevel = params.academicLevel || "UG";
  const enableWebSearch = params.enableWebSearch ?? academicLevel !== "UG";
  const enableRichMedia = params.enableRichMedia ?? true;

  logger.info("AIService", "Starting enhanced question generation", {
    academicLevel,
    enableWebSearch,
    enableRichMedia,
    totalQuestions,
  });

  // Gather real-world context if enabled
  let realWorldContext: RealWorldContext | undefined;
  if (enableWebSearch) {
    try {
      const topics = extractTopicsFromContent(params.materialContent, 3);
      const mainTopic = topics.join(" ");
      realWorldContext = await webSearchService.searchRealWorldContext(
        mainTopic,
        academicLevel,
        params.courseName,
      );
      logger.info("AIService", "Gathered real-world context", {
        topics,
        caseStudies: realWorldContext.caseStudies.length,
        researchPapers: realWorldContext.researchPapers.length,
      });
    } catch (error) {
      logger.warn(
        "AIService",
        "Failed to gather real-world context, proceeding without",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  const chunks = await chunkContent(params.materialContent, {
    maxTokensPerChunk: 8000,
  });

  if (chunks.length === 1) {
    return generateQuestionsFromChunk(
      params,
      chunks[0].content,
      model,
      provider,
      academicLevel,
      enableRichMedia,
      realWorldContext,
    );
  }

  const questionsPerChunk = Math.ceil(totalQuestions / chunks.length);
  const allQuestions: GeneratedQuestion[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const remainingQuestions = totalQuestions - allQuestions.length;
    const questionsForThisChunk = Math.min(
      questionsPerChunk,
      remainingQuestions,
    );

    if (questionsForThisChunk <= 0) break;

    const adjustedParams = adjustQuestionCounts(
      params,
      questionsForThisChunk,
      totalQuestions,
    );
    const chunkQuestions = await generateQuestionsFromChunk(
      adjustedParams,
      chunks[i].content,
      model,
      provider,
      academicLevel,
      enableRichMedia,
      realWorldContext,
    );

    allQuestions.push(...chunkQuestions);
  }

  return allQuestions.slice(0, totalQuestions);
}

async function generateQuestionsFromChunk(
  params: QuestionGenerationParams,
  contentChunk: string,
  model?: string,
  provider?: AIProviderType | string,
  academicLevel: AcademicLevel = "UG",
  enableRichMedia: boolean = true,
  realWorldContext?: RealWorldContext,
): Promise<GeneratedQuestion[]> {
  // Get academic level specific prompt
  const systemPrompt = getAcademicLevelPrompt(academicLevel);

  // Build the main prompt
  const prompt = buildEnhancedPrompt(
    params,
    contentChunk,
    academicLevel,
    enableRichMedia,
    realWorldContext,
  );

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  logger.debug("AIService", "Generating questions with enhanced prompt", {
    academicLevel,
    promptLength: fullPrompt.length,
    hasRealWorldContext: !!realWorldContext,
  });

  const responseText = await generateAIText(fullPrompt, {
    model,
    provider,
    temperature: academicLevel === "PHD" ? 0.8 : 0.7, // Slightly more creative for PhD
    topP: 0.9,
    maxTokens: 6000, // Increased for richer content
  });

  // Use enhanced parser for rich media content
  const parsed = parseEnhancedQuestionResponse(
    responseText,
    getProviderName(),
    academicLevel,
  );

  // Attach academic level to all questions
  return parsed.questions.map((q) => ({
    ...q,
    academic_level: academicLevel,
  }));
}

function buildEnhancedPrompt(
  params: QuestionGenerationParams,
  content: string,
  academicLevel: AcademicLevel,
  enableRichMedia: boolean,
  realWorldContext?: RealWorldContext,
): string {
  const {
    courseName,
    materialName,
    unit,
    questionCounts,
    bloomLevels,
    questionTypes,
  } = params;

  const levelConfig = ACADEMIC_LEVEL_CONFIG[academicLevel];

  // Build real-world context section
  const realWorldSection = realWorldContext
    ? getRealWorldContextPrompt(realWorldContext, academicLevel)
    : "";

  // Build subject-specific rendering guidance
  const renderingGuidance = enableRichMedia
    ? getSubjectRenderingGuidance(courseName)
    : "";

  // Adjusted Bloom's levels based on academic level
  const bloomGuidance = `
BLOOM'S TAXONOMY FOCUS FOR ${levelConfig.name.toUpperCase()} LEVEL:
- Primary Focus: ${levelConfig.primaryBloomLevels.join(", ")}
- Secondary Focus: ${levelConfig.secondaryBloomLevels.join(", ")}
- Complexity: ${levelConfig.complexityFocus}

Question Characteristics Expected:
${levelConfig.questionCharacteristics.map((c) => `- ${c}`).join("\n")}
`;

  return `Generate exam questions from the following course material.

COURSE INFORMATION:
- Course: ${courseName}
- Material: ${materialName}
- Unit: ${unit}
- Academic Level: ${academicLevel} (${levelConfig.name})

${bloomGuidance}

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

${realWorldSection}

${renderingGuidance}

RICH MEDIA RENDERING: ${enableRichMedia ? "ENABLED - Use LaTeX for math and Mermaid for diagrams where appropriate" : "DISABLED - Text only"}

COURSE MATERIAL:
${content}

Generate questions following the system prompt instructions. Ensure exact counts, proper formatting, and appropriate complexity for ${levelConfig.name} level.
For each question, include:
1. The rendering_type field (TEXT, LATEX, MERMAID, or MIXED)
2. A bloom_justification explaining why this cognitive level was chosen
3. For ${academicLevel === "PHD" ? "research-level questions requiring original thinking" : academicLevel === "PG" ? "questions requiring synthesis and critical evaluation" : "application-focused questions with clear solutions"}`;
}

// Keep legacy function for backward compatibility
function buildPrompt(
  params: QuestionGenerationParams,
  content: string,
): string {
  return buildEnhancedPrompt(params, content, "UG", false, undefined);
}

function adjustQuestionCounts(
  params: QuestionGenerationParams,
  questionsForChunk: number,
  totalQuestions: number,
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
        Math.round(params.bloomLevels.understand * ratio),
      ),
      apply: Math.max(0, Math.round(params.bloomLevels.apply * ratio)),
      analyze: Math.max(0, Math.round(params.bloomLevels.analyze * ratio)),
      evaluate: Math.max(0, Math.round(params.bloomLevels.evaluate * ratio)),
      create: Math.max(0, Math.round(params.bloomLevels.create * ratio)),
    },
    questionTypes: {
      direct: Math.max(0, Math.round(params.questionTypes.direct * ratio)),
      indirect: Math.max(0, Math.round(params.questionTypes.indirect * ratio)),
      scenarioBased: Math.max(
        0,
        Math.round(params.questionTypes.scenarioBased * ratio),
      ),
      problemBased: Math.max(
        0,
        Math.round(params.questionTypes.problemBased * ratio),
      ),
    },
  };
}

export async function testAIConnection(
  provider?: AIProviderType | string,
): Promise<boolean> {
  try {
    const response = await generateAIText("test", {
      provider,
      maxTokens: 5,
    });
    return response.trim().length > 0;
  } catch (error) {
    logger.warn(
      "AIService",
      "AI connection test failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return false;
  }
}

export async function listAvailableModels(
  provider?: AIProviderType | string,
): Promise<string[]> {
  const providerType = getProviderType(provider);
  if (providerType === AIProviderType.GEMINI) {
    return [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ];
  }

  const ollamaUrl =
    process.env.OLLAMA_URL ||
    process.env.OLLAMA_BASE_URL ||
    "http://localhost:11434";

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return ["mistral:7b"];
    }

    const data = await response.json();
    const models = data.models || [];
    const modelNames = models.map((model: { name: string }) => model.name);
    return modelNames.length > 0 ? modelNames : ["mistral:7b"];
  } catch (error) {
    logger.warn(
      "AIService",
      "Failed to fetch Ollama models",
      error instanceof Error ? error : new Error(String(error)),
    );
    return ["mistral:7b"];
  }
}

// Re-export types for convenience
export * from "./types";
