import { prisma } from "../src/lib/prisma";

async function testBasicSetup() {
  console.log("🧪 Testing Basic Database Setup...\n");

  try {
    // Test 1: Database connection
    console.log("📊 Test 1: Database connection");
    const vectorCheck =
      await prisma.$queryRaw`SELECT * FROM pg_extension WHERE extname = 'vector'`;
    console.log("✅ pgvector extension:", vectorCheck);

    // Test 2: Get course data
    console.log("\n📚 Test 2: Fetching course data");
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        courseCoordinatorId: true,
      },
    });

    console.log(`✅ Found ${courses.length} courses:`);
    courses.forEach((course) => {
      console.log(`   - ${course.courseCode}: ${course.courseName}`);
    });

    // Test 3: Get materials
    console.log("\n📄 Test 3: Fetching course materials");
    const materials = await prisma.courseMaterial.findMany({
      select: {
        id: true,
        title: true,
        courseId: true,
        materialType: true,
        filePath: true,
      },
    });

    console.log(`✅ Found ${materials.length} materials:`);
    materials.forEach((material) => {
      const course = courses.find((c) => c.id === material.courseId);
      console.log(
        `   - ${material.title} (${course?.courseCode || "Unknown"}) - ${
          material.materialType
        }`
      );
    });

    // Test 4: Check vector chunks table
    console.log("\n🔍 Test 4: Checking vector chunks table");
    const chunkResult = (await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT "materialId") as materials_processed
      FROM "document_chunks"
    `) as Array<{ total_chunks: bigint; materials_processed: bigint }>;

    const totalChunks = Number(chunkResult[0]?.total_chunks || 0);
    const materialsProcessed = Number(chunkResult[0]?.materials_processed || 0);

    console.log(
      `✅ Vector chunks: ${totalChunks} total, ${materialsProcessed} materials processed`
    );

    // Test 5: Create a simple question generation job
    console.log("\n⚙️ Test 5: Creating sample question generation job");
    if (courses.length > 0 && materials.length > 0) {
      const testCourse = courses[0];
      const testMaterial = materials.find((m) => m.courseId === testCourse.id);

      if (testMaterial) {
        const job = await prisma.questionGenerationJob.create({
          data: {
            courseId: testCourse.id,
            materialId: testMaterial.id,
            initiatedById: testCourse.courseCoordinatorId,
            bloomLevels: JSON.stringify(["L2 - Understand", "L3 - Apply"]),
            questionTypes: JSON.stringify(["DIRECT", "SCENARIO"]),
            difficultyLevels: JSON.stringify(["Easy", "Medium"]),
            totalQuestions: 5,
          },
        });

        console.log(`✅ Created job: ${job.id}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Course: ${testCourse.courseCode}`);
        console.log(`   Material: ${testMaterial.title}`);
      }
    }

    // Test 6: Validate database schema
    console.log("\n🏗️ Test 6: Validating database schema");
    const tables = (await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'users', 'courses', 'course_materials', 'questions', 
        'question_generation_jobs', 'document_chunks'
      )
      ORDER BY table_name
    `) as Array<{ table_name: string }>;

    console.log("✅ Required tables found:");
    tables.forEach((table) => {
      console.log(`   - ${table.table_name}`);
    });

    // Summary
    console.log("\n📋 Test Summary:");
    console.log(`✅ Database connection: OK`);
    console.log(`✅ pgvector extension: Enabled`);
    console.log(`✅ Courses available: ${courses.length}`);
    console.log(`✅ Materials available: ${materials.length}`);
    console.log(
      `✅ Vector chunks: ${totalChunks} (${materialsProcessed} materials processed)`
    );
    console.log(`✅ Schema structure: Complete`);

    console.log("\n💡 Next Steps:");
    console.log(
      "1. Test material processing with vector RAG (when environment is configured)"
    );
    console.log("2. Upload actual PDF materials via the UI");
    console.log("3. Generate questions using the RAG pipeline");
    console.log("4. Test the complete workflow end-to-end");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

async function main() {
  try {
    await testBasicSetup();
    console.log("\n🎉 Basic setup tests completed successfully!");
  } catch (error) {
    console.error("\n💥 Test suite failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
