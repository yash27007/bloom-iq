/**
 * Quick tRPC Test Script
 * Run this with: node test-trpc.js
 */

const { devTests, initTestEnvironment } = require("./src/trpc/dev-utils");
const { Role } = require("./src/generated/prisma");

async function runTests() {
  console.log("🚀 Starting tRPC Tests...\n");

  try {
    // Initialize test environment
    await initTestEnvironment();

    // Test 1: Get all users
    console.log("📋 Test 1: Getting all users...");
    const users = await devTests.getUsers();
    console.log("Users found:", users?.length || 0);
    console.log("Users:", users);
    console.log("");

    // Test 2: Create a new user
    console.log("👤 Test 2: Creating a new user...");
    const newUser = await devTests.createUser({
      firstName: "Test",
      lastName: "User",
      email: `test.user.${Date.now()}@college.edu`,
      role: "STUDENT", // Use string instead of Role enum
    });
    console.log("Created user:", newUser);
    console.log("");

    // Test 3: Get users by role
    console.log("🔍 Test 3: Getting admin users...");
    const adminUsers = await devTests.getUsersByRole("ADMIN");
    console.log("Admin users:", adminUsers);
    console.log("");

    // Test 4: Get updated user list
    console.log("📋 Test 4: Getting updated user list...");
    const updatedUsers = await devTests.getUsers();
    console.log("Total users now:", updatedUsers?.length || 0);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Error details:", error.message);
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log("🏁 Test script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script error:", error);
    process.exit(1);
  });
