import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function testQuestionGeneration() {
  console.log("🧪 Testing question generation system...");

  try {
    // Check if we have any jobs
    const jobs = await prisma.questionGenerationJob.findMany({
      include: {
        course: {
          select: {
            courseCode: true,
            courseName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`📋 Found ${jobs.length} question generation jobs:`);

    for (const job of jobs) {
      console.log(`\n🎯 Job ID: ${job.id}`);
      console.log(
        `📚 Course: ${job.course?.courseCode} - ${job.course?.courseName}`
      );
      console.log(`📊 Status: ${job.status}`);
      console.log(`📈 Progress: ${job.progress}%`);
      console.log(`🔢 Generated: ${job.generatedCount || 0} questions`);
      console.log(`📅 Created: ${job.createdAt.toLocaleString()}`);

      if (job.errorMessage) {
        console.log(`❌ Error: ${job.errorMessage}`);
      }
    }

    // Check questions created
    const questions = await prisma.question.findMany({
      select: {
        id: true,
        question: true,
        bloomLevel: true,
        marks: true,
        unit: true,
        course: {
          select: {
            courseCode: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    console.log(
      `\n📝 Found ${questions.length} questions in database (showing last 10):`
    );

    for (const question of questions) {
      console.log(
        `\n🔸 ${question.course?.courseCode} | Unit ${question.unit} | ${question.marks} | ${question.bloomLevel}`
      );
      console.log(`   Question: ${question.question.substring(0, 100)}...`);
    }

    // Check course materials
    const materials = await prisma.courseMaterial.findMany({
      include: {
        course: {
          select: {
            courseCode: true,
            courseName: true,
          },
        },
      },
    });

    console.log(`\n📄 Found ${materials.length} course materials:`);

    for (const material of materials) {
      console.log(
        `📂 ${material.course?.courseCode}: ${material.title} (${material.materialType})`
      );
      console.log(`   File: ${material.filePath}`);
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuestionGeneration();
