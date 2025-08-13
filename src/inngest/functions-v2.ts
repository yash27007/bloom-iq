import { serve } from "inngest/next";
import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { vectorRAG } from "@/lib/supabase-vector-rag";
import { questionGenerator } from "@/lib/advanced-question-generator-v2";
import { Marks, QuestionCategory, ProcessingStatus } from "@prisma/client";

// Enhanced question generation job with RAG pipeline
export const processQuestionGeneration = inngest.createFunction(
  { id: "process-question-generation" },
  { event: "question/generate" },
  async ({ event, step }) => {
    const { materialId, jobId, pattern } = event.data;

    console.log(`🚀 Starting question generation job: ${jobId}`);

    // Step 1: Update job status to processing
    await step.run("update-job-status-processing", async () => {
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: ProcessingStatus.PROCESSING,
          processedAt: new Date(),
        },
      });
      console.log(`📝 Job ${jobId} status updated to PROCESSING`);
    });

    // Step 2: Process PDF and create vector embeddings
    const processingResult = await step.run(
      "process-material-vectors",
      async () => {
        try {
          console.log(`📄 Processing material: ${materialId}`);

          // Check if material is already processed
          const existingChunks = (await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${materialId}
        `) as Array<{ count: bigint }>;

          const chunkCount = Number(existingChunks[0]?.count || 0);

          if (chunkCount === 0) {
            console.log(`🔄 Processing new material: ${materialId}`);
            await vectorRAG.processUploadedMaterial(materialId);
            console.log(`✅ Material processed: ${chunkCount} chunks created`);
          } else {
            console.log(
              `♻️ Material already processed: ${chunkCount} chunks found`
            );
          }

          return { success: true, chunkCount };
        } catch (error) {
          console.error("Error processing material:", error);
          throw error;
        }
      }
    );

    // Step 3: Generate questions using RAG
    const questionResults = await step.run(
      "generate-questions-with-rag",
      async () => {
        try {
          const material = await prisma.courseMaterial.findUnique({
            where: { id: materialId },
            include: { course: true },
          });

          if (!material) {
            throw new Error("Material not found");
          }

          const questions = [];

          // Generate questions based on pattern
          for (const slot of pattern.slots) {
            console.log(`🎯 Generating questions for slot: ${slot.title}`);

            const questionsPerSlot = slot.hasORQuestions
              ? slot.questionCount * 2
              : slot.questionCount;

            const slotQuestions =
              await questionGenerator.generateContextualQuestions({
                courseId: material.courseId,
                unit: material.unit || undefined,
                marks: slot.marks as Marks,
                category: slot.category as QuestionCategory,
                bloomLevel: slot.bloomLevel,
                coMapping: slot.coMapping,
                topic: material.title,
                count: questionsPerSlot,
              });

            // Store questions in database
            for (const question of slotQuestions) {
              const savedQuestion = await prisma.question.create({
                data: {
                  questionText: question.questionText,
                  marks: question.marks,
                  category: question.category,
                  bloomLevel: question.bloomLevel,
                  coMapping: question.coMapping,
                  unit: question.unit,
                  courseId: material.courseId,
                  materialId: materialId,
                  generationJobId: jobId,
                  difficulty: question.metadata.difficulty,
                  estimatedTime: question.metadata.estimatedTime,
                  context: question.metadata.context,
                },
              });
              questions.push(savedQuestion);
            }

            console.log(
              `✅ Generated ${slotQuestions.length} questions for ${slot.title}`
            );
          }

          return {
            success: true,
            questionCount: questions.length,
            questions: questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              marks: q.marks,
              category: q.category,
              bloomLevel: q.bloomLevel,
            })),
          };
        } catch (error) {
          console.error("Error generating questions:", error);
          throw error;
        }
      }
    );

    // Step 4: Update job status to completed
    await step.run("update-job-status-completed", async () => {
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: ProcessingStatus.COMPLETED,
          completedAt: new Date(),
          result: {
            success: true,
            materialProcessed: processingResult.success,
            chunkCount: processingResult.chunkCount,
            questionsGenerated: questionResults.questionCount,
            questions: questionResults.questions,
          },
        },
      });
      console.log(`🎉 Job ${jobId} completed successfully`);
    });

    return {
      jobId,
      status: "completed",
      materialProcessed: processingResult.success,
      chunkCount: processingResult.chunkCount,
      questionsGenerated: questionResults.questionCount,
    };
  }
);

// Simple material processing job (for testing)
export const processMaterialOnly = inngest.createFunction(
  { id: "process-material-only" },
  { event: "material/process" },
  async ({ event, step }) => {
    const { materialId } = event.data;

    console.log(`📄 Processing material only: ${materialId}`);

    const result = await step.run("process-material-vectors", async () => {
      try {
        await vectorRAG.processUploadedMaterial(materialId);

        // Get chunk count
        const chunkResult = (await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${materialId}
        `) as Array<{ count: bigint }>;

        const chunkCount = Number(chunkResult[0]?.count || 0);

        return {
          success: true,
          materialId,
          chunkCount,
        };
      } catch (error) {
        console.error("Error processing material:", error);
        throw error;
      }
    });

    return result;
  }
);

// Export Inngest serve handler
export default serve({
  client: inngest,
  functions: [processQuestionGeneration, processMaterialOnly],
});
