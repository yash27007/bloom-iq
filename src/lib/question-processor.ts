import { prisma } from "@/lib/prisma";

// Background processing function that doesn't block the API response
export async function processQuestionGeneration(
  jobId: string,
  params: {
    courseId: string;
    materialId?: string | null;
    unit: number;
    questionTypes: string[];
    difficultyLevels: string[];
    questionsPerBloomLevel: Record<string, number>;
  }
) {
  // Use setTimeout instead of setImmediate for better cross-platform compatibility
  setTimeout(async () => {
    try {
      console.log(
        `🚀 Starting background question generation for job ${jobId}`
      );

      // Update job to processing
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: { status: "PROCESSING", progress: 20 },
      });

      // Simulate some processing time for realistic feel
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update progress
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: { progress: 40 },
      });

      console.log(
        `📝 Generating questions for course ${params.courseId}, unit ${params.unit}`
      );

      // Generate questions based on university pattern structure
      const generatedQuestions = [];
      const bloomLevels = Object.keys(params.questionsPerBloomLevel) as Array<
        keyof typeof params.questionsPerBloomLevel
      >;

      for (const bloomLevel of bloomLevels) {
        const count = params.questionsPerBloomLevel[bloomLevel];

        for (let i = 0; i < count; i++) {
          // Determine question type and marks based on Bloom level (university pattern)
          // Only 2, 8, and 16 marks questions
          let marks: "TWO_MARKS" | "EIGHT_MARKS" | "SIXTEEN_MARKS";
          let marksValue: number;

          // Select question type from user preferences
          const availableTypes = params.questionTypes as Array<
            "STRAIGHTFORWARD" | "PROBLEM_BASED" | "SCENARIO_BASED"
          >;
          const questionType =
            availableTypes[Math.floor(Math.random() * availableTypes.length)];

          if (["REMEMBER", "UNDERSTAND"].includes(bloomLevel)) {
            // Part A questions: Lower Bloom levels, 2 marks
            marks = "TWO_MARKS";
            marksValue = 2;
          } else if (["APPLY", "ANALYZE"].includes(bloomLevel)) {
            // Part B questions: Medium Bloom levels, 8 or 16 marks
            const use8Marks = Math.random() > 0.5;
            marks = use8Marks ? "EIGHT_MARKS" : "SIXTEEN_MARKS";
            marksValue = use8Marks ? 8 : 16;
          } else {
            // EVALUATE, CREATE: Always 16 marks
            marks = "SIXTEEN_MARKS";
            marksValue = 16;
          }

          // Determine difficulty based on Bloom level
          let difficulty: "EASY" | "MEDIUM" | "HARD";
          if (["REMEMBER", "UNDERSTAND"].includes(bloomLevel)) {
            difficulty = "EASY";
          } else if (["APPLY", "ANALYZE"].includes(bloomLevel)) {
            difficulty = "MEDIUM";
          } else {
            difficulty = "HARD";
          }

          // Generate question based on university pattern
          const questionNumber = generatedQuestions.length + 1;
          const part = marksValue <= 2 ? "A" : "B";
          const questionNo =
            part === "A"
              ? `${questionNumber}`
              : `${questionNumber - 10}${Math.random() > 0.5 ? "A" : "B"}`;

          const questionText = generateUniversityStyleQuestion(
            questionNo,
            part,
            bloomLevel,
            questionType,
            params.unit,
            marksValue
          );

          const baseQuestion = {
            question: questionText,
            questionType,
            bloomLevel: bloomLevel as
              | "REMEMBER"
              | "UNDERSTAND"
              | "APPLY"
              | "ANALYZE"
              | "EVALUATE"
              | "CREATE",
            difficultyLevel: difficulty,
            marks,
            unit: params.unit,
            courseId: params.courseId,
            topic: `Unit ${params.unit} - Course Outcomes (CO${params.unit})`,
            explanation: `This ${questionType
              .toLowerCase()
              .replace(
                "_",
                " "
              )} question tests ${bloomLevel} level understanding of Unit ${
              params.unit
            } concepts with ${marksValue} marks weightage according to university exam pattern.`,
          };

          // All questions are STRAIGHTFORWARD, PROBLEM_BASED, or SCENARIO_BASED (no MCQs)
          generatedQuestions.push({
            ...baseQuestion,
            optionA: null,
            optionB: null,
            optionC: null,
            optionD: null,
            correctAnswer: generateDetailedAnswer(
              bloomLevel,
              params.unit,
              questionType,
              marksValue
            ),
          });
        }
      }

      // Update progress
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: { progress: 70 },
      });

      console.log(
        `💾 Saving ${generatedQuestions.length} questions to database`
      );

      // Simulate database writing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create questions in database
      await prisma.question.createMany({
        data: generatedQuestions,
      });

      // Final progress update
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: { progress: 90 },
      });

      // Complete the job
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          progress: 100,
          generatedCount: generatedQuestions.length,
        },
      });

      console.log(
        `✅ Question generation completed for job ${jobId}: ${generatedQuestions.length} questions created following university exam pattern`
      );
    } catch (error) {
      console.error("❌ Background question generation failed:", error);
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          progress: 0,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Background processing failed",
        },
      });
    }
  }, 100); // Start processing after 100ms to allow API response to be sent
}

function generateUniversityStyleQuestion(
  questionNo: string,
  part: string,
  bloomLevel: string,
  questionType: string,
  unit: number,
  marks: number
): string {
  const templates = {
    STRAIGHTFORWARD: {
      REMEMBER: [
        `Define the fundamental concepts and terminology used in Unit ${unit}. (${marks} marks)`,
        `List the key components and elements discussed in Unit ${unit}. (${marks} marks)`,
        `State the basic principles and laws covered in Unit ${unit}. (${marks} marks)`,
        `What are the main characteristics of systems discussed in Unit ${unit}? (${marks} marks)`,
      ],
      UNDERSTAND: [
        `Explain the working principles and mechanisms of Unit ${unit}. (${marks} marks)`,
        `Describe the relationship between different concepts in Unit ${unit}. (${marks} marks)`,
        `How does the process flow work in Unit ${unit}? (${marks} marks)`,
        `Summarize the main theoretical framework of Unit ${unit}. (${marks} marks)`,
      ],
      APPLY: [
        `Apply the principles from Unit ${unit} to solve standard problems. (${marks} marks)`,
        `Use the methodologies from Unit ${unit} in given situations. (${marks} marks)`,
        `Implement the algorithms discussed in Unit ${unit}. (${marks} marks)`,
        `Demonstrate the application of Unit ${unit} concepts. (${marks} marks)`,
      ],
      ANALYZE: [
        `Analyze the components and their relationships in Unit ${unit}. (${marks} marks)`,
        `Compare different approaches discussed in Unit ${unit}. (${marks} marks)`,
        `Examine the structure of systems in Unit ${unit}. (${marks} marks)`,
        `Break down the concepts from Unit ${unit} systematically. (${marks} marks)`,
      ],
      EVALUATE: [
        `Evaluate the effectiveness of methods in Unit ${unit}. (${marks} marks)`,
        `Assess the advantages and disadvantages of Unit ${unit} approaches. (${marks} marks)`,
        `Judge the suitability of Unit ${unit} solutions. (${marks} marks)`,
        `Critically review the concepts from Unit ${unit}. (${marks} marks)`,
      ],
      CREATE: [
        `Design a solution using Unit ${unit} principles. (${marks} marks)`,
        `Develop a new approach based on Unit ${unit} concepts. (${marks} marks)`,
        `Create an integrated framework from Unit ${unit}. (${marks} marks)`,
        `Formulate a comprehensive solution for Unit ${unit}. (${marks} marks)`,
      ],
    },
    PROBLEM_BASED: {
      REMEMBER: [
        `A system fails to start. List the basic troubleshooting steps from Unit ${unit}. (${marks} marks)`,
        `Given a specific scenario, identify the relevant principles from Unit ${unit}. (${marks} marks)`,
        `In a production environment, what are the key factors from Unit ${unit} to consider? (${marks} marks)`,
      ],
      UNDERSTAND: [
        `A company needs to optimize their process. Explain how Unit ${unit} concepts can help. (${marks} marks)`,
        `Given performance issues, describe the underlying principles from Unit ${unit} that apply. (${marks} marks)`,
        `A new technology is being adopted. Explain the relevant Unit ${unit} concepts. (${marks} marks)`,
      ],
      APPLY: [
        `A client reports system slowdown. Apply Unit ${unit} methodologies to diagnose and solve. (${marks} marks)`,
        `Given specific constraints, implement Unit ${unit} solutions to meet requirements. (${marks} marks)`,
        `A project requires optimization. Use Unit ${unit} techniques to improve performance. (${marks} marks)`,
      ],
      ANALYZE: [
        `A system shows unexpected behavior. Analyze using Unit ${unit} principles to find root causes. (${marks} marks)`,
        `Compare two competing solutions using Unit ${unit} analysis methods. (${marks} marks)`,
        `Given performance data, analyze bottlenecks using Unit ${unit} approaches. (${marks} marks)`,
      ],
      EVALUATE: [
        `A team proposes three different solutions. Evaluate each using Unit ${unit} criteria. (${marks} marks)`,
        `An existing system needs upgrade. Evaluate options using Unit ${unit} principles. (${marks} marks)`,
        `Multiple vendors offer solutions. Critically assess using Unit ${unit} evaluation methods. (${marks} marks)`,
      ],
      CREATE: [
        `Design a complete solution for a complex business problem using Unit ${unit} principles. (${marks} marks)`,
        `Develop an innovative approach to address emerging challenges using Unit ${unit}. (${marks} marks)`,
        `Create a comprehensive framework for solving industry problems with Unit ${unit}. (${marks} marks)`,
      ],
    },
    SCENARIO_BASED: {
      REMEMBER: [
        `In an e-commerce scenario, recall the key security principles from Unit ${unit}. (${marks} marks)`,
        `A healthcare system needs compliance. List Unit ${unit} requirements. (${marks} marks)`,
        `During a system migration, identify critical Unit ${unit} checkpoints. (${marks} marks)`,
      ],
      UNDERSTAND: [
        `A startup is scaling rapidly. Explain how Unit ${unit} concepts ensure smooth growth. (${marks} marks)`,
        `A bank implements new software. Describe Unit ${unit} considerations for security. (${marks} marks)`,
        `An IoT deployment faces challenges. Explain relevant Unit ${unit} principles. (${marks} marks)`,
      ],
      APPLY: [
        `A social media platform experiences traffic spikes. Apply Unit ${unit} scaling strategies. (${marks} marks)`,
        `A manufacturing company adopts Industry 4.0. Implement Unit ${unit} solutions. (${marks} marks)`,
        `A government portal needs modernization. Apply Unit ${unit} best practices. (${marks} marks)`,
      ],
      ANALYZE: [
        `An airline reservation system crashes during peak hours. Analyze using Unit ${unit} methods. (${marks} marks)`,
        `A fintech app shows security vulnerabilities. Analyze risks using Unit ${unit} frameworks. (${marks} marks)`,
        `A cloud migration fails. Analyze the issues using Unit ${unit} principles. (${marks} marks)`,
      ],
      EVALUATE: [
        `A healthcare provider chooses between cloud vs on-premise. Evaluate using Unit ${unit}. (${marks} marks)`,
        `An educational institution plans digital transformation. Evaluate strategies with Unit ${unit}. (${marks} marks)`,
        `A retail chain implements omnichannel. Evaluate the approach using Unit ${unit}. (${marks} marks)`,
      ],
      CREATE: [
        `Design a disaster recovery plan for a financial institution using Unit ${unit}. (${marks} marks)`,
        `Create a smart city infrastructure plan incorporating Unit ${unit} principles. (${marks} marks)`,
        `Develop a comprehensive cybersecurity strategy for an enterprise using Unit ${unit}. (${marks} marks)`,
      ],
    },
  };

  const typeTemplates = templates[questionType as keyof typeof templates];
  const levelTemplates =
    typeTemplates[bloomLevel as keyof typeof typeTemplates];

  if (!levelTemplates || levelTemplates.length === 0) {
    // Fallback to straightforward questions
    const fallbackTemplates =
      templates.STRAIGHTFORWARD[
        bloomLevel as keyof typeof templates.STRAIGHTFORWARD
      ];
    return `${questionNo}. ${
      fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)]
    }`;
  }

  return `${questionNo}. ${
    levelTemplates[Math.floor(Math.random() * levelTemplates.length)]
  }`;
}

function generateDetailedAnswer(
  bloomLevel: string,
  unit: number,
  questionType: string,
  marks: number
): string {
  const answerSuffix =
    marks >= 8
      ? " This answer should include detailed explanations, relevant examples, and proper justification of the approach used."
      : marks === 2
      ? " This answer should be concise but complete with key points covered."
      : " This answer should provide comprehensive coverage of the topic with appropriate depth.";

  return `Detailed answer for ${bloomLevel} level ${questionType
    .toLowerCase()
    .replace("_", " ")} question about Unit ${unit} concepts.${answerSuffix}`;
}
