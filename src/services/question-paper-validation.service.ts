import { prisma } from "@/lib/prisma";
import { parsePDFToText } from "@/lib/pdf-parser";
import { readFile } from "fs/promises";
import { join } from "path";
import { logger } from "@/lib/logger";

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
}

/**
 * Extract course outcomes from syllabus content
 */
export async function extractCourseOutcomes(
  syllabusContent: string
): Promise<CourseOutcome[]> {
  const outcomes: CourseOutcome[] = [];
  
  // Pattern to match course outcomes like "CO1", "CO2", etc.
  const coPattern = /(?:CO|Course Outcome|Course outcome)\s*(\d+)[:.\s]+(.+?)(?=(?:CO|Course Outcome|Course outcome)\s*\d+|$)/gi;
  
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
      const aiExtracted = await extractCOsWithAI(syllabusContent);
      return aiExtracted;
    } catch (error) {
      logger.warn("QuestionPaperValidation", "AI extraction failed, using fallback", error);
    }
  }
  
  return outcomes;
}

/**
 * Use AI to extract course outcomes from syllabus
 */
async function extractCOsWithAI(content: string): Promise<CourseOutcome[]> {
  const providerType = (process.env.AI_PROVIDER as string) || "OLLAMA";
  const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const defaultModel = process.env.DEFAULT_AI_MODEL || "gemma3:4b";
  
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
    if (providerType === "GEMINI" && process.env.GEMINI_API_KEY) {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: defaultModel,
        contents: prompt,
        config: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 2000,
        },
      });
      
      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } else {
      // Use Ollama
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: defaultModel,
          prompt,
          stream: false,
        }),
      });
      
      const data = await response.json();
      const text = data.response || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    logger.error("QuestionPaperValidation", "AI extraction error", error);
  }
  
  return [];
}

/**
 * Analyze question paper PDF and extract questions with their details
 */
export async function analyzeQuestionPaper(
  pdfContent: string
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
        questionText: line.replace(/^(?:Q|Question)?\s*\d+[:.)\s]+/i, "").trim(),
        marks: extractMarks(line),
        part: inPartA ? "A" : inPartB ? "B" : undefined,
      };
      
      // Try to extract CO and Bloom level from the line
      const coMatch = line.match(/\b(CO\d+)\b/i);
      if (coMatch) {
        currentQuestion.courseOutcome = coMatch[1].toUpperCase();
      }
      
      const bloomMatch = line.match(/\b(REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE)\b/i);
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
      const aiExtracted = await analyzeWithAI(pdfContent);
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
async function analyzeWithAI(content: string): Promise<QuestionAnalysis[]> {
  const providerType = (process.env.AI_PROVIDER as string) || "OLLAMA";
  const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const defaultModel = process.env.DEFAULT_AI_MODEL || "gemma3:4b";
  
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
    if (providerType === "GEMINI" && process.env.GEMINI_API_KEY) {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: defaultModel,
        contents: prompt,
        config: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 4000,
        },
      });
      
      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } else {
      // Use Ollama
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: defaultModel,
          prompt,
          stream: false,
        }),
      });
      
      const data = await response.json();
      const text = data.response || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    logger.error("QuestionPaperValidation", "AI analysis error", error);
  }
  
  return [];
}

/**
 * Validate question paper against course outcomes and requirements
 */
export async function validateQuestionPaper(
  courseId: string,
  questionPaperPath: string
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
      "Syllabus not found or not parsed. Please upload and parse the syllabus first."
    );
  }
  
  // 2. Extract course outcomes from syllabus
  const courseOutcomes = await extractCourseOutcomes(syllabus.parsedContent);
  
  if (courseOutcomes.length === 0) {
    warnings.push("No course outcomes found in syllabus. Validation will be limited.");
  }
  
  // 3. Parse question paper
  const filePath = join(process.cwd(), "src", questionPaperPath);
  const buffer = await readFile(filePath);
  const pdfContent = await parsePDFToText(buffer);
  
  // 4. Analyze questions
  const questions = await analyzeQuestionPaper(pdfContent.text);
  
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
    };
  }
  
  // 5. Calculate mark distribution
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const partAMarks = questions.filter((q) => q.part === "A").reduce((sum, q) => sum + q.marks, 0);
  const partBMarks = questions.filter((q) => q.part === "B").reduce((sum, q) => sum + q.marks, 0);
  
  // Expected total marks (typically 50 for sessional, 100 for end sem)
  const expectedTotal = totalMarks > 50 ? 100 : 50;
  
  if (totalMarks !== expectedTotal) {
    errors.push(
      `Total marks mismatch: Expected ${expectedTotal}, found ${totalMarks}`
    );
  }
  
  // 6. Calculate Bloom's distribution
  const bloomDistribution: { [key: string]: number } = {};
  questions.forEach((q) => {
    if (q.bloomLevel) {
      bloomDistribution[q.bloomLevel] = (bloomDistribution[q.bloomLevel] || 0) + 1;
    } else {
      warnings.push(`Question ${q.questionNumber} has no Bloom's level specified.`);
    }
  });
  
  // 7. Map questions to course outcomes
  const coMapping: { [coCode: string]: { questions: string[]; totalMarks: number } } = {};
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
      `The following course outcomes are not mapped to any question: ${missingCOs.join(", ")}`
    );
  }
  
  // 9. Count unmapped questions
  const unmappedQuestions = questions.filter((q) => !q.courseOutcome).length;
  
  if (unmappedQuestions > 0) {
    warnings.push(
      `${unmappedQuestions} question(s) are not mapped to any course outcome.`
    );
  }
  
  // 10. Validate mark distribution
  const partAQuestions = questions.filter((q) => q.part === "A");
  const partBQuestions = questions.filter((q) => q.part === "B");
  
  // Part A should typically be 2 marks each
  const invalidPartA = partAQuestions.filter((q) => q.marks !== 2);
  if (invalidPartA.length > 0) {
    errors.push(
      `Part A questions should be 2 marks each. Found: ${invalidPartA.map((q) => `Q${q.questionNumber} (${q.marks}M)`).join(", ")}`
    );
  }
  
  // Part B should be 8 or 16 marks
  const invalidPartB = partBQuestions.filter((q) => q.marks !== 8 && q.marks !== 16);
  if (invalidPartB.length > 0) {
    errors.push(
      `Part B questions should be 8 or 16 marks. Found: ${invalidPartB.map((q) => `Q${q.questionNumber} (${q.marks}M)`).join(", ")}`
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
  };
}

