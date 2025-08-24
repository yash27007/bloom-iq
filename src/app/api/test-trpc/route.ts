/**
 * Test API Route for tRPC
 * Visit: http://localhost:3000/api/test-trpc
 */

import { NextResponse } from "next/server";
import { devTests, initTestEnvironment } from "@/trpc/dev-utils";
import { Role } from "@/generated/prisma";

export async function GET() {
  try {
    console.log("🧪 Running tRPC tests via API...");

    // Initialize test environment
    await initTestEnvironment();

    const results = {
      timestamp: new Date().toISOString(),
      tests: {} as Record<string, unknown>,
    };

    // Test 1: Get users
    console.log("📋 Testing getUsers...");
    const getUsers = await devTests.getUsers();
    results.tests.getUsers = getUsers;

    // Test 2: Get admin users
    console.log("🔍 Testing getUsersByRole...");
    const adminUsers = await devTests.getUsersByRole(Role.ADMIN);
    results.tests.adminUsers = adminUsers;

    // Test 3: Create test user (only if none exist)
    if (!getUsers || getUsers.users.length === 0) {
      console.log("👤 Creating test user...");
      const newUser = await devTests.createUser({
        firstName: "Test",
        lastName: "User",
        email: `api.test.${Date.now()}@college.edu`,
        role: Role.ADMIN, // Using ADMIN since STUDENT doesn't exist in the enum
      });
      results.tests.newUser = newUser;
    }

    return NextResponse.json({
      success: true,
      message: "tRPC tests completed successfully",
      ...results,
    });
  } catch (error) {
    console.error("❌ tRPC test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
