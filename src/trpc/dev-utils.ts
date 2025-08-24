/**
 * Development utilities for testing tRPC procedures
 * Import this in your development files to test procedures
 */

import { createTestCaller, TRPCTestHelper } from "./test-caller";
import { Role } from "@/generated/prisma";

// Global test caller instance
let testCaller: Awaited<ReturnType<typeof createTestCaller>> | null = null;
let testHelper: TRPCTestHelper | null = null;

/**
 * Initialize the test environment (call this once)
 */
export async function initTestEnvironment() {
  if (!testCaller) {
    console.log("🔧 Initializing tRPC test environment...");
    testCaller = await createTestCaller();
    testHelper = new TRPCTestHelper(testCaller);
    console.log("✅ Test environment ready!");
  }
  return { testCaller, testHelper };
}

/**
 * Get the test caller (initializes if needed)
 */
export async function getTestCaller() {
  if (!testCaller) {
    await initTestEnvironment();
  }
  return testCaller!;
}

/**
 * Get the test helper (initializes if needed)
 */
export async function getTestHelper() {
  if (!testHelper) {
    await initTestEnvironment();
  }
  return testHelper!;
}

/**
 * Quick test functions for development
 */
export const devTests = {
  async getUsers(page = 1, limit = 10) {
    const caller = await getTestCaller();
    return await caller.admin.getUsers({ page, limit });
  },

  async createUser(data?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: Role;
  }) {
    const caller = await getTestCaller();
    const userData = {
      firstName: data?.firstName || "Dev",
      lastName: data?.lastName || "User",
      facultyId: `DEV${Date.now()}`,
      email: data?.email || `dev.user.${Date.now()}@college.edu`,
      password: "password123",
      role: data?.role || Role.COURSE_COORDINATOR,
    };

    return await caller.admin.addUser(userData);
  },

  async listUsers(page = 1, limit = 10) {
    const caller = await getTestCaller();
    return await caller.admin.getUsers({ page, limit });
  },

  async getUsersByRole(role: Role) {
    const caller = await getTestCaller();
    return await caller.admin.getUsers({ page: 1, limit: 10, role });
  },

  async deleteUser(userId: string) {
    const caller = await getTestCaller();
    return await caller.admin.deleteUser({ id: userId });
  },

  async updateUserRole(userId: string, role: Role) {
    const caller = await getTestCaller();
    return await caller.admin.updateUserRole({ id: userId, role });
  },
};

/**
 * Example usage in your development files:
 *
 * import { devTests } from '@/trpc/dev-utils';
 *
 * // Test get users
 * devTests.getUsers().then(console.log);
 *
 * // Create a user
 * devTests.createUser({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john.doe@college.edu',
 *   role: Role.ADMIN
 * }).then(console.log);
 *
 * // List users
 * devTests.listUsers().then(console.log);
 *
 * // List admins only
 * devTests.getUsersByRole(Role.ADMIN).then(console.log);
 */

// Pre-defined test data for quick testing
export const testData = {
  users: {
    admin: {
      firstName: "Admin",
      lastName: "User",
      email: `admin.${Date.now()}@college.edu`,
      role: Role.ADMIN,
    },
    courseCoordinator: {
      firstName: "Course",
      lastName: "Coordinator",
      email: `course.coordinator.${Date.now()}@college.edu`,
      role: Role.COURSE_COORDINATOR,
    },
    moduleCoordinator: {
      firstName: "Module",
      lastName: "Coordinator",
      email: `module.coordinator.${Date.now()}@college.edu`,
      role: Role.MODULE_COORDINATOR,
    },
    programCoordinator: {
      firstName: "Program",
      lastName: "Coordinator",
      email: `program.coordinator.${Date.now()}@college.edu`,
      role: Role.PROGRAM_COORDINATOR,
    },
    examController: {
      firstName: "Exam",
      lastName: "Controller",
      email: `exam.controller.${Date.now()}@college.edu`,
      role: Role.CONTROLLER_OF_EXAMINATION,
    },
  },
};

/**
 * Create test users for each role
 */
export async function seedTestUsers() {
  console.log("🌱 Seeding test users...");
  const results = [];

  for (const [roleName, userData] of Object.entries(testData.users)) {
    try {
      console.log(`Creating ${roleName}...`);
      const result = await devTests.createUser(userData);
      results.push({ roleName, result });
      console.log(`✅ ${roleName} created successfully`);
    } catch (error) {
      console.error(`❌ Failed to create ${roleName}:`, error);
      results.push({ roleName, error });
    }
  }

  console.log("🌱 Seeding completed!");
  return results;
}

// Default export
const devUtilsExport = {
  initTestEnvironment,
  getTestCaller,
  getTestHelper,
  devTests,
  testData,
  seedTestUsers,
};

export default devUtilsExport;
