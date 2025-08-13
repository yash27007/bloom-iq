import { GoogleGenerativeAI } from "@google/generative-ai";

export interface QuestionRequest {
  content: string;
  topics: string[];
  bloomLevel:
    | "REMEMBER"
    | "UNDERSTAND"
    | "APPLY"
    | "ANALYZE"
    | "EVALUATE"
    | "CREATE";
  difficultyLevel: "EASY" | "MEDIUM" | "HARD";
  questionType: "STRAIGHTFORWARD" | "PROBLEM_BASED" | "SCENARIO_BASED";
  unit?: number;
  count: number;
}

export interface GeneratedQuestion {
  question: string; // Matches exact output format
  answer: string; // Matches exact output format
  unit: number; // Unit number (Unit 1 = CO1)
  marks: number; // Marks weightage (2, 8, 16)
  bloomLevel:
    | "REMEMBER"
    | "UNDERSTAND"
    | "APPLY"
    | "ANALYZE"
    | "EVALUATE"
    | "CREATE";
  difficultyLevel: "EASY" | "MEDIUM" | "HARD";
  questionType?: "STRAIGHTFORWARD" | "PROBLEM_BASED" | "SCENARIO_BASED";
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer?: string;
  topic?: string;
}

export class AIQuestionGenerator {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async generateQuestions(
    request: QuestionRequest
  ): Promise<GeneratedQuestion[]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const bloomTaxonomyDescriptions = {
      REMEMBER:
        "Focus on recalling facts, terms, concepts, and basic knowledge",
      UNDERSTAND:
        "Focus on comprehension, interpretation, and explaining concepts",
      APPLY:
        "Focus on using knowledge in new situations and practical applications",
      ANALYZE:
        "Focus on breaking down information, finding patterns, and relationships",
      EVALUATE:
        "Focus on making judgments, critiquing, and assessing information",
      CREATE:
        "Focus on combining elements to form new ideas, products, or solutions",
    };

    const difficultyDescriptions = {
      EASY: "Basic level questions suitable for introduction to the topic",
      MEDIUM:
        "Intermediate level requiring good understanding and some analysis",
      HARD: "Advanced level requiring deep understanding and critical thinking",
    };

    const questionTypeInstructions = {
      STRAIGHTFORWARD:
        "Direct questions (2 marks) requiring basic understanding and recall",
      PROBLEM_BASED:
        "Problem-solving questions (8 marks) requiring application and analysis",
      SCENARIO_BASED:
        "Case-study or scenario questions (16 marks) requiring comprehensive analysis and evaluation",
    };

    const prompt = `
You are an expert academic question generator. Generate ${
      request.count
    } high-quality ${
      request.questionType
    } questions based on the provided content.

**Requirements:**
- Bloom's Taxonomy Level: ${request.bloomLevel} - ${
      bloomTaxonomyDescriptions[request.bloomLevel]
    }
- Difficulty Level: ${request.difficultyLevel} - ${
      difficultyDescriptions[request.difficultyLevel]
    }
- Question Type: ${request.questionType} - ${
      questionTypeInstructions[request.questionType]
    }
- Topics to focus on: ${request.topics.join(", ")}
${request.unit ? `- Unit: ${request.unit}` : ""}

**Content:**
${request.content.substring(0, 6000)}

**Response Format (JSON):**
Return a JSON array of question objects. Each question must have:
{
  "questionText": "The question text",
  "questionType": "${request.questionType}",
  "bloomLevel": "${request.bloomLevel}",
  "difficultyLevel": "${request.difficultyLevel}",
  "marks": (number based on question type: STRAIGHTFORWARD=2, PROBLEM_BASED=8, SCENARIO_BASED=16),
  "topic": "relevant topic from the provided list",
  ${request.unit ? `"unit": ${request.unit},` : ""}
  "sampleAnswer": "sample answer or key points"
}

**Important Guidelines:**
1. Ensure questions are directly related to the provided content
2. Questions should be clear, unambiguous, and academically sound
3. For STRAIGHTFORWARD: Simple, direct questions worth 2 marks
4. For PROBLEM_BASED: Application problems worth 8 marks  
5. For SCENARIO_BASED: Complex scenarios worth 16 marks
6. Maintain the specified Bloom's taxonomy level throughout
7. Return ONLY valid JSON, no additional text

Generate exactly ${request.count} questions:
`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Clean the response to extract JSON
      let jsonString = response.trim();

      // Remove markdown code blocks if present
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const questions: GeneratedQuestion[] = JSON.parse(jsonString);

      // Validate and set default marks if not provided
      return questions.map((q) => ({
        question: q.question || "Generated question content",
        answer: q.answer || "Generated answer content",
        marks:
          q.marks || this.getDefaultMarks(q.questionType || "STRAIGHTFORWARD"),
        topic: q.topic || request.topics[0] || "General",
        unit: request.unit || 1,
        bloomLevel: q.bloomLevel,
        difficultyLevel: q.difficultyLevel,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));
    } catch (error) {
      console.error("Error generating questions:", error);

      // Fallback: return sample questions
      return this.generateFallbackQuestions(request);
    }
  }

  private getDefaultMarks(questionType: string): number {
    const marks = {
      STRAIGHTFORWARD: 2,
      PROBLEM_BASED: 8,
      SCENARIO_BASED: 16,
    };

    return marks[questionType as keyof typeof marks] || 2;
  }

  private generateFallbackQuestions(
    request: QuestionRequest
  ): GeneratedQuestion[] {
    const fallbackQuestions: GeneratedQuestion[] = [];

    for (let i = 0; i < request.count; i++) {
      const topic =
        request.topics[i % request.topics.length] || "General Topic";

      const baseQuestion: GeneratedQuestion = {
        question: `Explain the concept of ${topic} as discussed in the course material.`,
        answer: `Sample answer discussing ${topic} and its relevance to the course material.`,
        questionType: request.questionType,
        bloomLevel: request.bloomLevel,
        difficultyLevel: request.difficultyLevel,
        marks: this.getDefaultMarks(request.questionType),
        topic,
        unit: request.unit || 1,
      };

      // All question types get a sample answer
      baseQuestion.answer = `Sample answer for ${request.questionType} question about ${topic}`;

      fallbackQuestions.push(baseQuestion);
    }

    return fallbackQuestions;
  }

  async generateQuestionsByUnit(
    content: string,
    topics: string[],
    unit: number,
    questionsPerBloomLevel: { [key: string]: number } = {
      REMEMBER: 2,
      UNDERSTAND: 2,
      APPLY: 2,
      ANALYZE: 1,
      EVALUATE: 1,
      CREATE: 1,
    }
  ): Promise<GeneratedQuestion[]> {
    const allQuestions: GeneratedQuestion[] = [];

    const bloomLevels = Object.keys(questionsPerBloomLevel) as Array<
      keyof typeof questionsPerBloomLevel
    >;

    for (const bloomLevel of bloomLevels) {
      const count = questionsPerBloomLevel[bloomLevel];
      if (count > 0) {
        const questionTypes: Array<
          "STRAIGHTFORWARD" | "PROBLEM_BASED" | "SCENARIO_BASED"
        > = ["STRAIGHTFORWARD", "PROBLEM_BASED", "SCENARIO_BASED"];
        const difficultyLevels: Array<"EASY" | "MEDIUM" | "HARD"> = [
          "EASY",
          "MEDIUM",
          "HARD",
        ];

        const request: QuestionRequest = {
          content,
          topics,
          bloomLevel: bloomLevel as
            | "REMEMBER"
            | "UNDERSTAND"
            | "APPLY"
            | "ANALYZE"
            | "EVALUATE"
            | "CREATE",
          difficultyLevel:
            difficultyLevels[
              Math.floor(Math.random() * difficultyLevels.length)
            ],
          questionType:
            questionTypes[Math.floor(Math.random() * questionTypes.length)],
          unit,
          count,
        };

        try {
          const questions = await this.generateQuestions(request);
          allQuestions.push(...questions);
        } catch (error) {
          console.error(`Error generating questions for ${bloomLevel}:`, error);
        }
      }
    }

    return allQuestions;
  }
}
