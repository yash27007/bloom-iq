export interface PromptConfig {
  content: string;
  bloomLevel:
    | "REMEMBER"
    | "UNDERSTAND"
    | "APPLY"
    | "ANALYZE"
    | "EVALUATE"
    | "CREATE";
  unit: number;
  marks: number;
  difficultyLevel: "EASY" | "MEDIUM" | "HARD";
  questionType: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "TRUE_FALSE";
  topics?: string[];
  count?: number;
}

export interface UniversityQuestionFormat {
  question: string;
  answer: string;
  unit: number;
  marks: number;
  bloomLevel: string;
  difficultyLevel: string;
  questionType?: string;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer?: string;
}

export class GeminiPromptBuilder {
  /**
   * Build structured prompt for university-style question generation
   */
  buildQuestionGenerationPrompt(config: PromptConfig): string {
    const bloomTaxonomyDescriptions = {
      REMEMBER:
        "Recall facts, terms, concepts, and basic knowledge. Use verbs like: define, list, identify, name, state, describe.",
      UNDERSTAND:
        "Comprehension, interpretation, and explaining concepts. Use verbs like: explain, summarize, interpret, compare, contrast.",
      APPLY:
        "Use knowledge in new situations and practical applications. Use verbs like: apply, demonstrate, calculate, solve, implement.",
      ANALYZE:
        "Break down information, find patterns, and relationships. Use verbs like: analyze, examine, categorize, differentiate.",
      EVALUATE:
        "Make judgments, critique, and assess information. Use verbs like: evaluate, justify, critique, assess, judge.",
      CREATE:
        "Combine elements to form new ideas, products, or solutions. Use verbs like: create, design, develop, formulate, construct.",
    };

    const difficultyGuidelines = {
      EASY: "Basic level questions suitable for introduction to the topic. Clear, straightforward questions.",
      MEDIUM:
        "Intermediate level requiring good understanding and some analysis. May involve calculations or explanations.",
      HARD: "Advanced level requiring deep understanding and critical thinking. Complex scenarios or multi-step problems.",
    };

    const marksGuidelines = {
      2: "Brief, concise answers. Definitions, short explanations, or simple calculations.",
      4: "Short explanations with examples or brief analysis.",
      8: "Detailed explanations, analysis, or problem-solving with multiple steps.",
      10: "Comprehensive answers with detailed analysis, examples, and justifications.",
      15: "Extensive answers requiring in-depth analysis, multiple concepts, and thorough explanations.",
      16: "Complete analysis with practical applications, detailed examples, and comprehensive coverage.",
    };

    const questionTypeInstructions = {
      MCQ: "Multiple choice questions with 4 options (a, b, c, d). Make all options plausible but only one correct.",
      SHORT_ANSWER:
        "Short answer questions requiring brief but complete explanations.",
      LONG_ANSWER:
        "Long answer questions requiring detailed, comprehensive responses.",
      TRUE_FALSE: "True/False questions with brief justification required.",
    };

    const prompt = `You are an expert academic question generator for university-level computer science/engineering exams.

**CONTEXT:**
${config.content.substring(0, 6000)}

**GENERATION REQUIREMENTS:**
- Bloom's Taxonomy Level: ${config.bloomLevel} - ${
      bloomTaxonomyDescriptions[config.bloomLevel]
    }
- Unit/Course Outcome: Unit ${config.unit} (CO${config.unit})
- Marks Allocation: ${config.marks} marks - ${
      marksGuidelines[config.marks as keyof typeof marksGuidelines] ||
      "Standard university-level question"
    }
- Difficulty Level: ${config.difficultyLevel} - ${
      difficultyGuidelines[config.difficultyLevel]
    }
- Question Type: ${config.questionType} - ${
      questionTypeInstructions[config.questionType]
    }
${
  config.topics && config.topics.length > 0
    ? `- Focus Topics: ${config.topics.join(", ")}`
    : ""
}

**UNIVERSITY QUESTION PAPER STYLE GUIDELINES:**
1. Questions must be clear, unambiguous, and academically sound
2. Use formal academic language appropriate for university exams
3. For Part A (2-4 marks): Brief, direct questions - definitions, short explanations
4. For Part B (8-16 marks): Detailed questions requiring analysis, problem-solving, or comprehensive explanations
5. Questions should test understanding rather than rote memorization
6. Include practical applications where relevant
7. Maintain consistency with standard university examination patterns

**BLOOM'S TAXONOMY SPECIFIC REQUIREMENTS:**
${this.getBloomSpecificInstructions(config.bloomLevel)}

**OUTPUT FORMAT:**
Generate ${config.count || 1} question(s) in the following JSON format:

${
  config.questionType === "MCQ"
    ? `
{
  "question": "Clear question text ending with appropriate punctuation",
  "answer": "Brief explanation of the correct answer",
  "unit": ${config.unit},
  "marks": ${config.marks},
  "bloomLevel": "${config.bloomLevel}",
  "difficultyLevel": "${config.difficultyLevel}",
  "questionType": "MCQ",
  "options": {
    "a": "First option",
    "b": "Second option", 
    "c": "Third option",
    "d": "Fourth option"
  },
  "correctAnswer": "a"
}`
    : `
{
  "question": "Clear question text ending with appropriate punctuation",
  "answer": "Comprehensive sample answer or key points for evaluation",
  "unit": ${config.unit},
  "marks": ${config.marks},
  "bloomLevel": "${config.bloomLevel}",
  "difficultyLevel": "${config.difficultyLevel}",
  "questionType": "${config.questionType}"
}`
}

**CRITICAL INSTRUCTIONS:**
1. Base questions STRICTLY on the provided context content
2. Do not reference the source material directly in questions
3. Ensure questions are non-repetitive and technically accurate
4. Match the complexity to the marks allocation
5. Use appropriate technical terminology
6. Return ONLY valid JSON, no additional text or explanation
7. Ensure all fields are properly filled

Generate the question(s) now:`;

    return prompt;
  }

  /**
   * Get Bloom's taxonomy specific instructions
   */
  private getBloomSpecificInstructions(bloomLevel: string): string {
    const instructions = {
      REMEMBER: `
- Focus on factual recall and recognition
- Ask for definitions, terms, concepts, or basic information
- Use question starters: "Define...", "What is...", "List...", "Identify..."
- Example: "Define the term 'algorithm' in computer science."`,

      UNDERSTAND: `
- Focus on comprehension and interpretation
- Ask for explanations, summaries, or comparisons
- Use question starters: "Explain...", "Describe...", "Compare...", "Summarize..."
- Example: "Explain the difference between stack and queue data structures."`,

      APPLY: `
- Focus on using knowledge in new situations
- Ask for practical applications, calculations, or implementations
- Use question starters: "Apply...", "Calculate...", "Solve...", "Implement..."
- Example: "Apply the binary search algorithm to find element 15 in the sorted array [2, 5, 8, 12, 15, 23, 37]."`,

      ANALYZE: `
- Focus on breaking down information and finding relationships
- Ask for analysis, categorization, or examination of components
- Use question starters: "Analyze...", "Examine...", "Compare and contrast...", "Break down..."
- Example: "Analyze the time complexity of different sorting algorithms and explain when each would be most appropriate."`,

      EVALUATE: `
- Focus on making judgments and assessments
- Ask for critiques, evaluations, or justifications
- Use question starters: "Evaluate...", "Justify...", "Critique...", "Assess..."
- Example: "Evaluate the pros and cons of using recursion versus iteration for solving the factorial problem."`,

      CREATE: `
- Focus on combining elements to form something new
- Ask for design, development, or creation of solutions
- Use question starters: "Design...", "Create...", "Develop...", "Formulate..."
- Example: "Design a database schema for a library management system that handles books, members, and borrowing records."`,
    };

    return instructions[bloomLevel as keyof typeof instructions] || "";
  }

  /**
   * Build prompt for generating multiple questions across different Bloom levels
   */
  buildMultiLevelPrompt(
    content: string,
    unit: number,
    questionsPerLevel: { [key: string]: number },
    topics?: string[]
  ): string {
    const totalQuestions = Object.values(questionsPerLevel).reduce(
      (sum, count) => sum + count,
      0
    );

    return `You are an expert academic question generator creating a comprehensive set of university exam questions.

**CONTEXT:**
${content.substring(0, 8000)}

**REQUIREMENTS:**
Generate exactly ${totalQuestions} questions distributed across different Bloom's Taxonomy levels:
${Object.entries(questionsPerLevel)
  .map(([level, count]) => `- ${level}: ${count} question(s)`)
  .join("\n")}

**GENERAL GUIDELINES:**
- Unit: ${unit} (Course Outcome CO${unit})
- All questions based strictly on provided content
${topics && topics.length > 0 ? `- Focus on topics: ${topics.join(", ")}` : ""}
- Mix of question types (MCQ, Short Answer, Long Answer)
- Vary marks allocation (2, 4, 8, 10, 15 marks)
- Mix difficulty levels (Easy, Medium, Hard)

**OUTPUT FORMAT:**
Return a JSON array with exactly ${totalQuestions} question objects. Each question must include all required fields.

Generate the complete question set now:`;
  }

  /**
   * Build prompt for specific university question paper sections
   */
  buildSectionSpecificPrompt(
    content: string,
    section: "PART_A" | "PART_B",
    unit: number,
    questionCount: number
  ): string {
    const sectionConfig = {
      PART_A: {
        marks: [2, 4],
        types: ["MCQ", "SHORT_ANSWER", "TRUE_FALSE"],
        description:
          "Brief questions testing basic knowledge and understanding",
        bloomLevels: ["REMEMBER", "UNDERSTAND"],
      },
      PART_B: {
        marks: [8, 10, 15, 16],
        types: ["SHORT_ANSWER", "LONG_ANSWER"],
        description:
          "Detailed questions requiring analysis, application, and problem-solving",
        bloomLevels: ["APPLY", "ANALYZE", "EVALUATE", "CREATE"],
      },
    };

    const config = sectionConfig[section];

    return `Generate ${questionCount} university exam questions for ${section}.

**CONTEXT:**
${content.substring(0, 6000)}

**${section} REQUIREMENTS:**
- ${config.description}
- Marks: ${config.marks.join(" or ")} marks per question
- Question Types: ${config.types.join(", ")}
- Bloom Levels: ${config.bloomLevels.join(", ")}
- Unit: ${unit}

**STYLE GUIDELINES:**
${
  section === "PART_A"
    ? "- Concise, direct questions\n- Test fundamental concepts\n- Clear and unambiguous"
    : "- Comprehensive questions\n- Require detailed analysis\n- Test higher-order thinking\n- May include OR options (e.g., Q11A OR Q11B)"
}

Return JSON array of ${questionCount} questions matching these requirements.`;
  }
}
