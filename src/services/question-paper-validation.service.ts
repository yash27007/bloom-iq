import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateAIText } from "@/services/ai";

export interface CourseOutcome {
  code: string; // e.g., "CO1", "CO2"
  description: string;
}

export interface QuestionAnalysis {
  questionNumber: string;
  questionText: string;
  marks: number;
  bloomLevel?: string;
  courseOutcome?: string;
  part?: "A" | "B";
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  courseOutcomes: CourseOutcome[];
  questions: QuestionAnalysis[];
  markDistribution: {
    total: number;
    partA: number;
    partB: number;
    expectedTotal: number;
  };
  bloomDistribution: {
    [key: string]: number;
  };
  coMapping: {
    [coCode: string]: {
      questions: string[];
      totalMarks: number;
    };
  };
  summary: {
    totalQuestions: number;
    totalMarks: number;
    missingCOs: string[];
    unmappedQuestions: number;
  };
  complianceReport: ComplianceReport;
}

export interface ComplianceReportItem {
  questionNumber: string;
  questionText: string;
  current: {
    marks: number;
    part?: "A" | "B";
    bloomLevel?: string;
    courseOutcome?: string;
  };
  issues: string[];
  suggestions: string[];
  suggestedMarks?: number;
  suggestedBloomLevel?: string;
  suggestedCourseOutcome?: string;
  isCompliant: boolean;
}

export interface ComplianceReport {
  generatedAt: string;
  overallComplianceScore: number;
  totalIssueCount: number;
  items: ComplianceReportItem[];
  generalRecommendations: string[];
}

const BLOOM_LEVELS = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
  "EVALUATE",
  "CREATE",
] as const;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "what",
  "when",
  "where",
  "which",
  "explain",
  "describe",
  "discuss",
  "write",
  "about",
]);

function normalizeBloomLevel(level?: string): string | undefined {
  if (!level) return undefined;
  const normalized = level.trim().toUpperCase();
  return BLOOM_LEVELS.includes(normalized as (typeof BLOOM_LEVELS)[number])
    ? normalized
    : undefined;
}

function getAllowedBloomLevels(marks: number): string[] {
  if (marks <= 2) return ["REMEMBER", "UNDERSTAND", "APPLY"];
  if (marks <= 8) return ["UNDERSTAND", "APPLY", "ANALYZE"];
  return ["APPLY", "ANALYZE", "EVALUATE", "CREATE"];
}

function getSuggestedBloomLevel(marks: number): string {
  if (marks <= 2) return "UNDERSTAND";
  if (marks <= 8) return "ANALYZE";
  return "EVALUATE";
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

function inferBestCourseOutcome(
  questionText: string,
  courseOutcomes: CourseOutcome[],
): string | undefined {
  if (courseOutcomes.length === 0) return undefined;

  const questionTokens = new Set(tokenize(questionText));
  if (questionTokens.size === 0) return courseOutcomes[0]?.code;

  let bestMatch: { code: string; score: number } | null = null;

  for (const outcome of courseOutcomes) {
    const outcomeTokens = tokenize(outcome.description);
    const overlap = outcomeTokens.filter((token) =>
      questionTokens.has(token),
    ).length;
    const score = overlap / Math.max(outcomeTokens.length, 1);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { code: outcome.code, score };
    }
  }

  return bestMatch?.code || courseOutcomes[0]?.code;
}

/**
 * Extract course outcomes from syllabus content
 */
export async function extractCourseOutcomes(
  syllabusContent: string,
  provider?: "GEMINI" | "OLLAMA",
): Promise<CourseOutcome[]> {
  const outcomes: CourseOutcome[] = [];

  // Pattern to match course outcomes like "CO1", "CO2", etc.
  const coPattern =
    /(?:CO|Course Outcome|Course outcome)\s*(\d+)[:.\s]+(.+?)(?=(?:CO|Course Outcome|Course outcome)\s*\d+|$)/gi;

  let match;
  while ((match = coPattern.exec(syllabusContent)) !== null) {
    const code = `CO${match[1]}`;
    const description = match[2].trim().replace(/\n+/g, " ").trim();

    if (description.length > 10) {
      // Avoid duplicates
      if (!outcomes.find((o) => o.code === code)) {
        outcomes.push({ code, description });
      }
    }
  }

  // If no pattern matches, try AI extraction
  if (outcomes.length === 0) {
    try {
      const aiExtracted = await extractCOsWithAI(syllabusContent, provider);
      return aiExtracted;
    } catch (error) {
      logger.warn(
        "QuestionPaperValidation",
        "AI extraction failed, using fallback",
        error,
      );
    }
  }

  return outcomes;
}

/**
 * Use AI to extract course outcomes from syllabus
 */
async function extractCOsWithAI(
  content: string,
  provider?: "GEMINI" | "OLLAMA",
): Promise<CourseOutcome[]> {
  const prompt = `Extract all Course Outcomes (COs) from the following syllabus text. Course Outcomes are typically numbered as CO1, CO2, CO3, etc., and describe what students should be able to do after completing the course.

Return ONLY a valid JSON array in this format:
[
  {"code": "CO1", "description": "Description of CO1"},
  {"code": "CO2", "description": "Description of CO2"}
]

Syllabus text:
${content.substring(0, 5000)} // Limit to first 5000 chars

Return ONLY the JSON array, no other text.`;

  try {
    const text = await generateAIText(prompt, {
      provider,
      temperature: 0.3,
      topP: 0.8,
      maxTokens: 2000,
    });
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    logger.error(
      "QuestionPaperValidation",
      "AI extraction error",
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  return [];
}

/**
 * Analyze question paper PDF and extract questions with their details
 */
export async function analyzeQuestionPaper(
  pdfContent: string,
  provider?: "GEMINI" | "OLLAMA",
): Promise<QuestionAnalysis[]> {
  const questions: QuestionAnalysis[] = [];

  // Split into lines for processing
  const lines = pdfContent.split("\n");

  let currentQuestion: Partial<QuestionAnalysis> | null = null;
  let inPartA = false;
  let inPartB = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect Part A or Part B
    if (/^PART\s*[A-Z]|^Part\s*[A-Z]/i.test(line)) {
      if (/PART\s*A|Part\s*A/i.test(line)) {
        inPartA = true;
        inPartB = false;
      } else if (/PART\s*B|Part\s*B/i.test(line)) {
        inPartA = false;
        inPartB = true;
      }
      continue;
    }

    // Detect question numbers (Q1, Q2, 1., etc.)
    const questionMatch = line.match(/^(?:Q|Question)?\s*(\d+)[:.)\s]+/i);
    if (questionMatch) {
      // Save previous question if exists
      if (currentQuestion && currentQuestion.questionText) {
        questions.push({
          questionNumber: currentQuestion.questionNumber || "",
          questionText: currentQuestion.questionText,
          marks: currentQuestion.marks || 0,
          bloomLevel: currentQuestion.bloomLevel,
          courseOutcome: currentQuestion.courseOutcome,
          part: inPartA ? "A" : inPartB ? "B" : undefined,
        });
      }

      // Start new question
      currentQuestion = {
        questionNumber: questionMatch[1],
        questionText: line
          .replace(/^(?:Q|Question)?\s*\d+[:.)\s]+/i, "")
          .trim(),
        marks: extractMarks(line),
        part: inPartA ? "A" : inPartB ? "B" : undefined,
      };

      // Try to extract CO and Bloom level from the line
      const coMatch = line.match(/\b(CO\d+)\b/i);
      if (coMatch) {
        currentQuestion.courseOutcome = coMatch[1].toUpperCase();
      }

      const bloomMatch = line.match(
        /\b(REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE)\b/i,
      );
      if (bloomMatch) {
        currentQuestion.bloomLevel = bloomMatch[1].toUpperCase();
      }
    } else if (currentQuestion) {
      // Continue building question text
      if (line.length > 0) {
        currentQuestion.questionText += " " + line;
      }
    }
  }

  // Add last question
  if (currentQuestion && currentQuestion.questionText) {
    questions.push({
      questionNumber: currentQuestion.questionNumber || "",
      questionText: currentQuestion.questionText,
      marks: currentQuestion.marks || 0,
      bloomLevel: currentQuestion.bloomLevel,
      courseOutcome: currentQuestion.courseOutcome,
      part: currentQuestion.part,
    });
  }

  // If pattern matching didn't work well, try AI extraction
  if (questions.length === 0) {
    try {
      const aiExtracted = await analyzeWithAI(pdfContent, provider);
      return aiExtracted;
    } catch (error) {
      logger.warn("QuestionPaperValidation", "AI analysis failed", error);
    }
  }

  return questions;
}

/**
 * Extract marks from text (e.g., "2 marks", "(2M)", etc.)
 */
function extractMarks(text: string): number {
  const patterns = [
    /(\d+)\s*marks?/i,
    /\((\d+)\s*M\)/i,
    /\[(\d+)\s*M\]/i,
    /(\d+)\s*M/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return 0;
}

/**
 * Use AI to analyze question paper
 */
async function analyzeWithAI(
  content: string,
  provider?: "GEMINI" | "OLLAMA",
): Promise<QuestionAnalysis[]> {
  const prompt = `Analyze the following question paper and extract all questions with their details.

For each question, extract:
- questionNumber: The question number (e.g., "1", "2", "Q1", etc.)
- questionText: The full question text
- marks: The marks allocated (2, 8, or 16)
- bloomLevel: The Bloom's taxonomy level if mentioned (REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE)
- courseOutcome: The Course Outcome code if mentioned (CO1, CO2, etc.)
- part: "A" for Part A questions, "B" for Part B questions

Return ONLY a valid JSON array in this format:
[
  {
    "questionNumber": "1",
    "questionText": "Full question text here",
    "marks": 2,
    "bloomLevel": "REMEMBER",
    "courseOutcome": "CO1",
    "part": "A"
  }
]

Question Paper:
${content.substring(0, 8000)} // Limit to first 8000 chars

Return ONLY the JSON array, no other text.`;

  try {
    const text = await generateAIText(prompt, {
      provider,
      temperature: 0.3,
      topP: 0.8,
      maxTokens: 4000,
    });
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    logger.error(
      "QuestionPaperValidation",
      "AI analysis error",
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  return [];
}

/**
 * Validate question paper against course outcomes and requirements
 */
export async function validateQuestionPaper(
  courseId: string,
  questionPaperContent: string, // Pre-parsed question paper text
  provider?: "GEMINI" | "OLLAMA",
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check if syllabus exists
  const syllabus = await prisma.course_Material.findFirst({
    where: {
      courseId,
      materialType: "SYLLABUS",
      parsingStatus: "COMPLETED",
    },
  });

  if (!syllabus || !syllabus.parsedContent) {
    throw new Error(
      "Syllabus not found or not parsed. Please upload and parse the syllabus first.",
    );
  }

  // 2. Extract course outcomes from syllabus
  const courseOutcomes = await extractCourseOutcomes(
    syllabus.parsedContent,
    provider,
  );

  if (courseOutcomes.length === 0) {
    warnings.push(
      "No course outcomes found in syllabus. Validation will be limited.",
    );
  }

  // 3. Analyze questions (content already parsed)
  const questions = await analyzeQuestionPaper(questionPaperContent, provider);

  if (questions.length === 0) {
    errors.push("No questions found in the question paper.");
    return {
      isValid: false,
      errors,
      warnings,
      courseOutcomes,
      questions: [],
      markDistribution: { total: 0, partA: 0, partB: 0, expectedTotal: 0 },
      bloomDistribution: {},
      coMapping: {},
      summary: {
        totalQuestions: 0,
        totalMarks: 0,
        missingCOs: [],
        unmappedQuestions: 0,
      },
      complianceReport: {
        generatedAt: new Date().toISOString(),
        overallComplianceScore: 0,
        totalIssueCount: 0,
        items: [],
        generalRecommendations: [
          "No questions could be extracted from the uploaded paper. Ensure the PDF is text-based and clearly structured.",
        ],
      },
    };
  }

  // 5. Calculate mark distribution
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const partAMarks = questions
    .filter((q) => q.part === "A")
    .reduce((sum, q) => sum + q.marks, 0);
  const partBMarks = questions
    .filter((q) => q.part === "B")
    .reduce((sum, q) => sum + q.marks, 0);

  // Expected total marks (typically 50 for sessional, 100 for end sem)
  const expectedTotal = totalMarks > 50 ? 100 : 50;

  if (totalMarks !== expectedTotal) {
    errors.push(
      `Total marks mismatch: Expected ${expectedTotal}, found ${totalMarks}`,
    );
  }

  // 6. Calculate Bloom's distribution
  const bloomDistribution: { [key: string]: number } = {};
  questions.forEach((q) => {
    if (q.bloomLevel) {
      bloomDistribution[q.bloomLevel] =
        (bloomDistribution[q.bloomLevel] || 0) + 1;
    } else {
      warnings.push(
        `Question ${q.questionNumber} has no Bloom's level specified.`,
      );
    }
  });

  // 7. Map questions to course outcomes
  const coMapping: {
    [coCode: string]: { questions: string[]; totalMarks: number };
  } = {};
  const coCodes = courseOutcomes.map((co) => co.code);

  questions.forEach((q) => {
    if (q.courseOutcome) {
      const co = q.courseOutcome.toUpperCase();
      if (!coMapping[co]) {
        coMapping[co] = { questions: [], totalMarks: 0 };
      }
      coMapping[co].questions.push(q.questionNumber);
      coMapping[co].totalMarks += q.marks;
    }
  });

  // 8. Check for missing COs
  const mappedCOs = Object.keys(coMapping);
  const missingCOs = coCodes.filter((co) => !mappedCOs.includes(co));

  if (missingCOs.length > 0) {
    warnings.push(
      `The following course outcomes are not mapped to any question: ${missingCOs.join(", ")}`,
    );
  }

  // 9. Count unmapped questions
  const unmappedQuestions = questions.filter((q) => !q.courseOutcome).length;

  if (unmappedQuestions > 0) {
    warnings.push(
      `${unmappedQuestions} question(s) are not mapped to any course outcome.`,
    );
  }

  // 10. Validate mark distribution
  const partAQuestions = questions.filter((q) => q.part === "A");
  const partBQuestions = questions.filter((q) => q.part === "B");

  // Part A should typically be 2 marks each
  const invalidPartA = partAQuestions.filter((q) => q.marks !== 2);
  if (invalidPartA.length > 0) {
    errors.push(
      `Part A questions should be 2 marks each. Found: ${invalidPartA.map((q) => `Q${q.questionNumber} (${q.marks}M)`).join(", ")}`,
    );
  }

  // Part B should be 8 or 16 marks
  const invalidPartB = partBQuestions.filter(
    (q) => q.marks !== 8 && q.marks !== 16,
  );
  if (invalidPartB.length > 0) {
    errors.push(
      `Part B questions should be 8 or 16 marks. Found: ${invalidPartB.map((q) => `Q${q.questionNumber} (${q.marks}M)`).join(", ")}`,
    );
  }

  // 11. Build detailed compliance report with improvements per question
  const complianceItems: ComplianceReportItem[] = [];
  const coCodeSet = new Set(coCodes.map((code) => code.toUpperCase()));
  let totalChecks = 0;
  let passedChecks = 0;

  for (const question of questions) {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let suggestedMarks: number | undefined;
    let suggestedBloomLevel: string | undefined;
    let suggestedCourseOutcome: string | undefined;

    // Check marks compliance
    totalChecks += 1;
    let marksCompliant = true;

    if (question.part === "A" && question.marks !== 2) {
      marksCompliant = false;
      issues.push(
        `Part A question should carry 2 marks, but found ${question.marks}.`,
      );
      suggestedMarks = 2;
      suggestions.push(
        "Set this question to 2 marks to match Part A requirements.",
      );
    }

    if (
      question.part === "B" &&
      question.marks !== 8 &&
      question.marks !== 16
    ) {
      marksCompliant = false;
      issues.push(
        `Part B question should carry 8 or 16 marks, but found ${question.marks}.`,
      );
      suggestedMarks = 16;
      suggestions.push(
        "Set this question to 8 or 16 marks based on the approved pattern.",
      );
    }

    if (question.marks <= 0) {
      marksCompliant = false;
      issues.push("Marks are missing or could not be extracted.");
      suggestedMarks =
        question.part === "A" ? 2 : question.part === "B" ? 16 : 8;
      suggestions.push(
        "Add explicit marks (e.g., 2M/8M/16M) in the question statement.",
      );
    }

    if (marksCompliant) {
      passedChecks += 1;
    }

    // Check Bloom's level compliance
    totalChecks += 1;
    const normalizedBloom = normalizeBloomLevel(question.bloomLevel);
    const allowedBlooms = getAllowedBloomLevels(question.marks);

    if (!normalizedBloom) {
      suggestedBloomLevel = getSuggestedBloomLevel(
        question.marks || (question.part === "A" ? 2 : 8),
      );
      issues.push("Bloom level is missing or invalid.");
      suggestions.push(`Add a Bloom level tag such as ${suggestedBloomLevel}.`);
    } else if (!allowedBlooms.includes(normalizedBloom)) {
      suggestedBloomLevel = getSuggestedBloomLevel(
        question.marks || (question.part === "A" ? 2 : 8),
      );
      issues.push(
        `Bloom level ${normalizedBloom} is not well-aligned for ${question.marks} marks.`,
      );
      suggestions.push(
        `Use one of these levels for ${question.marks} marks: ${allowedBlooms.join(", ")}.`,
      );
    } else {
      passedChecks += 1;
    }

    // Check CO mapping compliance (only when COs exist in syllabus)
    if (coCodes.length > 0) {
      totalChecks += 1;
      const normalizedCO = question.courseOutcome?.toUpperCase();

      if (!normalizedCO) {
        suggestedCourseOutcome = inferBestCourseOutcome(
          question.questionText,
          courseOutcomes,
        );
        issues.push("Course outcome mapping is missing.");
        if (suggestedCourseOutcome) {
          suggestions.push(
            `Map this question to ${suggestedCourseOutcome} based on syllabus outcomes.`,
          );
        }
      } else if (!coCodeSet.has(normalizedCO)) {
        suggestedCourseOutcome = inferBestCourseOutcome(
          question.questionText,
          courseOutcomes,
        );
        issues.push(
          `Mapped CO (${normalizedCO}) is not present in the syllabus outcomes.`,
        );
        if (suggestedCourseOutcome) {
          suggestions.push(`Remap this question to ${suggestedCourseOutcome}.`);
        }
      } else {
        passedChecks += 1;
      }
    }

    complianceItems.push({
      questionNumber: question.questionNumber,
      questionText: question.questionText,
      current: {
        marks: question.marks,
        part: question.part,
        bloomLevel: question.bloomLevel,
        courseOutcome: question.courseOutcome,
      },
      issues,
      suggestions,
      suggestedMarks,
      suggestedBloomLevel,
      suggestedCourseOutcome,
      isCompliant: issues.length === 0,
    });
  }

  const totalIssueCount = complianceItems.reduce(
    (sum, item) => sum + item.issues.length,
    0,
  );
  const overallComplianceScore =
    totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  const generalRecommendations: string[] = [];
  if (errors.length > 0) {
    generalRecommendations.push(
      "Resolve mark distribution errors before finalizing the paper.",
    );
  }
  if (missingCOs.length > 0) {
    generalRecommendations.push(
      `Include at least one question mapped to each missing outcome: ${missingCOs.join(", ")}.`,
    );
  }
  if (Object.keys(bloomDistribution).length < 3) {
    generalRecommendations.push(
      "Improve Bloom taxonomy spread by including more mid/high-order cognitive levels.",
    );
  }
  if (totalIssueCount === 0) {
    generalRecommendations.push(
      "Question paper is compliant with current checks. Proceed to final review and approval.",
    );
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    courseOutcomes,
    questions,
    markDistribution: {
      total: totalMarks,
      partA: partAMarks,
      partB: partBMarks,
      expectedTotal,
    },
    bloomDistribution,
    coMapping,
    summary: {
      totalQuestions: questions.length,
      totalMarks,
      missingCOs,
      unmappedQuestions,
    },
    complianceReport: {
      generatedAt: new Date().toISOString(),
      overallComplianceScore,
      totalIssueCount,
      items: complianceItems,
      generalRecommendations,
    },
  };
}
