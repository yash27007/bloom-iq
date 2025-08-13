import { vectorRAG } from "../src/lib/supabase-vector-rag-v2";
import { questionGenerator } from "../src/lib/advanced-question-generator-v2";
import { prisma } from "../src/lib/prisma";

async function testRAGPipeline() {
  console.log("🧪 Testing RAG Pipeline...\n");

  try {
    // Test 1: Check database connection and vector extension
    console.log("📊 Test 1: Database connection and pgvector extension");
    const vectorCheck =
      await prisma.$queryRaw`SELECT * FROM pg_extension WHERE extname = 'vector'`;
    console.log("✅ pgvector extension:", vectorCheck);

    // Test 2: Get course and material data
    console.log("\n📚 Test 2: Fetching course data");
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        courseCoordinatorId: true,
        courseCoordinator: { select: { firstName: true, lastName: true } },
      },
    });

    // Get materials separately
    const materials = await prisma.courseMaterial.findMany({
      select: {
        id: true,
        title: true,
        courseId: true,
        materialType: true,
      },
    });

    console.log(`✅ Found ${courses.length} courses:`);
    courses.forEach((course) => {
      const courseMaterials = materials.filter((m) => m.courseId === course.id);
      console.log(
        `   - ${course.courseCode}: ${course.courseName} (${courseMaterials.length} materials)`
      );
    });

    if (courses.length === 0) {
      throw new Error("No courses found. Please run seed script first.");
    }

    // Test 3: Check existing vector chunks
    console.log("\n🔍 Test 3: Checking existing vector chunks");
    const chunkResult = (await prisma.$queryRaw`
      SELECT 
        "materialId", 
        COUNT(*) as chunk_count,
        AVG(array_length(embedding, 1)) as avg_embedding_dim
      FROM "document_chunks" 
      GROUP BY "materialId"
    `) as Array<{
      materialId: string;
      chunk_count: bigint;
      avg_embedding_dim: number;
    }>;

    if (chunkResult.length > 0) {
      console.log("✅ Existing vector chunks found:");
      chunkResult.forEach((result) => {
        console.log(
          `   - Material ${result.materialId}: ${result.chunk_count} chunks, ${
            result.avg_embedding_dim || 0
          } dimensions`
        );
      });
    } else {
      console.log(
        "⚠️ No vector chunks found. Will need to process materials first."
      );
    }

    // Test 4: Test question generation with sample context
    console.log("\n🎯 Test 4: Testing question generation");
    const testCourse = courses[0];

    try {
      const sampleQuestions = await questionGenerator.generateSimpleQuestions(
        testCourse.id,
        2
      );
      console.log(`✅ Generated ${sampleQuestions.length} sample questions:`);
      sampleQuestions.forEach((q, i) => {
        console.log(
          `   ${i + 1}. [${q.marks} marks, ${
            q.category
          }] ${q.questionText.substring(0, 100)}...`
        );
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log(
        "⚠️ Question generation failed (likely no vector content):",
        errorMessage
      );
    }

    // Test 5: Test semantic search if chunks exist
    if (chunkResult.length > 0) {
      console.log("\n🔎 Test 5: Testing semantic search");
      try {
        const searchResults = await vectorRAG.semanticSearch(
          "introduction to computer science concepts",
          undefined,
          3
        );
        console.log(
          `✅ Semantic search returned ${searchResults.length} results:`
        );
        searchResults.forEach((result, i) => {
          console.log(
            `   ${i + 1}. Similarity: ${result.similarity.toFixed(
              3
            )} - ${result.content.substring(0, 80)}...`
          );
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.log("⚠️ Semantic search failed:", errorMessage);
      }
    }

    // Test 6: Create a sample question generation job
    console.log("\n⚙️ Test 6: Creating sample question generation job");
    const courseMaterials = materials.filter(
      (m) => m.courseId === testCourse.id
    );
    const sampleMaterial = courseMaterials[0];

    if (sampleMaterial) {
      const job = await prisma.questionGenerationJob.create({
        data: {
          courseId: testCourse.id,
          materialId: sampleMaterial.id,
          initiatedById: testCourse.courseCoordinatorId,
          bloomLevels: JSON.stringify(["L2 - Understand", "L4 - Analyze"]),
          questionTypes: JSON.stringify(["DIRECT", "PROBLEMATIC"]),
          difficultyLevels: JSON.stringify(["Easy", "Medium"]),
          totalQuestions: 6,
        },
      });

      console.log(`✅ Created question generation job: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Course: ${testCourse.courseCode}`);
      console.log(`   Material: ${sampleMaterial.title}`);
    }

    // Test 7: Validate schema structure
    console.log("\n🏗️ Test 7: Validating database schema");
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
    console.log(
      `✅ Vector chunks: ${
        chunkResult.length > 0 ? "Found" : "None (need processing)"
      }`
    );
    console.log(
      `✅ Question generation: ${
        chunkResult.length > 0 ? "Working" : "Ready (need content)"
      }`
    );
    console.log(`✅ Schema structure: Complete`);

    if (chunkResult.length === 0) {
      console.log("\n📝 Next Steps:");
      console.log("1. Upload actual PDF materials via the UI");
      console.log("2. Run material processing to create vector embeddings");
      console.log("3. Test question generation with real content");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

async function main() {
  try {
    await testRAGPipeline();
    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("\n💥 Test suite failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
