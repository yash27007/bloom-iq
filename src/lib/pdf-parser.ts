// PDF parsing utility using dynamic imports

/**
 * PDF parsing utility for extracting text content and converting to markdown
 */

export interface ParsedPDFContent {
  text: string;
  markdown: string;
  metadata: {
    pages: number;
    info?: Record<string, unknown>;
  };
}

/**
 * Parse PDF buffer and extract text content
 */
export async function parsePDFToText(
  buffer: Buffer
): Promise<ParsedPDFContent> {
  try {
    // Dynamic import to avoid build-time issues
    const pdf = await import("pdf-parse").then((module) => module.default);
    const data = await pdf(buffer);

    const text = data.text;
    const markdown = convertTextToMarkdown(text);

    return {
      text,
      markdown,
      metadata: {
        pages: data.numpages,
        info: data.info,
      },
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF content");
  }
}

/**
 * Convert extracted text to structured markdown format
 */
function convertTextToMarkdown(text: string): string {
  // Clean and structure the text
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n") // Replace multiple newlines with double
    .trim();

  // Split into lines for processing
  const lines = cleanedText.split("\n");
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      processedLines.push("");
      continue;
    }

    // Detect headings (lines that are ALL CAPS, short, or numbered)
    if (isHeading(line)) {
      // Determine heading level based on content
      const level = getHeadingLevel(line);
      processedLines.push(`${"#".repeat(level)} ${line}`);
    }
    // Detect numbered lists
    else if (isNumberedListItem(line)) {
      processedLines.push(`1. ${line.replace(/^\d+\.?\s*/, "")}`);
    }
    // Detect bullet points
    else if (isBulletPoint(line)) {
      processedLines.push(`- ${line.replace(/^[•\-\*]\s*/, "")}`);
    }
    // Regular paragraphs
    else {
      processedLines.push(line);
    }
  }

  return processedLines.join("\n");
}

/**
 * Determine if a line should be treated as a heading
 */
function isHeading(line: string): boolean {
  // Check for common heading patterns
  const headingPatterns = [
    /^[A-Z][A-Z\s]{5,30}$/, // ALL CAPS short lines
    /^CHAPTER\s+\d+/i, // Chapter headings
    /^UNIT\s+\d+/i, // Unit headings
    /^\d+\.\s*[A-Z]/, // Numbered sections (1. Introduction)
    /^[A-Z][a-zA-Z\s]{10,50}:$/, // Title with colon
    /^\d+\.\d+/, // Subsection numbers (1.1, 2.3, etc.)
  ];

  return headingPatterns.some((pattern) => pattern.test(line.trim()));
}

/**
 * Determine heading level (1-6)
 */
function getHeadingLevel(line: string): number {
  // Chapter/Unit level = H1
  if (/^(CHAPTER|UNIT)\s+\d+/i.test(line)) {
    return 1;
  }

  // Main sections = H2
  if (/^[A-Z][A-Z\s]{5,30}$/.test(line) || /^\d+\.\s*[A-Z]/.test(line)) {
    return 2;
  }

  // Subsections = H3
  if (/^\d+\.\d+/.test(line)) {
    return 3;
  }

  // Default to H2
  return 2;
}

/**
 * Check if line is a numbered list item
 */
function isNumberedListItem(line: string): boolean {
  return /^\d+\.?\s+/.test(line);
}

/**
 * Check if line is a bullet point
 */
function isBulletPoint(line: string): boolean {
  return /^[•\-\*]\s+/.test(line);
}

/**
 * Validate parsed content quality
 */
export function validateParsedContent(content: ParsedPDFContent): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if content is too short
  if (content.text.length < 100) {
    errors.push("Extracted text is too short (less than 100 characters)");
  }

  // Check if content has too many non-printable characters
  const nonPrintableRatio =
    (content.text.match(/[^\x20-\x7E\n\r\t]/g) || []).length /
    content.text.length;
  if (nonPrintableRatio > 0.1) {
    warnings.push("High ratio of non-printable characters detected");
  }

  // Check if markdown has proper structure
  if (!content.markdown.includes("#")) {
    warnings.push("No headings detected in the content");
  }

  // Check for pages
  if (content.metadata.pages === 0) {
    errors.push("No pages detected in PDF");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract key information for question generation
 */
export function extractKeyInformation(markdown: string): {
  topics: string[];
  concepts: string[];
  definitions: string[];
} {
  const topics: string[] = [];
  const concepts: string[] = [];
  const definitions: string[] = [];

  const lines = markdown.split("\n");

  for (const line of lines) {
    // Extract headings as topics
    if (line.startsWith("#")) {
      const topic = line.replace(/^#+\s*/, "").trim();
      if (topic && !topics.includes(topic)) {
        topics.push(topic);
      }
    }

    // Extract definitions (lines containing "is defined as", "refers to", etc.)
    if (/\b(is defined as|refers to|means|is the)\b/i.test(line)) {
      const concept = extractConceptFromDefinition(line);
      if (concept && !definitions.includes(concept)) {
        definitions.push(concept);
      }
    }

    // Extract important concepts (capitalized terms, technical terms)
    const conceptMatches = line.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (conceptMatches) {
      conceptMatches.forEach((concept) => {
        if (concept.length > 3 && !concepts.includes(concept)) {
          concepts.push(concept);
        }
      });
    }
  }

  return {
    topics: topics.slice(0, 20), // Limit to top 20
    concepts: concepts.slice(0, 50), // Limit to top 50
    definitions: definitions.slice(0, 30), // Limit to top 30
  };
}

/**
 * Extract concept name from a definition sentence
 */
function extractConceptFromDefinition(sentence: string): string {
  // Look for patterns like "X is defined as..." or "X refers to..."
  const patterns = [
    /^([^,]+)\s+is defined as/i,
    /^([^,]+)\s+refers to/i,
    /^([^,]+)\s+means/i,
    /^([^,]+)\s+is the/i,
  ];

  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}
