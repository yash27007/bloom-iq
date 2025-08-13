import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { vectorRAG } from "@/lib/supabase-vector-rag";
import { questionGenerator } from "@/lib/advanced-question-generator-v2";
import { ProcessingStatus, Marks, QuestionCategory } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      !["ADMIN", "COURSE_COORDINATOR"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { materialId, action, pattern, testMode } = body;

    console.log(
      `🎯 Question generation request: ${action} for material ${materialId}`
    );

    // Validate material exists and user has access
    const material = await prisma.courseMaterial.findFirst({
      where: {
        id: materialId,
        ...(session.user.role === "COURSE_COORDINATOR" && {
          course: {
            coordinatorId: session.user.id,
          },
        }),
      },
      include: {
        course: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found or access denied" },
        { status: 404 }
      );
    }

    switch (action) {
      case "process-material":
        return await processMaterial(materialId);

      case "generate-questions":
        return await generateQuestions(
          materialId,
          pattern,
          session.user.id,
          testMode
        );

      case "test-generation":
        return await testGeneration(materialId);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in question generation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processMaterial(materialId: string) {
  try {
    console.log(`📄 Processing material: ${materialId}`);

    // Check if already processed
    const existingChunks = (await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${materialId}
    `) as Array<{ count: bigint }>;

    const chunkCount = Number(existingChunks[0]?.count || 0);

    if (chunkCount > 0) {
      return NextResponse.json({
        success: true,
        message: "Material already processed",
        chunkCount,
        alreadyProcessed: true,
      });
    }

    // Process material with vector embeddings
    await vectorRAG.processUploadedMaterial(materialId);

    // Get new chunk count
    const newChunkResult = (await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${materialId}
    `) as Array<{ count: bigint }>;

    const newChunkCount = Number(newChunkResult[0]?.count || 0);

    return NextResponse.json({
      success: true,
      message: "Material processed successfully",
      chunkCount: newChunkCount,
      alreadyProcessed: false,
    });
  } catch (error) {
    console.error("Error processing material:", error);
    return NextResponse.json(
      { error: "Failed to process material" },
      { status: 500 }
    );
  }
}

async function generateQuestions(
  materialId: string,
  pattern: any,
  userId: string,
  testMode: boolean = false
) {
  try {
    console.log(`🎯 Generating questions for material: ${materialId}`);

    // Create job record
    const job = await prisma.questionGenerationJob.create({
      data: {
        materialId,
        userId,
        status: ProcessingStatus.PENDING,
        config: {
          pattern,
          testMode,
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log(`📝 Created job: ${job.id}`);

    if (testMode) {
      // For test mode, process immediately without background job
      try {
        // Update status to processing
        await prisma.questionGenerationJob.update({
          where: { id: job.id },
          data: {
            status: ProcessingStatus.PROCESSING,
            processedAt: new Date(),
          },
        });

        // Generate a few test questions
        const material = await prisma.courseMaterial.findUnique({
          where: { id: materialId },
          include: { course: true },
        });

        if (!material) {
          throw new Error("Material not found");
        }

        const testQuestions =
          await questionGenerator.generateContextualQuestions({
            courseId: material.courseId,
            unit: material.unit || undefined,
            marks: Marks.EIGHT,
            category: QuestionCategory.ANALYTICAL,
            bloomLevel: "L3 - Apply",
            coMapping: "CO1",
            topic: material.title,
            count: 3,
          });

        // Store test questions
        const savedQuestions = [];
        for (const question of testQuestions) {
          const saved = await prisma.question.create({
            data: {
              questionText: question.questionText,
              marks: question.marks,
              category: question.category,
              bloomLevel: question.bloomLevel,
              coMapping: question.coMapping,
              unit: question.unit,
              courseId: material.courseId,
              materialId: materialId,
              generationJobId: job.id,
              difficulty: question.metadata.difficulty,
              estimatedTime: question.metadata.estimatedTime,
              context: question.metadata.context,
            },
          });
          savedQuestions.push(saved);
        }

        // Update job as completed
        await prisma.questionGenerationJob.update({
          where: { id: job.id },
          data: {
            status: ProcessingStatus.COMPLETED,
            completedAt: new Date(),
            result: {
              success: true,
              testMode: true,
              questionsGenerated: savedQuestions.length,
              questions: savedQuestions.map((q) => ({
                id: q.id,
                questionText: q.questionText,
                marks: q.marks,
                category: q.category,
                bloomLevel: q.bloomLevel,
              })),
            },
          },
        });

        return NextResponse.json({
          success: true,
          jobId: job.id,
          status: "completed",
          message: "Test questions generated successfully",
          testMode: true,
          questionsGenerated: savedQuestions.length,
        });
      } catch (error) {
        // Update job as failed
        await prisma.questionGenerationJob.update({
          where: { id: job.id },
          data: {
            status: ProcessingStatus.FAILED,
            completedAt: new Date(),
            result: {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          },
        });
        throw error;
      }
    } else {
      // Use background job for full generation
      try {
        await inngest.send({
          name: "question/generate",
          data: {
            materialId,
            jobId: job.id,
            pattern,
            userId,
          },
        });

        console.log(`🚀 Background job triggered for: ${job.id}`);
      } catch (inngestError) {
        console.warn(
          "Inngest not available, processing synchronously:",
          inngestError
        );

        // Fallback to immediate processing
        setTimeout(async () => {
          try {
            await processJobSynchronously(job.id, materialId, pattern);
          } catch (error) {
            console.error("Error in synchronous processing:", error);
          }
        }, 100);
      }

      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: "pending",
        message: "Question generation job started",
      });
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}

async function testGeneration(materialId: string) {
  try {
    console.log(`🧪 Testing question generation for material: ${materialId}`);

    const material = await prisma.courseMaterial.findUnique({
      where: { id: materialId },
      include: { course: true },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Check if material has vector data
    const chunkResult = (await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${materialId}
    `) as Array<{ count: bigint }>;

    const chunkCount = Number(chunkResult[0]?.count || 0);

    if (chunkCount === 0) {
      return NextResponse.json({
        success: false,
        message: "Material not processed yet. Please process material first.",
        chunkCount: 0,
      });
    }

    // Get relevant context sample
    const contextSample = await vectorRAG.getRelevantContext(
      material.courseId,
      material.unit || undefined,
      material.title,
      3
    );

    // Generate one sample question
    const sampleQuestions = await questionGenerator.generateSimpleQuestions(
      material.courseId,
      1
    );

    return NextResponse.json({
      success: true,
      message: "Test generation successful",
      chunkCount,
      contextSample: contextSample.substring(0, 500) + "...",
      sampleQuestion: sampleQuestions[0] || null,
    });
  } catch (error) {
    console.error("Error in test generation:", error);
    return NextResponse.json(
      { error: "Test generation failed" },
      { status: 500 }
    );
  }
}

// Fallback synchronous processing when Inngest is not available
async function processJobSynchronously(
  jobId: string,
  materialId: string,
  pattern: any
) {
  try {
    console.log(`⚡ Processing job synchronously: ${jobId}`);

    // Update to processing
    await prisma.questionGenerationJob.update({
      where: { id: jobId },
      data: {
        status: ProcessingStatus.PROCESSING,
        processedAt: new Date(),
      },
    });

    const material = await prisma.courseMaterial.findUnique({
      where: { id: materialId },
      include: { course: true },
    });

    if (!material) {
      throw new Error("Material not found");
    }

    const questions = [];

    // Generate questions based on simplified pattern
    const simpleQuestions = await questionGenerator.generateContextualQuestions(
      {
        courseId: material.courseId,
        unit: material.unit || undefined,
        marks: Marks.EIGHT,
        category: QuestionCategory.ANALYTICAL,
        bloomLevel: "L3 - Apply",
        coMapping: "CO1",
        topic: material.title,
        count: 5,
      }
    );

    // Store questions
    for (const question of simpleQuestions) {
      const saved = await prisma.question.create({
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
      questions.push(saved);
    }

    // Update job as completed
    await prisma.questionGenerationJob.update({
      where: { id: jobId },
      data: {
        status: ProcessingStatus.COMPLETED,
        completedAt: new Date(),
        result: {
          success: true,
          questionsGenerated: questions.length,
          synchronousMode: true,
        },
      },
    });

    console.log(`✅ Synchronous job completed: ${jobId}`);
  } catch (error) {
    console.error("Error in synchronous processing:", error);

    // Update job as failed
    await prisma.questionGenerationJob.update({
      where: { id: jobId },
      data: {
        status: ProcessingStatus.FAILED,
        completedAt: new Date(),
        result: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });
  }
}
