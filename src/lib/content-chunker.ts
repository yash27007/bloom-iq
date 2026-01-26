/**
 * Content Chunking Utility for LLM Context Management
 * Intelligently splits large educational content into processable chunks
 */

export interface Chunk {
  id: string;
  title: string;
  content: string;
  startLine: number;
  endLine: number;
  tokens: number;
  metadata: {
    headingLevel: number;
    hasSubsections: boolean;
    topicKeywords: string[];
  };
}

export interface ChunkingOptions {
  maxTokensPerChunk?: number;
  minTokensPerChunk?: number;
  overlapTokens?: number;
  method?: "by-heading" | "by-tokens" | "hybrid";
  preserveContext?: boolean;
  /** Include context from previous chunk for better RAG retrieval */
  includeOverlap?: boolean;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxTokensPerChunk: 3000,
  minTokensPerChunk: 500,
  overlapTokens: 200,
  method: "by-heading",
  preserveContext: true,
  includeOverlap: true,
};

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split content by markdown headings
 */
function splitByHeadings(content: string): Array<{
  heading: string;
  level: number;
  content: string;
  startLine: number;
  endLine: number;
}> {
  const lines = content.split("\n");
  const sections: Array<{
    heading: string;
    level: number;
    content: string;
    startLine: number;
    endLine: number;
  }> = [];

  type CurrentSection = {
    heading: string;
    level: number;
    lines: string[];
    startLine: number;
  };

  let currentSection: CurrentSection | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          heading: currentSection.heading,
          level: currentSection.level,
          content: currentSection.lines.join("\n"),
          startLine: currentSection.startLine,
          endLine: index - 1,
        });
      }

      // Start new section
      currentSection = {
        heading: headingMatch[2],
        level: headingMatch[1].length,
        lines: [line],
        startLine: index,
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      // Content before first heading
      currentSection = {
        heading: "Introduction",
        level: 1,
        lines: [line],
        startLine: index,
      };
    }
  }

  // Add last section
  if (currentSection) {
    sections.push({
      heading: currentSection.heading,
      level: currentSection.level,
      content: currentSection.lines.join("\n"),
      startLine: currentSection.startLine,
      endLine: lines.length - 1,
    });
  }

  return sections;
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  // Remove common words and extract meaningful terms
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4); // Only words longer than 4 chars

  // Count frequency
  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Return top 5 keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Extract overlap text from the end of a string (for context preservation)
 * @param text Source text to extract overlap from
 * @param targetTokens Approximate number of tokens to extract
 * @returns Overlap text ending at a sentence boundary
 */
function extractOverlap(text: string, targetTokens: number): string {
  if (!text || targetTokens <= 0) return "";
  
  // Approximate character count for target tokens
  const targetChars = targetTokens * 4;
  
  if (text.length <= targetChars) return text;
  
  // Get the last portion of text
  const endPortion = text.slice(-targetChars * 1.5); // Get a bit more to find sentence boundary
  
  // Find the first sentence boundary in this portion
  const sentenceMatch = endPortion.match(/[.!?]\s+[A-Z]/);
  if (sentenceMatch && sentenceMatch.index !== undefined) {
    const overlapStart = sentenceMatch.index + 2; // Include the space after punctuation
    return endPortion.slice(overlapStart);
  }
  
  // If no sentence boundary found, try to break at a paragraph
  const paragraphMatch = endPortion.match(/\n\n/);
  if (paragraphMatch && paragraphMatch.index !== undefined) {
    return endPortion.slice(paragraphMatch.index + 2);
  }
  
  // Fallback: just take the approximate amount
  return text.slice(-targetChars);
}

/**
 * Merge small sections into larger chunks with overlap support
 */
function mergeSections(
  sections: Array<{
    heading: string;
    level: number;
    content: string;
    startLine: number;
    endLine: number;
  }>,
  maxTokens: number,
  minTokens: number,
  includeOverlap: boolean = true,
  overlapTokens: number = 200
): Chunk[] {
  const chunks: Chunk[] = [];

  type TempChunk = {
    headings: string[];
    content: string[];
    startLine: number;
    endLine: number;
    tokens: number;
  };

  let currentChunk: TempChunk | null = null;
  let previousChunkContent: string = "";

  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);

    if (!currentChunk) {
      // Start new chunk
      currentChunk = {
        headings: [section.heading],
        content: [section.content],
        startLine: section.startLine,
        endLine: section.endLine,
        tokens: sectionTokens,
      };
    } else if (currentChunk.tokens + sectionTokens <= maxTokens) {
      // Add to current chunk
      currentChunk.headings.push(section.heading);
      currentChunk.content.push(section.content);
      currentChunk.endLine = section.endLine;
      currentChunk.tokens += sectionTokens;
    } else {
      // Current chunk is full, save it
      const chunkContent = currentChunk.content.join("\n\n");
      
      // Add overlap from previous chunk if enabled
      let finalContent = chunkContent;
      if (includeOverlap && previousChunkContent) {
        const overlap = extractOverlap(previousChunkContent, overlapTokens);
        if (overlap) {
          finalContent = `[Context from previous section]\n${overlap}\n\n---\n\n${chunkContent}`;
        }
      }
      
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        title: currentChunk.headings.join(" → "),
        content: finalContent,
        startLine: currentChunk.startLine,
        endLine: currentChunk.endLine,
        tokens: estimateTokens(finalContent),
        metadata: {
          headingLevel: section.level,
          hasSubsections: currentChunk.headings.length > 1,
          topicKeywords: extractKeywords(chunkContent),
        },
      });

      // Store current chunk content for next overlap
      previousChunkContent = chunkContent;

      // Start new chunk with current section
      currentChunk = {
        headings: [section.heading],
        content: [section.content],
        startLine: section.startLine,
        endLine: section.endLine,
        tokens: sectionTokens,
      };
    }
  }

  // Add last chunk
  if (currentChunk && currentChunk.tokens >= minTokens) {
    const chunkContent = currentChunk.content.join("\n\n");
    
    // Add overlap from previous chunk if enabled
    let finalContent = chunkContent;
    if (includeOverlap && previousChunkContent) {
      const overlap = extractOverlap(previousChunkContent, overlapTokens);
      if (overlap) {
        finalContent = `[Context from previous section]\n${overlap}\n\n---\n\n${chunkContent}`;
      }
    }
    
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      title: currentChunk.headings.join(" → "),
      content: finalContent,
      startLine: currentChunk.startLine,
      endLine: currentChunk.endLine,
      tokens: estimateTokens(finalContent),
      metadata: {
        headingLevel: 1,
        hasSubsections: currentChunk.headings.length > 1,
        topicKeywords: extractKeywords(chunkContent),
      },
    });
  }

  return chunks;
}

/**
 * Main chunking function
 */
export async function chunkContent(
  content: string,
  options: ChunkingOptions = {}
): Promise<Chunk[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!content || content.trim().length === 0) {
    throw new Error("Content cannot be empty");
  }

  const totalTokens = estimateTokens(content);
  console.log(`[Chunker] Total content: ${totalTokens} tokens`);

  // If content is small enough, return as single chunk
  if (totalTokens <= opts.maxTokensPerChunk!) {
    console.log(`[Chunker] Content fits in single chunk`);
    return [
      {
        id: "chunk-1",
        title: "Full Content",
        content: content,
        startLine: 0,
        endLine: content.split("\n").length - 1,
        tokens: totalTokens,
        metadata: {
          headingLevel: 1,
          hasSubsections: false,
          topicKeywords: extractKeywords(content),
        },
      },
    ];
  }

  // Split by headings
  console.log(`[Chunker] Splitting content by headings...`);
  const sections = splitByHeadings(content);
  console.log(`[Chunker] Found ${sections.length} sections`);

  // Merge sections into optimal chunks with overlap
  const chunks = mergeSections(
    sections,
    opts.maxTokensPerChunk!,
    opts.minTokensPerChunk!,
    opts.includeOverlap ?? true,
    opts.overlapTokens ?? 200
  );

  console.log(`[Chunker] Created ${chunks.length} chunks:`);
  chunks.forEach((chunk, index) => {
    console.log(
      `  - Chunk ${index + 1}: "${chunk.title}" (${chunk.tokens} tokens)`
    );
  });

  return chunks;
}

/**
 * Distribute question generation parameters across chunks
 */
export function distributeQuestionsAcrossChunks(
  chunks: Chunk[],
  totalRequirements: {
    difficulty: { easy: number; medium: number; hard: number };
    bloomLevels: {
      remember: number;
      understand: number;
      apply: number;
      analyze: number;
      evaluate: number;
      create: number;
    };
  }
): Array<{
  chunkId: string;
  difficulty: { easy: number; medium: number; hard: number };
  bloomLevels: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  };
}> {
  const numChunks = chunks.length;
  const distribution: Array<{
    chunkId: string;
    difficulty: { easy: number; medium: number; hard: number };
    bloomLevels: {
      remember: number;
      understand: number;
      apply: number;
      analyze: number;
      evaluate: number;
      create: number;
    };
  }> = [];

  // Calculate weight based on chunk size
  const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);

  chunks.forEach((chunk, index) => {
    const weight = chunk.tokens / totalTokens;
    const isLastChunk = index === numChunks - 1;

    // Distribute difficulty
    const easyCount = isLastChunk
      ? totalRequirements.difficulty.easy -
        distribution.reduce((sum, d) => sum + d.difficulty.easy, 0)
      : Math.round(totalRequirements.difficulty.easy * weight);

    const mediumCount = isLastChunk
      ? totalRequirements.difficulty.medium -
        distribution.reduce((sum, d) => sum + d.difficulty.medium, 0)
      : Math.round(totalRequirements.difficulty.medium * weight);

    const hardCount = isLastChunk
      ? totalRequirements.difficulty.hard -
        distribution.reduce((sum, d) => sum + d.difficulty.hard, 0)
      : Math.round(totalRequirements.difficulty.hard * weight);

    // Distribute Bloom's levels
    const remember = isLastChunk
      ? totalRequirements.bloomLevels.remember -
        distribution.reduce((sum, d) => sum + d.bloomLevels.remember, 0)
      : Math.round(totalRequirements.bloomLevels.remember * weight);

    const understand = isLastChunk
      ? totalRequirements.bloomLevels.understand -
        distribution.reduce((sum, d) => sum + d.bloomLevels.understand, 0)
      : Math.round(totalRequirements.bloomLevels.understand * weight);

    const apply = isLastChunk
      ? totalRequirements.bloomLevels.apply -
        distribution.reduce((sum, d) => sum + d.bloomLevels.apply, 0)
      : Math.round(totalRequirements.bloomLevels.apply * weight);

    const analyze = isLastChunk
      ? totalRequirements.bloomLevels.analyze -
        distribution.reduce((sum, d) => sum + d.bloomLevels.analyze, 0)
      : Math.round(totalRequirements.bloomLevels.analyze * weight);

    const evaluate = isLastChunk
      ? totalRequirements.bloomLevels.evaluate -
        distribution.reduce((sum, d) => sum + d.bloomLevels.evaluate, 0)
      : Math.round(totalRequirements.bloomLevels.evaluate * weight);

    const create = isLastChunk
      ? totalRequirements.bloomLevels.create -
        distribution.reduce((sum, d) => sum + d.bloomLevels.create, 0)
      : Math.round(totalRequirements.bloomLevels.create * weight);

    distribution.push({
      chunkId: chunk.id,
      difficulty: {
        easy: Math.max(0, easyCount),
        medium: Math.max(0, mediumCount),
        hard: Math.max(0, hardCount),
      },
      bloomLevels: {
        remember: Math.max(0, remember),
        understand: Math.max(0, understand),
        apply: Math.max(0, apply),
        analyze: Math.max(0, analyze),
        evaluate: Math.max(0, evaluate),
        create: Math.max(0, create),
      },
    });
  });

  return distribution;
}
