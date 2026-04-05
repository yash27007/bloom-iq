/**
 * Web Search Service for Real-World Grounding
 *
 * Provides real-world context for question generation by searching
 * for case studies, research papers, and industry examples.
 *
 * Supports multiple search providers:
 * - Tavily AI Search (recommended for accuracy)
 * - Serper API (Google Search)
 * - DuckDuckGo (fallback, no API key required)
 */

import { logger } from "@/lib/logger";
import type { AcademicLevel, RealWorldContext } from "./ai/types";

export type SearchProvider = "tavily" | "serper" | "duckduckgo";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

interface SearchConfig {
  provider: SearchProvider;
  apiKey?: string;
  maxResults: number;
}

/**
 * Web Search Service Class
 */
export class WebSearchService {
  private config: SearchConfig;

  constructor() {
    // Auto-detect available provider based on environment
    this.config = this.detectProvider();
  }

  private detectProvider(): SearchConfig {
    if (process.env.TAVILY_API_KEY) {
      return {
        provider: "tavily",
        apiKey: process.env.TAVILY_API_KEY,
        maxResults: 5,
      };
    }

    if (process.env.SERPER_API_KEY) {
      return {
        provider: "serper",
        apiKey: process.env.SERPER_API_KEY,
        maxResults: 5,
      };
    }

    // Fallback to DuckDuckGo (no API key required)
    return {
      provider: "duckduckgo",
      maxResults: 5,
    };
  }

  /**
   * Search for real-world context based on topic and academic level
   */
  async searchRealWorldContext(
    topic: string,
    academicLevel: AcademicLevel,
    subject?: string,
  ): Promise<RealWorldContext> {
    const context: RealWorldContext = {
      caseStudies: [],
      researchPapers: [],
      industryExamples: [],
      recentDevelopments: [],
    };

    try {
      // Build search queries based on academic level
      const queries = this.buildSearchQueries(topic, academicLevel, subject);

      // Execute searches in parallel
      const searchPromises = queries.map(async (query) => {
        const results = await this.executeSearch(query.query);
        return { type: query.type, results };
      });

      const searchResults = await Promise.all(searchPromises);

      // Categorize results
      for (const { type, results } of searchResults) {
        const formattedResults = results.map(
          (r) => `${r.title}: ${r.snippet} (Source: ${r.url})`,
        );

        switch (type) {
          case "caseStudy":
            context.caseStudies.push(...formattedResults.slice(0, 3));
            break;
          case "research":
            context.researchPapers.push(...formattedResults.slice(0, 3));
            break;
          case "industry":
            context.industryExamples.push(...formattedResults.slice(0, 3));
            break;
          case "recent":
            context.recentDevelopments.push(...formattedResults.slice(0, 3));
            break;
        }
      }

      logger.info(
        "WebSearchService",
        "Successfully gathered real-world context",
        {
          topic,
          academicLevel,
          caseStudies: context.caseStudies.length,
          researchPapers: context.researchPapers.length,
          industryExamples: context.industryExamples.length,
          recentDevelopments: context.recentDevelopments.length,
        },
      );

      return context;
    } catch (error) {
      logger.error(
        "WebSearchService",
        "Failed to gather real-world context",
        error instanceof Error ? error : new Error(String(error)),
        { topic, academicLevel },
      );

      // Return empty context on error - generation can still proceed
      return context;
    }
  }

  /**
   * Build search queries based on academic level
   */
  private buildSearchQueries(
    topic: string,
    academicLevel: AcademicLevel,
    subject?: string,
  ): Array<{ query: string; type: string }> {
    const subjectContext = subject ? ` ${subject}` : "";
    const queries: Array<{ query: string; type: string }> = [];

    // Common query for all levels
    queries.push({
      query: `${topic}${subjectContext} real-world application example`,
      type: "industry",
    });

    // Level-specific queries
    switch (academicLevel) {
      case "UG":
        queries.push({
          query: `${topic}${subjectContext} practical example tutorial`,
          type: "caseStudy",
        });
        queries.push({
          query: `${topic}${subjectContext} industry use case`,
          type: "industry",
        });
        break;

      case "PG":
        queries.push({
          query: `${topic}${subjectContext} case study analysis`,
          type: "caseStudy",
        });
        queries.push({
          query: `${topic}${subjectContext} research paper recent`,
          type: "research",
        });
        queries.push({
          query: `${topic}${subjectContext} enterprise implementation challenges`,
          type: "industry",
        });
        break;

      case "PHD":
        queries.push({
          query: `${topic}${subjectContext} research gap literature review`,
          type: "research",
        });
        queries.push({
          query: `${topic}${subjectContext} cutting edge research 2024 2025`,
          type: "recent",
        });
        queries.push({
          query: `${topic}${subjectContext} theoretical framework limitations`,
          type: "research",
        });
        queries.push({
          query: `${topic}${subjectContext} open problems challenges`,
          type: "recent",
        });
        break;
    }

    return queries;
  }

  /**
   * Execute search using configured provider
   */
  private async executeSearch(query: string): Promise<SearchResult[]> {
    switch (this.config.provider) {
      case "tavily":
        return this.searchWithTavily(query);
      case "serper":
        return this.searchWithSerper(query);
      case "duckduckgo":
      default:
        return this.searchWithDuckDuckGo(query);
    }
  }

  /**
   * Search using Tavily AI Search API
   */
  private async searchWithTavily(query: string): Promise<SearchResult[]> {
    if (!this.config.apiKey) {
      throw new Error("Tavily API key not configured");
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.config.apiKey,
          query,
          search_depth: "advanced",
          max_results: this.config.maxResults,
          include_answer: false,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }

      interface TavilyResult {
        title?: string;
        url: string;
        content?: string;
      }

      const data = (await response.json()) as { results?: TavilyResult[] };

      return (data.results || []).map((r: TavilyResult) => ({
        title: r.title || "Untitled",
        url: r.url || "",
        snippet: r.content || "",
        source: new URL(r.url).hostname,
      }));
    } catch (error) {
      logger.warn("WebSearchService", "Tavily search failed, falling back", {
        error,
      });
      return this.searchWithDuckDuckGo(query);
    }
  }

  /**
   * Search using Serper (Google Search) API
   */
  private async searchWithSerper(query: string): Promise<SearchResult[]> {
    if (!this.config.apiKey) {
      throw new Error("Serper API key not configured");
    }

    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": this.config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: this.config.maxResults,
        }),
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`);
      }

      interface SerperResult {
        title?: string;
        link: string;
        snippet?: string;
      }

      const data = (await response.json()) as { organic?: SerperResult[] };

      return (data.organic || []).map((r: SerperResult) => ({
        title: r.title || "Untitled",
        url: r.link || "",
        snippet: r.snippet || "",
        source: new URL(r.link).hostname,
      }));
    } catch (error) {
      logger.warn("WebSearchService", "Serper search failed, falling back", {
        error,
      });
      return this.searchWithDuckDuckGo(query);
    }
  }

  /**
   * Search using DuckDuckGo Instant Answer API (no API key required)
   * Note: Limited functionality compared to paid APIs
   */
  private async searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
    try {
      // DuckDuckGo Instant Answer API
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
      );

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      // Extract from AbstractText
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || "",
          snippet: data.AbstractText,
          source: data.AbstractSource || "DuckDuckGo",
        });
      }

      // Extract from RelatedTopics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(
          0,
          this.config.maxResults - 1,
        )) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(" - ")[0] || "Related",
              url: topic.FirstURL,
              snippet: topic.Text,
              source: "DuckDuckGo",
            });
          }
        }
      }

      return results;
    } catch (error) {
      logger.error(
        "WebSearchService",
        "DuckDuckGo search failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      return [];
    }
  }

  /**
   * Check if web search is available
   */
  isAvailable(): boolean {
    return true; // DuckDuckGo is always available as fallback
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.config.provider;
  }
}

// Export singleton instance
export const webSearchService = new WebSearchService();

/**
 * Helper function to extract key topics from material content
 */
export function extractTopicsFromContent(
  content: string,
  maxTopics: number = 5,
): string[] {
  // Simple keyword extraction - can be enhanced with NLP
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);

  // Count word frequency
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }

  // Sort by frequency and return top words
  const sortedWords = Object.entries(wordCount)
    .filter(([word]) => !STOP_WORDS.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTopics)
    .map(([word]) => word);

  return sortedWords;
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  "about",
  "above",
  "after",
  "again",
  "against",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "could",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "from",
  "further",
  "have",
  "having",
  "here",
  "itself",
  "just",
  "more",
  "most",
  "once",
  "only",
  "other",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "until",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);
