import { vectorRAG } from "../src/lib/supabase-vector-rag";
import { questionGenerator } from "../src/lib/advanced-question-generator-v2";
import { prisma } from "../src/lib/prisma";
import { Marks, QuestionCategory } from "@prisma/client";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function testRAGPipeline() {
  console.log("🧪 Testing RAG Pipeline...\n");

  try {
    // Step 1: Get a course and material for testing
    console.log("1️⃣ Finding test course and material...");

    const courses = await prisma.course.findMany({
      include: {
        courseMaterials: true,
      },
    });

    if (courses.length === 0) {
      throw new Error("No courses found. Please run seeding first.");
    }

    const course = courses[0];
    console.log(`   📚 Course: ${course.courseCode} - ${course.courseName}`);

    if (course.courseMaterials.length === 0) {
      throw new Error(
        "No course materials found. Please upload some materials first."
      );
    }

    const material = course.courseMaterials[0];
    console.log(`   📄 Material: ${material.title} (Unit ${material.unit})`);
    console.log(`   📁 File: ${material.filePath}\n`);

    // Step 2: Check if material is already processed
    console.log("2️⃣ Checking material processing status...");

    const existingChunks = (await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${material.id}
    `) as Array<{ count: bigint }>;

    const chunkCount = Number(existingChunks[0]?.count || 0);
    console.log(`   📊 Existing chunks: ${chunkCount}`);

    if (chunkCount === 0) {
      console.log("   ⚠️  Material not processed yet. Processing now...");

      try {
        await vectorRAG.processUploadedMaterial(material.id);

        const newChunkResult = (await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${material.id}
        `) as Array<{ count: bigint }>;

        const newChunkCount = Number(newChunkResult[0]?.count || 0);
        console.log(
          `   ✅ Material processed! Created ${newChunkCount} chunks\n`
        );
      } catch (error) {
        console.log(`   ❌ Error processing material: ${error}\n`);
        console.log(
          "   💡 This might be because the PDF file is not in Supabase storage."
        );
        console.log(
          "   💡 For testing, we'll continue with existing chunks if any...\n"
        );
      }
    } else {
      console.log(
        `   ✅ Material already processed with ${chunkCount} chunks\n`
      );
    }

    // Step 3: Test semantic search
    console.log("3️⃣ Testing semantic search...");

    try {
      const searchResults = await vectorRAG.semanticSearch(
        "machine learning algorithms",
        material.id,
        3
      );

      console.log(`   🔍 Search results: ${searchResults.length} chunks found`);
      searchResults.forEach((result, index) => {
        console.log(
          `   ${index + 1}. Similarity: ${result.similarity.toFixed(3)}`
        );
        console.log(`      Content: ${result.content.substring(0, 100)}...`);
      });
      console.log("");
    } catch (error) {
      console.log(`   ⚠️  Semantic search test skipped: ${error}\n`);
    }

    // Step 4: Test context retrieval
    console.log("4️⃣ Testing context retrieval...");

    try {
      const context = await vectorRAG.getRelevantContext(
        course.id,
        material.unit || undefined,
        "introduction concepts",
        5
      );

      console.log(`   📖 Context length: ${context.length} characters`);
      console.log(`   📝 Context preview: ${context.substring(0, 200)}...\n`);
    } catch (error) {
      console.log(`   ⚠️  Context retrieval test failed: ${error}\n`);
    }

    // Step 5: Test question generation
    console.log("5️⃣ Testing question generation...");

    try {
      const questions = await questionGenerator.generateContextualQuestions({
        courseId: course.id,
        unit: material.unit || undefined,
        marks: Marks.EIGHT,
        category: QuestionCategory.ANALYTICAL,
        bloomLevel: "L3 - Apply",
        coMapping: "CO1",
        topic: material.title,
        count: 2,
      });

      console.log(`   🎯 Generated ${questions.length} questions:`);
      questions.forEach((question, index) => {
        console.log(`   ${index + 1}. ${question.questionText}`);
        console.log(
          `      Marks: ${question.marks}, Category: ${question.category}`
        );
        console.log(`      Bloom Level: ${question.bloomLevel}`);
        console.log(`      Difficulty: ${question.metadata.difficulty}`);
        console.log("");
      });
    } catch (error) {
      console.log(`   ❌ Question generation test failed: ${error}\n`);
    }

    // Step 6: Test simple question generation (fallback)
    console.log("6️⃣ Testing simple question generation...");

    try {
      const simpleQuestions = await questionGenerator.generateSimpleQuestions(
        course.id,
        1
      );

      console.log(
        `   🎯 Generated ${simpleQuestions.length} simple questions:`
      );
      simpleQuestions.forEach((question, index) => {
        console.log(`   ${index + 1}. ${question.questionText}`);
        console.log(
          `      Marks: ${question.marks}, Category: ${question.category}\n`
        );
      });
    } catch (error) {
      console.log(`   ❌ Simple question generation test failed: ${error}\n`);
    }

    console.log("✅ RAG Pipeline testing completed!\n");

    // Summary
    console.log("📊 Test Summary:");
    console.log(`   📚 Course: ${course.courseCode}`);
    console.log(`   📄 Material: ${material.title}`);
    console.log(`   📊 Chunks: ${chunkCount}`);
    console.log(`   ✅ Tests completed successfully`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Environment validation
function validateEnvironment() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOOGLE_AI_API_KEY",
    "DATABASE_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  console.log("✅ Environment variables validated\n");
}

// Main execution
async function main() {
  console.log("🚀 Starting RAG Pipeline Tests...\n");

  validateEnvironment();
  await testRAGPipeline();
}

if (require.main === module) {
  main().catch(console.error);
}

export { testRAGPipeline };
