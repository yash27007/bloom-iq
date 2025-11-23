/**
 * Test script for content chunking functionality
 * Run with: bun test-chunking.ts
 */

import {
  chunkContent,
  distributeQuestionsAcrossChunks,
  estimateTokens,
} from "./src/lib/content-chunker";

// Sample educational content (simulating a parsed PDF)
const sampleContent = `
# Introduction to Thermodynamics

Thermodynamics is the branch of physics that deals with heat, work, temperature, and their relation to energy, entropy, and the physical properties of matter and radiation.

## First Law of Thermodynamics

The first law of thermodynamics is a version of the law of conservation of energy, adapted for thermodynamic processes. It distinguishes in principle two forms of energy transfer, heat and thermodynamic work, that modify a thermodynamic system containing a constant amount of matter.

### Energy Conservation Principle

Energy can neither be created nor destroyed; rather, it can only be transformed or transferred from one form to another. In the context of thermodynamics:

- The total energy of an isolated system remains constant
- Energy can be converted between different forms
- Heat and work are two forms of energy transfer

### Mathematical Formulation

The first law can be expressed as: ΔU = Q - W

Where:
- ΔU is the change in internal energy
- Q is the heat added to the system
- W is the work done by the system

## Second Law of Thermodynamics

The second law of thermodynamics establishes the concept of entropy as a physical property of a thermodynamic system. It predicts whether processes are forbidden despite obeying the requirement of conservation of energy as expressed in the first law.

### Entropy and Disorder

Entropy is a measure of the disorder or randomness in a system. The second law states that:

- The total entropy of an isolated system can never decrease over time
- Entropy can remain constant in ideal cases where the system is in thermodynamic equilibrium
- In all spontaneous processes, the total entropy always increases

### Carnot Cycle

The Carnot cycle is a theoretical thermodynamic cycle that provides an upper limit on the efficiency that any classical thermodynamic engine can achieve during the conversion of heat into work.

Key characteristics:
1. Consists of four reversible processes
2. Operates between two heat reservoirs
3. Maximum possible efficiency for any heat engine

## Third Law of Thermodynamics

The third law of thermodynamics states that the entropy of a system approaches a constant value as the temperature approaches absolute zero. At absolute zero (0 Kelvin), the entropy of a perfect crystal is exactly zero.

### Implications

- Perfect crystals at absolute zero have no disorder
- It is impossible to reach absolute zero in a finite number of steps
- This law provides an absolute reference point for the determination of entropy

## Heat Transfer Mechanisms

Heat transfer is the movement of thermal energy from one object or material to another. There are three fundamental modes of heat transfer:

### Conduction

Conduction is the transfer of heat through direct contact. It occurs when:
- Molecules in a hotter region vibrate more rapidly
- These vibrations are transferred to adjacent molecules
- No bulk motion of the material occurs

Materials with high thermal conductivity (like metals) transfer heat quickly, while insulators (like wood) transfer heat slowly.

### Convection

Convection is the transfer of heat by the movement of fluids (liquids or gases). Types include:

- Natural convection: Fluid motion caused by buoyancy forces due to density differences
- Forced convection: Fluid motion caused by external means like fans or pumps

### Radiation

Radiation is the transfer of heat through electromagnetic waves. Key points:
- Does not require a medium
- Can occur in a vacuum
- All objects emit thermal radiation
- The amount depends on temperature and surface properties

## Applications of Thermodynamics

Thermodynamics has numerous practical applications in engineering and science:

### Power Generation

- Steam turbines in power plants
- Internal combustion engines
- Gas turbines for electricity generation

### Refrigeration and Air Conditioning

- Heat pumps
- Refrigerators
- Air conditioning systems
- Cryogenic systems

### Chemical Processes

- Industrial chemical reactions
- Petroleum refining
- Material synthesis and processing

## Problems and Exercises

### Problem 1: First Law Application

Calculate the change in internal energy of a system that absorbs 500 J of heat and performs 200 J of work.

### Problem 2: Efficiency Calculation

A heat engine operates between two reservoirs at 600 K and 300 K. Calculate the maximum possible efficiency.

### Problem 3: Heat Transfer

Determine the rate of heat transfer through a copper rod of length 1 m, cross-sectional area 0.01 m², with ends at 100°C and 0°C.
`;

async function runTests() {
  console.log("=".repeat(80));
  console.log("CONTENT CHUNKING TEST");
  console.log("=".repeat(80));
  console.log();

  // Test 1: Estimate tokens
  console.log("TEST 1: Token Estimation");
  console.log("-".repeat(80));
  const totalTokens = estimateTokens(sampleContent);
  console.log(`Total tokens in sample content: ${totalTokens}`);
  console.log(`Total characters: ${sampleContent.length}`);
  console.log(
    `Ratio: ${(sampleContent.length / totalTokens).toFixed(2)} chars per token`
  );
  console.log();

  // Test 2: Chunk content with different sizes
  console.log("TEST 2: Chunking with max 2000 tokens per chunk");
  console.log("-".repeat(80));
  const chunks = await chunkContent(sampleContent, {
    maxTokensPerChunk: 2000,
    minTokensPerChunk: 500,
    method: "by-heading",
  });

  console.log(`\nCreated ${chunks.length} chunks:\n`);
  chunks.forEach((chunk, index) => {
    console.log(`Chunk ${index + 1}:`);
    console.log(`  ID: ${chunk.id}`);
    console.log(`  Title: ${chunk.title}`);
    console.log(`  Tokens: ${chunk.tokens}`);
    console.log(`  Lines: ${chunk.startLine} - ${chunk.endLine}`);
    console.log(`  Keywords: ${chunk.metadata.topicKeywords.join(", ")}`);
    console.log(`  Preview: ${chunk.content.substring(0, 100)}...`);
    console.log();
  });

  // Test 3: Question distribution
  console.log("TEST 3: Question Distribution Across Chunks");
  console.log("-".repeat(80));
  const questionRequirements = {
    difficulty: {
      easy: 10,
      medium: 15,
      hard: 5,
    },
    bloomLevels: {
      remember: 5,
      understand: 8,
      apply: 7,
      analyze: 5,
      evaluate: 3,
      create: 2,
    },
  };

  console.log("\nUser Requirements:");
  console.log("  Difficulty:", questionRequirements.difficulty);
  console.log("  Bloom Levels:", questionRequirements.bloomLevels);
  console.log();

  const distribution = distributeQuestionsAcrossChunks(
    chunks,
    questionRequirements
  );

  console.log("Distribution across chunks:\n");
  distribution.forEach((dist, index) => {
    const totalQuestions =
      dist.difficulty.easy + dist.difficulty.medium + dist.difficulty.hard;

    console.log(`Chunk ${index + 1} (${chunks[index].title}):`);
    console.log(`  Total Questions: ${totalQuestions}`);
    console.log(
      `  Difficulty: Easy=${dist.difficulty.easy}, Medium=${dist.difficulty.medium}, Hard=${dist.difficulty.hard}`
    );
    console.log(
      `  Bloom: R=${dist.bloomLevels.remember}, U=${dist.bloomLevels.understand}, Ap=${dist.bloomLevels.apply}, An=${dist.bloomLevels.analyze}, E=${dist.bloomLevels.evaluate}, C=${dist.bloomLevels.create}`
    );
    console.log();
  });

  // Verify totals
  const totalDistributed = {
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

  console.log("VERIFICATION - Total Questions Distributed:");
  console.log(
    `  Easy: ${totalDistributed.easy}/${questionRequirements.difficulty.easy}`
  );
  console.log(
    `  Medium: ${totalDistributed.medium}/${questionRequirements.difficulty.medium}`
  );
  console.log(
    `  Hard: ${totalDistributed.hard}/${questionRequirements.difficulty.hard}`
  );
  console.log(
    `  Remember: ${totalDistributed.remember}/${questionRequirements.bloomLevels.remember}`
  );
  console.log(
    `  Understand: ${totalDistributed.understand}/${questionRequirements.bloomLevels.understand}`
  );
  console.log(
    `  Apply: ${totalDistributed.apply}/${questionRequirements.bloomLevels.apply}`
  );
  console.log(
    `  Analyze: ${totalDistributed.analyze}/${questionRequirements.bloomLevels.analyze}`
  );
  console.log(
    `  Evaluate: ${totalDistributed.evaluate}/${questionRequirements.bloomLevels.evaluate}`
  );
  console.log(
    `  Create: ${totalDistributed.create}/${questionRequirements.bloomLevels.create}`
  );
  console.log();

  // Test 4: Small content (no chunking needed)
  console.log("TEST 4: Small Content (Should Return Single Chunk)");
  console.log("-".repeat(80));
  const smallContent = `
# Quick Topic

This is a short piece of content that doesn't need chunking.

## Subtopic

Just a few paragraphs here.
`;

  const smallChunks = await chunkContent(smallContent, {
    maxTokensPerChunk: 2000,
  });

  console.log(`Small content created ${smallChunks.length} chunk(s)`);
  console.log(`Tokens: ${smallChunks[0].tokens}`);
  console.log();

  console.log("=".repeat(80));
  console.log("ALL TESTS COMPLETED SUCCESSFULLY ✓");
  console.log("=".repeat(80));
}

// Run tests
runTests().catch(console.error);
