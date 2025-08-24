#!/usr/bin/env tsx
/**
 * Simple test script to run tRPC procedure tests
 * Run this with: npx tsx src/trpc/test-procedures.ts
 */

import { runQuickTests, quickTestGetUsers } from "./test-caller";

async function main() {
  console.log("🔧 tRPC Procedure Test Runner");
  console.log("================================\n");

  try {
    // Test individual procedures first
    console.log("1️⃣ Testing Get Users Procedure:");
    const usersResult = await quickTestGetUsers();
    console.log("Result:", usersResult);
    console.log();

    console.log("2️⃣ Running Full Test Suite:");
    await runQuickTests();
    console.log();

    console.log("✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);
