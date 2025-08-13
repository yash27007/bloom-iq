// Simple test script to verify question generation
const { PrismaClient } = require("./src/generated/prisma");

async function testQuestionGeneration() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Testing question generation workflow...");

    // Check if we have any courses
    const courses = await prisma.course.findMany({
      take: 1,
      include: {
        materials: true,
      },
    });

    if (courses.length === 0) {
      console.log("❌ No courses found. Please create a course first.");
      return;
    }

    const course = courses[0];
    console.log(`✅ Found course: ${course.title}`);

    // Check if course has materials
    if (course.materials.length === 0) {
      console.log(
        "❌ No materials found for this course. Please upload materials first."
      );
      return;
    }

    const material = course.materials[0];
    console.log(`✅ Found material: ${material.title}`);

    // Create a test question generation job
    const job = await prisma.questionGenerationJob.create({
      data: {
        courseId: course.id,
        materialId: material.id,
        unit: 1,
        questionsPerBloomLevel: {
          REMEMBER: 2,
          UNDERSTAND: 2,
          APPLY: 1,
        },
        questionTypes: ["MCQ", "SHORT_ANSWER"],
        difficultyLevels: ["EASY", "MEDIUM"],
        marks: [2, 8],
        status: "PENDING",
        progress: 0,
        generatedCount: 0,
      },
    });

    console.log(`✅ Created test job: ${job.id}`);

    // Check the job was created successfully
    const createdJob = await prisma.questionGenerationJob.findUnique({
      where: { id: job.id },
      include: {
        course: true,
        material: true,
      },
    });

    if (createdJob) {
      console.log("✅ Job created successfully in database");
      console.log(`   Course: ${createdJob.course.title}`);
      console.log(`   Material: ${createdJob.material.title}`);
      console.log(`   Status: ${createdJob.status}`);
      console.log(`   Progress: ${createdJob.progress}%`);
    }

    console.log(
      "\n🎉 Question generation workflow test completed successfully!"
    );
    console.log("\nNext steps:");
    console.log("1. Login to the dashboard at http://localhost:3001");
    console.log("2. Navigate to Course Coordinator dashboard");
    console.log("3. Select a course and trigger AI question generation");
    console.log("4. Monitor the job status in real-time");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testQuestionGeneration();
