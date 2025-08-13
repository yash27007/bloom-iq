import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import {
  RAGPDFProcessor,
  type GeneratedQuestion,
} from "@/lib/rag-pdf-processor";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  }
);

export const generateQuestions = inngest.createFunction(
  {
    id: "generate-questions",
    name: "Generate Questions from Course Material using RAG",
    retries: 2,
    concurrency: {
      limit: 3, // Limit concurrent question generation jobs
    },
  },
  { event: "questions/requested" },
  async ({ event, step, logger }) => {
    const {
      jobId,
      courseId,
      materialId,
      unit,
      questionTypes = ["STRAIGHTFORWARD", "PROBLEM_BASED"],
      difficultyLevels = ["EASY", "MEDIUM", "HARD"],
      questionsPerBloomLevel = { UNDERSTAND: 3, APPLY: 2 },
      marks = [2, 8, 16],
    } = event.data;

    logger.info("Starting RAG-enhanced question generation", {
      jobId,
      courseId,
      materialId,
    });

    // Step 1: Update job status to PROCESSING
    await step.run("update-job-status-processing", async () => {
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "PROCESSING",
          progress: 10,
        },
      });
    });

    // Step 2: Load course material
    const material = await step.run("load-course-material", async () => {
      const courseMaterial = await prisma.courseMaterial.findUnique({
        where: { id: materialId },
        include: { course: true },
      });

      if (!courseMaterial) {
        throw new Error(`Course material not found: ${materialId}`);
      }

      return courseMaterial;
    });

    // Step 3: Process PDF using RAG pipeline
    const ragProcessor = new RAGPDFProcessor();
    const { topics } = await step.run("process-pdf-with-rag", async () => {
      try {
        // Extract the actual file path from the material record
        const actualFilePath = material.filePath.replace(
          "https://tmuqqowrsfwoomnzukyq.supabase.co/storage/v1/object/public/course-materials/",
          ""
        );

        logger.info("Processing PDF file with RAG", {
          actualFilePath,
          unit: material.unit,
        });

        // Process the PDF using RAG pipeline
        const result = await ragProcessor.processPDFWithRAG(
          actualFilePath,
          material.unit || unit
        );

        await prisma.questionGenerationJob.update({
          where: { id: jobId },
          data: { progress: 35 },
        });

        logger.info("RAG processing completed", {
          chunksProcessed: result.chunks.length,
          topicsExtracted: result.topics.length,
          topics: result.topics.slice(0, 5),
        });

        return {
          topics: result.topics,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Error in RAG processing", { error: errorMessage });
        throw new Error(`Failed to process PDF with RAG: ${errorMessage}`);
      }
    });

    // Step 4: Generate questions using RAG-enhanced context
    const allGeneratedQuestions: GeneratedQuestion[] = await step.run(
      "generate-rag-questions",
      async () => {
        const allQuestions: GeneratedQuestion[] = [];
        let questionCount = 0;
        const totalQuestions = Object.values(questionsPerBloomLevel).reduce(
          (sum: number, count: unknown) => sum + (count as number),
          0
        );

        logger.info("Starting question generation", {
          totalQuestions,
          bloomLevels: Object.keys(questionsPerBloomLevel),
        });

        // Generate questions for each Bloom level
        for (const [bloomLevel, count] of Object.entries(
          questionsPerBloomLevel
        )) {
          if ((count as number) > 0) {
            logger.info(`Generating ${count} questions for ${bloomLevel}`);

            const questionType = questionTypes[
              Math.floor(Math.random() * questionTypes.length)
            ] as string;
            const difficultyLevel = difficultyLevels[
              Math.floor(Math.random() * difficultyLevels.length)
            ] as string;
            const questionMarks =
              marks[Math.floor(Math.random() * marks.length)];

            try {
              // Retrieve relevant context using RAG
              const context =
                await ragProcessor.retrieveContextForQuestionGeneration(
                  `Generate ${bloomLevel} level questions about ${topics
                    .slice(0, 3)
                    .join(", ")}`,
                  bloomLevel,
                  unit,
                  4 // Retrieve top 4 most relevant chunks
                );

              // Generate questions using RAG context
              const questions = await ragProcessor.generateQuestionsWithRAG(
                context,
                {
                  bloomLevel,
                  questionType,
                  difficultyLevel,
                  marks: questionMarks,
                  count: count as number,
                }
              );

              allQuestions.push(...questions);
              questionCount += questions.length;

              // Update progress
              const progress = Math.min(
                90,
                40 + (questionCount / totalQuestions) * 45
              );
              await prisma.questionGenerationJob.update({
                where: { id: jobId },
                data: {
                  progress: Math.round(progress),
                  generatedCount: questionCount,
                },
              });

              logger.info(
                `Successfully generated ${questions.length} questions for ${bloomLevel}`
              );
            } catch (aiError) {
              const errorMessage =
                aiError instanceof Error ? aiError.message : "Unknown AI error";
              logger.error(`Error generating questions for ${bloomLevel}`, {
                error: errorMessage,
              });

              // Create fallback question
              const fallbackQuestion: GeneratedQuestion = {
                question: `Explain the key concepts related to ${
                  topics[0] || "the course content"
                } covered in Unit ${unit}.`,
                answer: `This question tests ${bloomLevel.toLowerCase()} level understanding of key concepts covered in the course material.`,
                unit: unit || 1,
                marks: questionMarks,
                bloomLevel,
                difficultyLevel,
                questionType,
                topics: topics.slice(0, 3),
                contextSource: "Course material",
              };

              allQuestions.push(fallbackQuestion);
              questionCount++;
            }
          }
        }

        logger.info("Question generation completed", {
          totalGenerated: allQuestions.length,
        });
        return allQuestions;
      }
    );

    // Step 5: Save questions to database
    const savedQuestions = await step.run("save-questions-to-db", async () => {
      const savedQuestions = [];

      for (const question of allGeneratedQuestions) {
        try {
          const savedQuestion = await prisma.question.create({
            data: {
              question: question.question,
              questionType:
                (question.questionType as
                  | "STRAIGHTFORWARD"
                  | "PROBLEM_BASED"
                  | "SCENARIO_BASED") || "STRAIGHTFORWARD",
              unit: question.unit,
              bloomLevel: question.bloomLevel as
                | "REMEMBER"
                | "UNDERSTAND"
                | "APPLY"
                | "ANALYZE"
                | "EVALUATE"
                | "CREATE",
              difficultyLevel: question.difficultyLevel as
                | "EASY"
                | "MEDIUM"
                | "HARD",
              marks:
                question.marks === 2
                  ? "TWO_MARKS"
                  : question.marks === 8
                  ? "EIGHT_MARKS"
                  : "SIXTEEN_MARKS",
              topic: question.topics[0] || "General",

              // Answer fields
              answer: question.answer,

              courseId,
              status: "CREATED_BY_COURSE_COORDINATOR",
            },
          });

          savedQuestions.push(savedQuestion);
          logger.info("Saved question to database", {
            questionId: savedQuestion.id,
          });
        } catch (dbError) {
          const errorMessage =
            dbError instanceof Error
              ? dbError.message
              : "Unknown database error";
          logger.error("Error saving question to database", {
            error: errorMessage,
            question: question.question.substring(0, 100),
          });
        }
      }

      return savedQuestions;
    });

    // Step 6: Clean up RAG processor and update job status
    await step.run("finalize-job", async () => {
      // Clean up RAG processor resources
      ragProcessor.cleanup();

      // Update job status to COMPLETED
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          progress: 100,
          generatedCount: savedQuestions.length,
          totalQuestions: savedQuestions.length,
        },
      });

      logger.info("Job completed successfully", {
        jobId,
        questionsGenerated: savedQuestions.length,
        topicsProcessed: topics.length,
      });
    });

    return {
      success: true,
      jobId,
      questionsGenerated: savedQuestions.length,
      topicsExtracted: topics.length,
      questions: savedQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        bloomLevel: q.bloomLevel,
        marks: q.marks,
        topic: q.topic,
      })),
    };
  }
);
