/**
 * AI Question Generation Service
 *
 * This service handles generating questions from course material content
 * using AI models. Currently uses a placeholder implementation but can
 * be extended to use external AI services like Ollama with gemma3:4b.
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
const _SYSTEM_PROMPT = `
You are an expert educational assistant tasked with generating high-quality assessment questions from academic course materials. You will receive parsed course content in Markdown format, along with metadata such as course name, unit number, and material type. Your goal is to generate questions that are pedagogically sound, categorized by Bloom's taxonomy, difficulty level, and question type.

Difficulty Level Guidelines:
- Easy: Recall-based, straightforward questions. Typically aligned with Bloom's "Remember" or "Understand".
- Medium: Requires comprehension and application. May involve basic problem-solving or interpretation.
- Hard: Requires analysis, synthesis, or evaluation. Often open-ended or multi-step.

Bloom's Taxonomy Examples:
- Remember: Define concepts, list facts
- Understand: Explain concepts using examples
- Apply: Use concepts to solve problems
- Analyze: Compare and contrast, break down components
- Evaluate: Assess validity, make judgments
- Create: Design solutions, formulate new ideas

Question Type Examples:
- Direct: Straightforward questions asking for specific information
- Indirect: Questions that require inference or interpretation
- Scenario-based: Questions set in real-world contexts
- Problem-based: Questions requiring multi-step problem solving

Generate questions that are clear, unambiguous, and aligned with the specified parameters.
`;

/**
 * Generate questions using AI service
 *
 * TODO: Replace this placeholder with actual AI model integration
 * Options:
 * 1. Docker-based Ollama with gemma3:4b
 * 2. OpenAI API
 * 3. Other LLM providers
 */
export async function generateQuestionsWithAI(
  params: QuestionGenerationParams
): Promise<GeneratedQuestion[]> {
  // Placeholder implementation - replace with actual AI service
  const questions: GeneratedQuestion[] = [];

  // Calculate distribution of questions
  const totalQuestions =
    params.questionCounts.easy +
    params.questionCounts.medium +
    params.questionCounts.hard;

  if (totalQuestions === 0) {
    return questions;
  }

  // Generate easy questions
  for (let i = 0; i < params.questionCounts.easy; i++) {
    questions.push({
      question_text: `What is the main concept discussed in "${
        params.materialName
      }"? (Easy Question ${i + 1})`,
      answer_text: `The main concept relates to the fundamental principles covered in unit ${params.unit} of ${params.courseName}.`,
      difficulty_level: "EASY",
      bloom_level: "REMEMBER",
      question_type: "DIRECT",
      marks: "TWO",
      unit_number: params.unit,
      course_name: params.courseName,
      material_name: params.materialName,
    });
  }

  // Generate medium questions
  for (let i = 0; i < params.questionCounts.medium; i++) {
    questions.push({
      question_text: `Explain how the concepts from "${
        params.materialName
      }" can be applied in real-world scenarios. (Medium Question ${i + 1})`,
      answer_text: `The concepts can be applied by understanding the underlying principles and implementing them in practical situations as discussed in the material.`,
      difficulty_level: "MEDIUM",
      bloom_level: "UNDERSTAND",
      question_type: "INDIRECT",
      marks: "EIGHT",
      unit_number: params.unit,
      course_name: params.courseName,
      material_name: params.materialName,
    });
  }

  // Generate hard questions
  for (let i = 0; i < params.questionCounts.hard; i++) {
    questions.push({
      question_text: `Analyze and evaluate the effectiveness of the methodologies presented in "${
        params.materialName
      }". Provide a critical assessment with examples. (Hard Question ${
        i + 1
      })`,
      answer_text: `A comprehensive analysis should consider multiple factors including theoretical foundation, practical applicability, limitations, and comparative advantages as outlined in the course material.`,
      difficulty_level: "HARD",
      bloom_level: "ANALYZE",
      question_type: "SCENARIO_BASED",
      marks: "SIXTEEN",
      unit_number: params.unit,
      course_name: params.courseName,
      material_name: params.materialName,
    });
  }

  return questions;
}

/**
 * Call external AI service (placeholder for Docker/Ollama integration)
 */
async function _callAIService(
  _prompt: string,
  _materialContent: string
): Promise<string> {
  // TODO: Implement actual AI service call
  // Example for Ollama Docker setup:
  /*
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemma3:4b',
      prompt: `${SYSTEM_PROMPT}\n\nCourse Material:\n${materialContent}\n\nUser Request:\n${prompt}`,
      stream: false,
    }),
  });
  
  const data = await response.json();
  return data.response;
  */

  return "Placeholder AI response";
}

/**
 * Parse AI response into structured questions
 */
function _parseAIResponse(_response: string): GeneratedQuestion[] {
  // TODO: Implement proper parsing of AI-generated questions
  // The AI should return JSON-formatted questions that match the GeneratedQuestion interface

  return [];
}

/**
 * Validate generated questions
 */
export function validateGeneratedQuestions(
  questions: GeneratedQuestion[]
): boolean {
  return questions.every(
    (q) =>
      q.question_text &&
      q.answer_text &&
      q.difficulty_level &&
      q.bloom_level &&
      q.question_type
  );
}
