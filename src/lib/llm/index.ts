// LLM Provider exports
export * from './llm-provider';
export * from './gemini-provider';

// Auto-register providers
import { LLMProviderFactory } from './llm-provider';
import { GeminiProvider } from './gemini-provider';

// Register Gemini provider
try {
  const geminiProvider = new GeminiProvider();
  LLMProviderFactory.registerProvider('gemini', geminiProvider);
} catch (error) {
  console.warn('Failed to register Gemini provider:', error);
}

// Export factory for easy access
export { LLMProviderFactory as LLM };
