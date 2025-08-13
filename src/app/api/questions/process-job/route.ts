import { NextRequest, NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

// Helper function to convert numeric marks to enum
function getMarksEnum(
  marks: number
): "TWO_MARKS" | "EIGHT_MARKS" | "SIXTEEN_MARKS" {
  switch (marks) {
    case 2:
      return "TWO_MARKS";
    case 8:
      return "EIGHT_MARKS";
    case 16:
      return "SIXTEEN_MARKS";
    default:
      return "TWO_MARKS"; // fallback
  }
}

type QuestionGenerationPattern = {
  slots: Array<{
    id: string;
    questionNo: string;
    part: "A" | "B" | "C";
    marks: number;
    bloomLevel:
      | "REMEMBER"
      | "UNDERSTAND"
      | "APPLY"
      | "ANALYZE"
      | "EVALUATE"
      | "CREATE";
    unit: number;
    isOrQuestion: boolean;
    orPairId?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get the job details
    const job = await prisma.questionGenerationJob.findUnique({
      where: { id: jobId },
      include: {
        course: true,
        material: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "PENDING") {
      return NextResponse.json(
        { error: "Job already processed" },
        { status: 400 }
      );
    }

    // Update job to processing
    await prisma.questionGenerationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", progress: 10 },
    });

    console.log(
      `🚀 Starting background job ${jobId} for course ${job.course.courseCode}`
    );

    // Parse the pattern from questionsPerType field (which contains our pattern data)
    let pattern: QuestionGenerationPattern | null = null;
    try {
      pattern = job.questionsPerType ? JSON.parse(job.questionsPerType) : null;
    } catch (e) {
      console.error("Failed to parse pattern:", e);
    }

    // Generate questions based on pattern
    const generatedQuestions = [];

    if (pattern?.slots) {
      console.log(`📝 Generating questions for ${pattern.slots.length} slots`);

      // Update progress
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: { progress: 30 },
      });

      // Group OR questions by orPairId
      const orGroups: Record<string, typeof pattern.slots> = {};
      const regularSlots = [];

      for (const slot of pattern.slots) {
        if (slot.isOrQuestion && slot.orPairId) {
          if (!orGroups[slot.orPairId]) orGroups[slot.orPairId] = [];
          orGroups[slot.orPairId].push(slot);
        } else {
          regularSlots.push(slot);
        }
      }

      // Generate questions for regular slots (usually Part A)
      for (const slot of regularSlots) {
        const question = generateQuestionForSlot(slot, job.courseId);
        generatedQuestions.push(question);
      }

      // Generate questions for OR groups (usually Part B)
      for (const [orPairId, orSlots] of Object.entries(orGroups)) {
        for (const slot of orSlots) {
          const question = generateQuestionForSlot(
            slot,
            job.courseId,
            orPairId
          );
          generatedQuestions.push(question);
        }
      }
    } else {
      // Fallback: Generate questions using old method
      console.log("📝 Using fallback question generation method");

      const questionTypes = job.questionTypes
        ? JSON.parse(job.questionTypes)
        : ["STRAIGHTFORWARD", "PROBLEM_BASED"];
      const difficultyLevels = job.difficultyLevels
        ? JSON.parse(job.difficultyLevels)
        : ["EASY", "MEDIUM"];
      const bloomLevels = job.bloomLevels
        ? JSON.parse(job.bloomLevels)
        : ["REMEMBER", "UNDERSTAND", "APPLY"];

      for (const bloomLevel of bloomLevels) {
        for (const questionType of questionTypes) {
          for (const difficulty of difficultyLevels) {
            const question = {
              question: `Sample ${questionType} question for ${bloomLevel} level (${difficulty}) - Unit ${
                job.unit || 1
              }`,
              questionType: questionType as
                | "STRAIGHTFORWARD"
                | "PROBLEM_BASED"
                | "SCENARIO_BASED",
              bloomLevel: bloomLevel as
                | "REMEMBER"
                | "UNDERSTAND"
                | "APPLY"
                | "ANALYZE"
                | "EVALUATE"
                | "CREATE",
              difficultyLevel: difficulty as "EASY" | "MEDIUM" | "HARD",
              marks: getMarksEnum(
                questionType === "STRAIGHTFORWARD"
                  ? 2
                  : questionType === "PROBLEM_BASED"
                  ? 8
                  : 16
              ),
              unit: job.unit || 1,
              courseId: job.courseId,
              optionA: null,
              optionB: null,
              optionC: null,
              optionD: null,
              correctAnswer: `Sample answer for ${questionType} question`,
              explanation: `This question tests ${bloomLevel} level understanding of Unit ${
                job.unit || 1
              } concepts.`,
              topic: `Unit ${job.unit || 1} Topic`,
            };
            generatedQuestions.push(question);
          }
        }
      }
    }

    // Update progress
    await prisma.questionGenerationJob.update({
      where: { id: jobId },
      data: { progress: 70 },
    });

    console.log(`💾 Saving ${generatedQuestions.length} questions to database`);

    // Create questions in database
    await prisma.question.createMany({
      data: generatedQuestions,
    });

    // Update progress
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
        updatedAt: new Date(),
      },
    });

    console.log(
      `✅ Job ${jobId} completed successfully with ${generatedQuestions.length} questions`
    );

    return NextResponse.json({
      success: true,
      questionsGenerated: generatedQuestions.length,
      message: "Questions generated successfully",
    });
  } catch (error) {
    console.error("❌ Background job failed:", error);

    try {
      const { jobId } = await request.json();
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          progress: 0,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }

    return NextResponse.json(
      { error: "Background job failed" },
      { status: 500 }
    );
  }
}

function generateQuestionForSlot(
  slot: QuestionGenerationPattern["slots"][0],
  courseId: string,
  orPairId?: string
) {
  // Determine question type based on part and marks
  let questionType: "STRAIGHTFORWARD" | "PROBLEM_BASED" | "SCENARIO_BASED";

  if (slot.marks <= 2) {
    questionType = "STRAIGHTFORWARD";
  } else if (slot.marks <= 8) {
    questionType = "PROBLEM_BASED";
  } else {
    questionType = "SCENARIO_BASED";
  }

  // Determine difficulty based on Bloom level
  let difficulty: "EASY" | "MEDIUM" | "HARD";
  if (["REMEMBER", "UNDERSTAND"].includes(slot.bloomLevel)) {
    difficulty = "EASY";
  } else if (["APPLY", "ANALYZE"].includes(slot.bloomLevel)) {
    difficulty = "MEDIUM";
  } else {
    difficulty = "HARD";
  }

  const baseQuestion = {
    question: generateQuestionText(slot, orPairId),
    questionType,
    bloomLevel: slot.bloomLevel,
    difficultyLevel: difficulty,
    marks: getMarksEnum(slot.marks),
    unit: slot.unit,
    courseId,
    topic: `Unit ${slot.unit} - Course Outcomes (CO${slot.unit})`,
    explanation: `This ${questionType} question tests ${slot.bloomLevel} level understanding of Unit ${slot.unit} concepts with ${slot.marks} marks weightage.`,
  };

  // Add MCQ options if applicable
  if (questionType === "MCQ") {
    return {
      ...baseQuestion,
      optionA: generateMCQOption(slot, "A", true),
      optionB: generateMCQOption(slot, "B", false),
      optionC: generateMCQOption(slot, "C", false),
      optionD: generateMCQOption(slot, "D", false),
      correctAnswer: generateMCQOption(slot, "A", true),
    };
  } else {
    return {
      ...baseQuestion,
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: generateAnswerText(slot),
    };
  }
}

function generateQuestionText(
  slot: QuestionGenerationPattern["slots"][0],
  orPairId?: string
): string {
  const bloomLevelTemplates = {
    REMEMBER: [
      `Define the key concepts related to Unit ${slot.unit}.`,
      `List the main components discussed in Unit ${slot.unit}.`,
      `State the fundamental principles of Unit ${slot.unit}.`,
    ],
    UNDERSTAND: [
      `Explain the relationship between concepts in Unit ${slot.unit}.`,
      `Describe the process outlined in Unit ${slot.unit}.`,
      `Summarize the main ideas from Unit ${slot.unit}.`,
    ],
    APPLY: [
      `Apply the principles from Unit ${slot.unit} to solve the given problem.`,
      `Demonstrate how to use the concepts from Unit ${slot.unit} in a practical scenario.`,
      `Implement the methodology discussed in Unit ${slot.unit}.`,
    ],
    ANALYZE: [
      `Analyze the components and their relationships in Unit ${slot.unit}.`,
      `Compare and contrast different approaches discussed in Unit ${slot.unit}.`,
      `Break down the complex system from Unit ${slot.unit} into its constituent parts.`,
    ],
    EVALUATE: [
      `Evaluate the effectiveness of the approach discussed in Unit ${slot.unit}.`,
      `Critically assess the strengths and weaknesses of Unit ${slot.unit} concepts.`,
      `Judge the validity of the conclusions drawn in Unit ${slot.unit}.`,
    ],
    CREATE: [
      `Design a new solution based on the principles from Unit ${slot.unit}.`,
      `Develop an innovative approach using concepts from Unit ${slot.unit}.`,
      `Construct a comprehensive framework incorporating Unit ${slot.unit} elements.`,
    ],
  };

  const templates = bloomLevelTemplates[slot.bloomLevel];
  const randomTemplate =
    templates[Math.floor(Math.random() * templates.length)];

  const orSuffix = orPairId ? ` (${slot.questionNo})` : "";
  return `${slot.questionNo}. ${randomTemplate}${orSuffix}`;
}

function generateMCQOption(
  slot: QuestionGenerationPattern["slots"][0],
  option: string,
  isCorrect: boolean
): string {
  if (isCorrect) {
    return `Option ${option}: Correct answer for ${slot.bloomLevel} level question on Unit ${slot.unit}`;
  } else {
    return `Option ${option}: Plausible but incorrect answer for Unit ${slot.unit}`;
  }
}

function generateAnswerText(
  slot: QuestionGenerationPattern["slots"][0]
): string {
  return `This is a comprehensive answer for the ${slot.bloomLevel} level question targeting Unit ${slot.unit} learning outcomes. The answer should demonstrate understanding of key concepts and their practical applications within the course objectives (CO${slot.unit}).`;
}
