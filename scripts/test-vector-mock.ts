import { prisma } from "../src/lib/prisma";

// Mock embedding generation for testing
function generateMockEmbedding(text: string): number[] {
  // Create a simple hash-based embedding (1536 dimensions like text-embedding-004)
  const embedding = new Array(1536).fill(0);

  // Simple hash function to generate consistent "embeddings"
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Fill embedding array with values based on hash
  for (let i = 0; i < 1536; i++) {
    embedding[i] = Math.sin(hash + i) * 0.5; // Normalize to [-0.5, 0.5]
  }

  return embedding;
}

// Mock content for different materials
function getMockContent(materialTitle: string): string {
  if (materialTitle.includes("CS101")) {
    return `Introduction to Computer Science - Course Material

Chapter 1: Fundamentals of Computing
Computer Science is the study of computational systems, algorithms, and the design of computer systems. This field encompasses both theoretical foundations and practical applications.

Key Learning Objectives:
- Understand basic computational thinking
- Learn fundamental programming concepts
- Explore data structures and algorithms
- Apply problem-solving methodologies

1.1 What is Computer Science?
Computer Science combines mathematical rigor with engineering practicality. It involves:
- Algorithm design and analysis
- Programming language concepts
- Computer systems architecture
- Software engineering principles
- Database management
- Network protocols
- Human-computer interaction

1.2 Programming Fundamentals
Programming is the process of creating instructions for computers to execute. Key concepts include:
- Variables and data types (integers, strings, booleans)
- Control structures (if-else, loops, functions)
- Data structures (arrays, lists, trees)
- Object-oriented programming (classes, inheritance, polymorphism)

Applications of Computer Science:
- Artificial Intelligence and Machine Learning
- Web and Mobile Development
- Cybersecurity
- Data Science and Analytics`;
  } else if (materialTitle.includes("CS201")) {
    return `Data Structures and Algorithms - Course Material

Chapter 2: Fundamental Data Structures
Data structures are ways of organizing and storing data to enable efficient access and modification.

2.1 Arrays and Lists
Arrays are collections of elements stored in contiguous memory locations.
- Static arrays: Fixed size determined at compile time
- Dynamic arrays: Size can change during runtime
- Operations: insertion, deletion, search, traversal
- Time complexity: O(1) for access, O(n) for search

2.2 Stacks and Queues
Stack: Last-In-First-Out (LIFO) data structure
- Operations: push(), pop(), top(), isEmpty()
- Applications: function calls, expression evaluation, undo operations

Queue: First-In-First-Out (FIFO) data structure  
- Operations: enqueue(), dequeue(), front(), isEmpty()
- Applications: process scheduling, breadth-first search

2.3 Algorithms and Complexity
Algorithm analysis helps us understand the efficiency of different approaches.
- Time complexity: How runtime scales with input size
- Space complexity: How memory usage scales with input size
- Big O notation: Mathematical description of growth rates`;
  } else {
    return `General Course Material

This document contains comprehensive learning material designed to support academic instruction and student learning outcomes.

Core Concepts:
- Theoretical foundations
- Practical applications  
- Real-world examples
- Problem-solving exercises
- Assessment criteria

Learning Outcomes:
Upon completion of this material, students will be able to:
1. Demonstrate understanding of key concepts
2. Apply theoretical knowledge to practical problems
3. Analyze complex scenarios using appropriate methods
4. Evaluate solutions and make informed decisions
5. Create original work that demonstrates mastery`;
  }
}

// Simple text chunking
function chunkText(text: string, chunkSize: number = 500): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length < chunkSize) {
      currentChunk += sentence + ". ";
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence + ". ";
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function testVectorProcessing() {
  console.log("🔄 Testing Vector Processing...\n");

  try {
    // Get a material to process
    const material = await prisma.courseMaterial.findFirst({
      include: { course: true },
    });

    if (!material) {
      throw new Error("No materials found to process");
    }

    console.log(`📄 Processing material: ${material.title}`);
    console.log(`   Course: ${material.course.courseCode}`);
    console.log(`   Type: ${material.materialType}\n`);

    // Generate mock content
    const content = getMockContent(material.title);
    console.log(`📝 Generated content: ${content.length} characters`);

    // Chunk the content
    const chunks = chunkText(content, 500);
    console.log(`📑 Created ${chunks.length} chunks\n`);

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}`);
      console.log(`   Content preview: ${chunk.substring(0, 80)}...`);

      // Generate mock embedding
      const embedding = generateMockEmbedding(chunk);
      console.log(`   Generated embedding: ${embedding.length} dimensions`);

      // Store in database
      try {
        await prisma.$executeRaw`
          INSERT INTO "document_chunks" (id, "materialId", content, "chunkIndex", embedding, metadata, "createdAt")
          VALUES (
            gen_random_uuid(), 
            ${material.id}, 
            ${chunk}, 
            ${i}, 
            ${embedding}::vector, 
            ${JSON.stringify({
              materialId: material.id,
              courseId: material.courseId,
              courseCode: material.course.courseCode,
              title: material.title,
              unit: material.unit,
              materialType: material.materialType,
            })}::jsonb, 
            NOW()
          )
        `;
        console.log(`   ✅ Stored chunk ${i + 1}`);
      } catch (error) {
        console.log(`   ❌ Error storing chunk ${i + 1}:`, error.message);
      }
    }

    // Verify storage
    const chunkCount = (await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "document_chunks" WHERE "materialId" = ${material.id}
    `) as Array<{ count: bigint }>;

    console.log(`\n✅ Processing complete!`);
    console.log(`   Material: ${material.title}`);
    console.log(`   Chunks stored: ${Number(chunkCount[0]?.count || 0)}`);
    console.log(`   Total content: ${content.length} characters`);

    // Test semantic search with mock
    console.log(`\n🔍 Testing semantic search...`);
    const searchQuery = "programming fundamentals";
    const queryEmbedding = generateMockEmbedding(searchQuery);

    const searchResults = (await prisma.$queryRaw`
      SELECT 
        content,
        metadata,
        1 - (embedding <=> ${queryEmbedding}::vector) as similarity
      FROM "document_chunks"
      WHERE "materialId" = ${material.id}
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT 3
    `) as Array<{
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }>;

    console.log(`✅ Found ${searchResults.length} similar chunks:`);
    searchResults.forEach((result, index) => {
      console.log(
        `   ${index + 1}. Similarity: ${result.similarity.toFixed(3)}`
      );
      console.log(`      Content: ${result.content.substring(0, 100)}...`);
    });
  } catch (error) {
    console.error("❌ Vector processing failed:", error);
    throw error;
  }
}

async function main() {
  try {
    await testVectorProcessing();
    console.log("\n🎉 Vector processing test completed successfully!");
  } catch (error) {
    console.error("\n💥 Vector processing test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
