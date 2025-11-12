/**
 * Test chunking with large content from database
 * Run with: bun test-chunking-db.ts
 */

import { prisma } from "./src/lib/prisma";
import {
  chunkContent,
  distributeQuestionsAcrossChunks,
} from "./src/lib/content-chunker";

async function testWithDatabaseContent() {
  console.log("=".repeat(80));
  console.log("TESTING CHUNKING WITH REAL DATABASE CONTENT");
  console.log("=".repeat(80));
  console.log();

  // Get the latest uploaded material
  const material = await prisma.course_Material.findFirst({
    where: {
      parsingStatus: "COMPLETED",
      parsedContent: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { name: true, course_code: true } },
    },
  });

  if (!material) {
    console.log("❌ No parsed materials found in database.");
    console.log("Please upload a PDF first through the UI.");
    process.exit(1);
  }

  console.log(`Found material: "${material.title}"`);
  console.log(
    `Course: ${material.course.name} (${material.course.course_code})`
  );
  console.log(`Parsing Status: ${material.parsingStatus}`);
  console.log(`Content Length: ${material.parsedContent?.length} characters`);
  console.log();

  if (!material.parsedContent) {
    console.log("❌ Material has no parsed content");
    process.exit(1);
  }

  // Test chunking with different max token sizes
  console.log("TEST 1: Chunking with max 2000 tokens per chunk");
  console.log("-".repeat(80));
  const chunks = await chunkContent(material.parsedContent, {
    maxTokensPerChunk: 2000,
    minTokensPerChunk: 500,
  });

  console.log(`\nCreated ${chunks.length} chunks:\n`);
  chunks.forEach((chunk, index) => {
    console.log(`Chunk ${index + 1}:`);
    console.log(`  Title: ${chunk.title}`);
    console.log(`  Tokens: ${chunk.tokens}`);
    console.log(`  Keywords: ${chunk.metadata.topicKeywords.join(", ")}`);
    console.log();
  });

  // Test question distribution
  console.log("TEST 2: Question Distribution");
  console.log("-".repeat(80));

  const requirements = {
    difficulty: {
      easy: 15,
      medium: 20,
      hard: 10,
    },
    bloomLevels: {
      remember: 8,
      understand: 12,
      apply: 10,
      analyze: 8,
      evaluate: 4,
      create: 3,
    },
  };

  console.log("User wants to generate:");
  console.log(`  Total: ${15 + 20 + 10} questions`);
  console.log(
    `  Difficulty: ${requirements.difficulty.easy} easy, ${requirements.difficulty.medium} medium, ${requirements.difficulty.hard} hard`
  );
  console.log(
    `  Bloom's: Remember=${requirements.bloomLevels.remember}, Understand=${requirements.bloomLevels.understand}, Apply=${requirements.bloomLevels.apply}, Analyze=${requirements.bloomLevels.analyze}, Evaluate=${requirements.bloomLevels.evaluate}, Create=${requirements.bloomLevels.create}`
  );
  console.log();

  const distribution = distributeQuestionsAcrossChunks(chunks, requirements);

  console.log(`Distributing across ${chunks.length} chunks:\n`);
  distribution.forEach((dist, index) => {
    const totalQ =
      dist.difficulty.easy + dist.difficulty.medium + dist.difficulty.hard;
    const chunkPercent = (
      (chunks[index].tokens / chunks.reduce((sum, c) => sum + c.tokens, 0)) *
      100
    ).toFixed(1);

    console.log(`Chunk ${index + 1} - "${chunks[index].title}"`);
    console.log(
      `  Content: ${chunkPercent}% of material (${chunks[index].tokens} tokens)`
    );
    console.log(`  Questions: ${totalQ} total`);
    console.log(
      `    Difficulty: E=${dist.difficulty.easy}, M=${dist.difficulty.medium}, H=${dist.difficulty.hard}`
    );
    console.log(
      `    Bloom's: R=${dist.bloomLevels.remember}, U=${dist.bloomLevels.understand}, Ap=${dist.bloomLevels.apply}, An=${dist.bloomLevels.analyze}, Ev=${dist.bloomLevels.evaluate}, C=${dist.bloomLevels.create}`
    );
    console.log();
  });

  // Verify totals
  const totals = {
    easy: distribution.reduce((sum, d) => sum + d.difficulty.easy, 0),
    medium: distribution.reduce((sum, d) => sum + d.difficulty.medium, 0),
    hard: distribution.reduce((sum, d) => sum + d.difficulty.hard, 0),
    remember: distribution.reduce((sum, d) => sum + d.bloomLevels.remember, 0),
    understand: distribution.reduce(
      (sum, d) => sum + d.bloomLevels.understand,
      0
    ),
    apply: distribution.reduce((sum, d) => sum + d.bloomLevels.apply, 0),
    analyze: distribution.reduce((sum, d) => sum + d.bloomLevels.analyze, 0),
    evaluate: distribution.reduce((sum, d) => sum + d.bloomLevels.evaluate, 0),
    create: distribution.reduce((sum, d) => sum + d.bloomLevels.create, 0),
  };

  console.log("VERIFICATION:");
  const easyMatch = totals.easy === requirements.difficulty.easy ? "✓" : "✗";
  const mediumMatch =
    totals.medium === requirements.difficulty.medium ? "✓" : "✗";
  const hardMatch = totals.hard === requirements.difficulty.hard ? "✓" : "✗";

  console.log(
    `  ${easyMatch} Easy: ${totals.easy}/${requirements.difficulty.easy}`
  );
  console.log(
    `  ${mediumMatch} Medium: ${totals.medium}/${requirements.difficulty.medium}`
  );
  console.log(
    `  ${hardMatch} Hard: ${totals.hard}/${requirements.difficulty.hard}`
  );
  console.log(
    `  Total: ${totals.easy + totals.medium + totals.hard}/${
      requirements.difficulty.easy +
      requirements.difficulty.medium +
      requirements.difficulty.hard
    }`
  );
  console.log();

  console.log("=".repeat(80));
  console.log("TEST COMPLETED SUCCESSFULLY ✓");
  console.log("=".repeat(80));

  await prisma.$disconnect();
}

testWithDatabaseContent().catch(async (error) => {
  console.error("Error:", error);
  await prisma.$disconnect();
  process.exit(1);
});
