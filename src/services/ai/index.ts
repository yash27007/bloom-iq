/**
 * AI Service Factory
 *
 * Central access point for AI providers using the adapter pattern.
 * Makes it easy to swap between different AI providers (Ollama, OpenAI, etc.)
 */

import type { AIProvider } from "./types";
import { OllamaProvider } from "./ollama-provider";

/**
 * Available AI providers
 */
export enum AIProviderType {
  OLLAMA = "ollama",
  // Future providers can be added here:
  // OPENAI = "openai",
  // ANTHROPIC = "anthropic",
  // GEMINI = "gemini",
}

/**
 * Get the configured AI provider
 */
export function getAIProvider(): AIProvider {
  const providerType =
    (process.env.AI_PROVIDER as AIProviderType) || AIProviderType.OLLAMA;

  switch (providerType) {
    case AIProviderType.OLLAMA:
      return new OllamaProvider();
    // Future providers:
    // case AIProviderType.OPENAI:
    //   return new OpenAIProvider();
    default:
      console.warn(
        `Unknown AI provider: ${providerType}, falling back to Ollama`
      );
      return new OllamaProvider();
  }
}

/**
 * Singleton AI service instance
 */
export const aiService = getAIProvider();

// Re-export types for convenience
export * from "./types";
export { OllamaProvider, OLLAMA_MODELS } from "./ollama-provider";
