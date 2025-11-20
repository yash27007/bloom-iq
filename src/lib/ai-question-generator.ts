/**
 * AI Question Generation Service
 *
 * Uses Docker Model Runner with ai/gemma3:4B model
 * API Reference: https://docs.docker.com/ai/model-runner/api-reference/
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
 * Get Docker Model Runner endpoint
 * From container: http://model-runner.docker.internal/
 * From host: http://localhost:12434/
 */
function getModelRunnerUrl(): string {
  // Check if running in Docker container
  const envUrl = process.env.DOCKER_MODEL_RUNNER_URL;
  if (envUrl) {
    return envUrl;
  }

  // Default to internal Docker network
  return "http://model-runner.docker.internal";
}

/**
 * System prompt for AI question generation
 * Based on: MANGALAM ACADEMY OF HIGHER EDUCATION question paper format
 */
const SYSTEM_PROMPT = `You are an expert educational assessment designer for MANGALAM ACADEMY OF HIGHER EDUCATION. Your task is to generate high-quality university examination questions following strict academic standards.

QUESTION PAPER FORMAT (University Standard):
Part A: Short Answer Questions (CO Mapping)
Part B: Essay Questions (CO Mapping)

QUESTION STRUCTURE REQUIREMENTS:
1. Each question MUST clearly state:
   - Question text (clear, unambiguous, academically rigorous)
   - Complete answer (detailed, accurate, pedagogically sound)
   - Marks allocation (2, 8, or 16 marks)
   - Course Outcome (CO) mapping
   - Bloom's Taxonomy level
   - Difficulty level

2. MARKS ALLOCATION GUIDELINES:
   - TWO marks: Short answer, definition, list, brief explanation (50-100 words)
     * Examples: "Define X", "List the types of Y", "What is Z?"
   - EIGHT marks: Detailed explanation, comparison, problem solving (400-600 words)
     * Examples: "Explain the process of X", "Compare Y and Z", "Demonstrate how..."
   - SIXTEEN marks: Comprehensive analysis, design, evaluation (800-1200 words)
     * Examples: "Analyze and evaluate X", "Design a system for Y", "Critically assess..."

3. BLOOM'S TAXONOMY LEVELS (CO Mapping):
   - REMEMBER (CO1): Define, list, recall, identify, name, state
   - UNDERSTAND (CO1-CO2): Explain, describe, summarize, interpret, discuss, demonstrate
   - APPLY (CO2-CO3): Calculate, solve, implement, use, demonstrate, show
   - ANALYZE (CO3-CO4): Compare, contrast, examine, break down, differentiate, investigate
   - EVALUATE (CO4-CO5): Assess, judge, critique, justify, recommend, argue
   - CREATE (CO5): Design, formulate, construct, propose, develop, plan

4. QUESTION TYPES:
   - DIRECT: Straightforward questions ("Define...", "What is...", "List...")
   - INDIRECT: Inferential questions ("Explain how...", "Why does...", "What would happen if...")
   - SCENARIO_BASED: Real-world application with context ("Given a scenario where...", "In a situation...")
   - PROBLEM_BASED: Multi-step problem solving ("Solve the following...", "Design a solution...", "Develop an algorithm...")

5. DIFFICULTY LEVELS:
   - EASY: Recall and basic understanding (typically CO1, 2 marks)
     * Focus on definitions, basic concepts, simple facts
   - MEDIUM: Application and analysis (typically CO2-CO4, 8 marks)
     * Requires understanding, application, comparison
   - HARD: Evaluation and creation (typically CO4-CO5, 16 marks)
     * Demands critical thinking, synthesis, original solutions

6. ANSWER REQUIREMENTS:
   - Answers must be complete, accurate, and exam-ready
   - Include key points, explanations, examples, diagrams (where appropriate)
   - Match the marks allocation exactly (2 marks = 50-100 words, 8 marks = 400-600 words, 16 marks = 800-1200 words)
   - Use academic language, proper terminology, and structured format
   - Provide sufficient detail for a student to score full marks

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON array. NO additional text, NO markdown, NO explanations.
Each question object must have ALL these fields:
{
  "question_text": "Complete question with proper academic phrasing",
  "answer_text": "Complete, detailed answer suitable for exam evaluation",
  "marks": "TWO" | "EIGHT" | "SIXTEEN",
  "difficulty_level": "EASY" | "MEDIUM" | "HARD",
  "bloom_level": "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE",
  "question_type": "DIRECT" | "INDIRECT" | "SCENARIO_BASED" | "PROBLEM_BASED",
  "unit_number": <number>,
  "course_name": "<course name>",
  "material_name": "<material name>"
}

QUALITY STANDARDS:
✓ Questions must be grammatically correct and professionally formatted
✓ Avoid ambiguous, trick, or poorly worded questions
✓ Ensure answers are complete and verifiable from the source material
✓ Maintain academic integrity and appropriate difficulty progression
✓ Balance coverage across different topics in the material
✓ Use clear, precise language suitable for university-level assessment

CRITICAL: Return ONLY the JSON array. Do not include \`\`\`json or any other text.`;

/**
 * Generate questions using Docker Model Runner OpenAI-compatible API
 */
export async function generateQuestionsWithAI(
  params: QuestionGenerationParams
): Promise<GeneratedQuestion[]> {
  const baseUrl = getModelRunnerUrl();
  const modelName = process.env.DEFAULT_AI_MODEL || "ai/gemma3:4B";

  // Build user prompt with detailed requirements
  const userPrompt = buildUserPrompt(params);

  console.log("🤖 Generating questions with AI model:", modelName);
  console.log("📡 Using endpoint:", baseUrl);

  try {
    // Use OpenAI-compatible chat completions endpoint
    // Docs: https://docs.docker.com/ai/model-runner/api-reference/#available-openai-endpoints
    const response = await fetch(
      `${baseUrl}/engines/llama.cpp/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 16000, // Large context for detailed responses
          top_p: 0.9,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Model Runner API error:", errorText);
      throw new Error(
        `Model Runner API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Model Runner response");
    }

    console.log("✅ Received response from AI model");

    // Parse JSON response
    const questions = parseAIResponse(content);

    console.log(`✅ Successfully parsed ${questions.length} questions`);

    // Validate and return
    return questions.map((q) => ({
      ...q,
      unit_number: params.unit,
      course_name: params.courseName,
      material_name: params.materialName,
    }));
  } catch (error) {
    console.error("❌ AI question generation error:", error);

    // Fallback to mock questions in development
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ Falling back to mock questions");
      return generateMockQuestions(params);
    }

    throw new Error(
      `Failed to generate questions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Build detailed user prompt with all parameters
 */
function buildUserPrompt(params: QuestionGenerationParams): string {
  const {
    materialContent,
    courseName,
    materialName,
    unit,
    questionCounts,
    bloomLevels,
    questionTypes,
  } = params;

  const totalQuestions =
    questionCounts.easy + questionCounts.medium + questionCounts.hard;

  // Truncate material content if too long (keep within context window)
  const maxContentLength = 50000; // characters
  const truncatedContent =
    materialContent.length > maxContentLength
      ? materialContent.substring(0, maxContentLength) +
        "\n\n[Content truncated for length...]"
      : materialContent;

  return `Generate exactly ${totalQuestions} university examination questions based on the following course material.

COURSE INFORMATION:
- Course: ${courseName}
- Material: ${materialName}
- Unit: ${unit}

DISTRIBUTION REQUIREMENTS:
Difficulty Levels:
- Easy: ${questionCounts.easy} questions (2 marks each - short answer)
- Medium: ${questionCounts.medium} questions (8 marks each - detailed explanation)
- Hard: ${questionCounts.hard} questions (16 marks each - comprehensive analysis)

Bloom's Taxonomy Distribution:
- Remember: ${bloomLevels.remember} questions
- Understand: ${bloomLevels.understand} questions
- Apply: ${bloomLevels.apply} questions
- Analyze: ${bloomLevels.analyze} questions
- Evaluate: ${bloomLevels.evaluate} questions
- Create: ${bloomLevels.create} questions

Question Types:
- Direct: ${questionTypes.direct} questions
- Indirect: ${questionTypes.indirect} questions
- Scenario-based: ${questionTypes.scenarioBased} questions
- Problem-based: ${questionTypes.problemBased} questions

COURSE MATERIAL CONTENT:
${truncatedContent}

INSTRUCTIONS:
1. Generate EXACTLY ${totalQuestions} questions that match the distribution requirements
2. Base ALL questions strictly on the provided course material
3. Provide COMPLETE, DETAILED answers for each question
4. Ensure answers match the marks allocation (2/8/16 marks)
5. Return ONLY a valid JSON array with NO additional text
6. Each question object must include all required fields

Generate the questions now.`;
}

/**
 * Parse AI response and extract questions
 */
function parseAIResponse(content: string): GeneratedQuestion[] {
  try {
    // Remove markdown code fences if present
    let cleaned = content.trim();

    // Remove various markdown wrappers
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }

    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    cleaned = cleaned.trim();

    // Try to find JSON array if wrapped in text
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // Parse JSON
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    if (questions.length === 0) {
      throw new Error("No questions generated");
    }

    // Validate and normalize each question
    return questions.map((q, index) => {
      if (!q.question_text || !q.answer_text) {
        throw new Error(
          `Question ${
            index + 1
          } missing required fields (question_text or answer_text)`
        );
      }

      return {
        question_text: String(q.question_text).trim(),
        answer_text: String(q.answer_text).trim(),
        difficulty_level: (
          q.difficulty_level || "MEDIUM"
        ).toUpperCase() as GeneratedQuestion["difficulty_level"],
        bloom_level: (
          q.bloom_level || "UNDERSTAND"
        ).toUpperCase() as GeneratedQuestion["bloom_level"],
        question_type: (q.question_type || "DIRECT")
          .toUpperCase()
          .replace(/-/g, "_") as GeneratedQuestion["question_type"],
        marks: (q.marks || "EIGHT").toUpperCase() as GeneratedQuestion["marks"],
        unit_number: q.unit_number || 0,
        course_name: q.course_name || "",
        material_name: q.material_name || "",
      };
    });
  } catch (error) {
    console.error("❌ Failed to parse AI response:", error);
    console.error("Raw content (first 500 chars):", content.substring(0, 500));
    throw new Error(
      `Invalid JSON response from AI model: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Fallback/mock question generator for development
 * Used when AI service is not available
 */
export function generateMockQuestions(
  params: QuestionGenerationParams
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  let questionNumber = 1;

  const {
    courseName,
    materialName,
    unit,
    questionCounts,
    bloomLevels,
    questionTypes,
  } = params;

  // Helper functions
  const getMarksForDifficulty = (
    difficulty: GeneratedQuestion["difficulty_level"]
  ): GeneratedQuestion["marks"] => {
    if (difficulty === "EASY") return "TWO";
    if (difficulty === "MEDIUM") return "EIGHT";
    return "SIXTEEN";
  };

  const bloomLevelArray: GeneratedQuestion["bloom_level"][] = [
    "REMEMBER",
    "UNDERSTAND",
    "APPLY",
    "ANALYZE",
    "EVALUATE",
    "CREATE",
  ];
  const questionTypeArray: GeneratedQuestion["question_type"][] = [
    "DIRECT",
    "INDIRECT",
    "SCENARIO_BASED",
    "PROBLEM_BASED",
  ];

  // Generate questions by difficulty
  const generateByDifficulty = (
    difficulty: GeneratedQuestion["difficulty_level"],
    count: number
  ) => {
    for (let i = 0; i < count; i++) {
      const bloom = bloomLevelArray[i % bloomLevelArray.length];
      const type = questionTypeArray[i % questionTypeArray.length];
      const marks = getMarksForDifficulty(difficulty);

      let question_text = "";
      let answer_text = "";

      // Generate appropriate question and answer based on difficulty
      if (difficulty === "EASY") {
        question_text = `[Mock ${difficulty}] Define the key concepts from ${materialName} related to ${courseName}. (Question ${questionNumber})`;
        answer_text = `This is a ${marks}-mark answer. The key concepts include fundamental definitions and basic principles as covered in Unit ${unit}.`;
      } else if (difficulty === "MEDIUM") {
        question_text = `[Mock ${difficulty}] Explain how the concepts from ${materialName} can be applied in practical scenarios. Provide examples. (Question ${questionNumber})`;
        answer_text = `This is a ${marks}-mark answer requiring detailed explanation. The concepts can be applied by understanding underlying principles and implementing them systematically, as demonstrated in the course material from Unit ${unit}.`;
      } else {
        question_text = `[Mock ${difficulty}] Critically analyze and evaluate the methodologies presented in ${materialName}. Design a comprehensive solution addressing potential limitations. (Question ${questionNumber})`;
        answer_text = `This is a ${marks}-mark answer requiring comprehensive analysis. A thorough evaluation must consider theoretical foundations, practical implications, comparative analysis, identified limitations, and proposed solutions, all grounded in the material from Unit ${unit} of ${courseName}.`;
      }

      questions.push({
        question_text,
        answer_text,
        difficulty_level: difficulty,
        bloom_level: bloom,
        question_type: type,
        marks,
        unit_number: unit,
        course_name: courseName,
        material_name: materialName,
      });

      questionNumber++;
    }
  };

  // Generate questions
  generateByDifficulty("EASY", questionCounts.easy);
  generateByDifficulty("MEDIUM", questionCounts.medium);
  generateByDifficulty("HARD", questionCounts.hard);

  return questions;
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
      q.question_type &&
      q.marks
  );
}
