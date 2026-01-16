/**
 * AI SDK Integration (Vercel AI SDK)
 *
 * Central access point for AI tasks using the Vercel AI SDK with
 * Gemini (Google Generative AI) and Ollama providers.
 */

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2";
import { logger } from "@/lib/logger";
import type { QuestionGenerationParams, GeneratedQuestion } from "./types";
import { chunkContent } from "@/lib/content-chunker";
import { OLLAMA_SYSTEM_PROMPT } from "./prompts/ollama-prompt";
import { parseQuestionResponse } from "./parsers/question-parser";

/**
 * Available AI providers
 */
export enum AIProviderType {
  OLLAMA = "OLLAMA",
  GEMINI = "GEMINI",
}

const geminiProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

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

export function getProviderType(): AIProviderType {
  const raw = process.env.AI_PROVIDER || "OLLAMA";
  const normalized = raw.toString().trim().toUpperCase();
  return normalized === "GEMINI" ? AIProviderType.GEMINI : AIProviderType.OLLAMA;
}

export function getProviderName(): string {
  return getProviderType() === AIProviderType.GEMINI ? "Gemini" : "Ollama";
}

export function switchAIModel(model: string): void {
  modelOverride = model;
}

function getModelName(explicitModel?: string): string {
  if (explicitModel) return explicitModel;
  if (modelOverride) return modelOverride;

  const providerType = getProviderType();
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

function getModel(explicitModel?: string) {
  const providerType = getProviderType();
  const modelName = getModelName(explicitModel);

  if (providerType === AIProviderType.GEMINI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required but not found");
    }
    return { model: geminiProvider(modelName), providerType, modelName };
  }

  return { model: ollamaProvider(modelName), providerType, modelName };
}

export async function generateAIText(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const { model, providerType, modelName } = getModel(options?.model);
  const { text } = await generateText({
    model,
    prompt,
    temperature: options?.temperature ?? 0.7,
    topP: options?.topP ?? 0.9,
    maxTokens: options?.maxTokens ?? 1000,
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
  model?: string
): Promise<GeneratedQuestion[]> {
  const totalQuestions =
    params.questionCounts.easy +
    params.questionCounts.medium +
    params.questionCounts.hard;

  if (totalQuestions === 0) {
    throw new Error("Total question count must be greater than 0");
  }

  const chunks = await chunkContent(params.materialContent, {
    maxTokensPerChunk: 8000,
  });

  if (chunks.length === 1) {
    return generateQuestionsFromChunk(params, chunks[0].content, model);
  }

  const questionsPerChunk = Math.ceil(totalQuestions / chunks.length);
  const allQuestions: GeneratedQuestion[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const remainingQuestions = totalQuestions - allQuestions.length;
    const questionsForThisChunk = Math.min(
      questionsPerChunk,
      remainingQuestions
    );

    if (questionsForThisChunk <= 0) break;

    const adjustedParams = adjustQuestionCounts(
      params,
      questionsForThisChunk,
      totalQuestions
    );
    const chunkQuestions = await generateQuestionsFromChunk(
      adjustedParams,
      chunks[i].content,
      model
    );

    allQuestions.push(...chunkQuestions);
  }

  return allQuestions.slice(0, totalQuestions);
}

async function generateQuestionsFromChunk(
  params: QuestionGenerationParams,
  contentChunk: string,
  model?: string
): Promise<GeneratedQuestion[]> {
  const prompt = buildPrompt(params, contentChunk);
  const fullPrompt = `${OLLAMA_SYSTEM_PROMPT}\n\n${prompt}`;
  const responseText = await generateAIText(fullPrompt, {
    model,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4000,
  });

  const parsed = parseQuestionResponse(responseText, getProviderName());
  return parsed.questions;
}

function buildPrompt(params: QuestionGenerationParams, content: string): string {
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

function adjustQuestionCounts(
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
      understand: Math.max(0, Math.round(params.bloomLevels.understand * ratio)),
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
        Math.round(params.questionTypes.scenarioBased * ratio)
      ),
      problemBased: Math.max(
        0,
        Math.round(params.questionTypes.problemBased * ratio)
      ),
    },
  };
}

export async function testAIConnection(): Promise<boolean> {
  try {
    const response = await generateAIText("test", { maxTokens: 5 });
    return response.trim().length > 0;
  } catch (error) {
    logger.warn(
      "AIService",
      "AI connection test failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function listAvailableModels(): Promise<string[]> {
  const providerType = getProviderType();
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
      error instanceof Error ? error : new Error(String(error))
    );
    return ["mistral:7b"];
  }
}

// Re-export types for convenience
export * from "./types";
