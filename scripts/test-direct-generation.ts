import { PrismaClient } from "@/generated/prisma";
import { processQuestionGeneration } from "@/app/api/questions/generate/route";

const prisma = new PrismaClient();

async function testDirectQuestionGeneration() {
  console.log("🧪 Testing direct question generation...");

  try {
    // Find the first pending job
    const pendingJob = await prisma.questionGenerationJob.findFirst({
      where: {
        status: "PENDING",
      },
      include: {
        course: true,
      },
    });

    if (!pendingJob) {
      console.log("❌ No pending jobs found. Creating a test job...");

      // Get the first course and material
      const course = await prisma.course.findFirst({
        include: {
          courseMaterials: true,
        },
      });

      if (!course || course.courseMaterials.length === 0) {
        console.log(
          "❌ No courses or materials found. Please run the seed script first."
        );
        return;
      }

      const material = course.courseMaterials[0];

      // Create a test job
      const testJob = await prisma.questionGenerationJob.create({
        data: {
          courseId: course.id,
          materialId: material.id,
          unit: 1,
          bloomLevels: JSON.stringify(["UNDERSTAND", "APPLY"]),
          questionTypes: JSON.stringify(["SHORT_ANSWER", "LONG_ANSWER"]),
          difficultyLevels: JSON.stringify(["EASY", "MEDIUM"]),
          questionsPerType: JSON.stringify({ UNDERSTAND: 2, APPLY: 1 }),
          totalQuestions: 3,
          status: "PENDING",
          progress: 0,
          initiatedById: course.courseCoordinatorId,
        },
      });

      console.log(`✅ Created test job: ${testJob.id}`);

      // Now process this job
      console.log("🚀 Starting question generation...");

      await processQuestionGeneration(testJob.id, {
        courseId: course.id,
        materialId: material.id,
        unit: 1,
        questionTypes: ["SHORT_ANSWER", "LONG_ANSWER"],
        difficultyLevels: ["EASY", "MEDIUM"],
        questionsPerBloomLevel: { UNDERSTAND: 2, APPLY: 1 },
      });

      console.log("✅ Question generation completed!");
    } else {
      console.log(
        `🎯 Found pending job: ${pendingJob.id} for course ${pendingJob.course?.courseCode}`
      );

      // Process the existing pending job
      console.log("🚀 Starting question generation...");

      await processQuestionGeneration(pendingJob.id, {
        courseId: pendingJob.courseId,
        materialId: pendingJob.materialId || undefined,
        unit: pendingJob.unit || 1,
        questionTypes: JSON.parse(
          pendingJob.questionTypes || '["SHORT_ANSWER", "LONG_ANSWER"]'
        ),
        difficultyLevels: JSON.parse(
          pendingJob.difficultyLevels || '["EASY", "MEDIUM"]'
        ),
        questionsPerBloomLevel: JSON.parse(
          pendingJob.questionsPerType || '{"UNDERSTAND": 2, "APPLY": 1}'
        ),
      });

      console.log("✅ Question generation completed!");
    }

    // Check the results
    const updatedJob = await prisma.questionGenerationJob.findFirst({
      where: {
        status: "COMPLETED",
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (updatedJob) {
      console.log(
        `\n📊 Job completed with ${updatedJob.generatedCount} questions generated!`
      );

      // Show some generated questions
      const questions = await prisma.question.findMany({
        where: {
          courseId: updatedJob.courseId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      });

      console.log(`\n📝 Sample generated questions:`);
      questions.forEach((q, i) => {
        console.log(
          `\n${i + 1}. [${q.bloomLevel}] [${q.marks}] [Unit ${q.unit}]`
        );
        console.log(`   ${q.question.substring(0, 150)}...`);
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectQuestionGeneration();
