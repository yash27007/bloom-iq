import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function cleanupOldQuestions() {
  console.log("🧹 Cleaning up old questions with outdated types...");

  try {
    // Delete all existing questions
    const deleteResult = await prisma.question.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} questions`);

    // Reset question generation jobs to pending
    const resetResult = await prisma.questionGenerationJob.updateMany({
      where: {
        status: "COMPLETED",
      },
      data: {
        status: "PENDING",
        progress: 0,
        generatedCount: 0,
      },
    });
    console.log(`✅ Reset ${resetResult.count} completed jobs to pending`);

    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldQuestions();
