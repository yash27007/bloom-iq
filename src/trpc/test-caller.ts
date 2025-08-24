import { appRouter } from "./routers/_app";
import { Role } from "@/generated/prisma";

/**
 * Create a test context with mock authentication
 */
export async function createTestContext() {
  // For testing, we create a mock context with a test user session
  return {
    session: {
      user: {
        id: "test-user-id",
        email: "test@college.edu",
        firstName: "Test",
        lastName: "User",
        role: Role.ADMIN, // Use admin role for testing admin procedures
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    },
  };
}

/**
 * Create an unauthenticated test context
 */
export async function createUnauthenticatedTestContext() {
  return {
    session: null,
  };
}

/**
 * Test caller for tRPC procedures
 * This creates a server-side caller that can be used for testing
 */
export async function createTestCaller() {
  // Create a test context with auth
  const ctx = await createTestContext();

  // Create the caller with the context
  const caller = appRouter.createCaller(ctx);

  return caller;
}

/**
 * Create an unauthenticated test caller
 */
export async function createUnauthenticatedTestCaller() {
  const ctx = await createUnauthenticatedTestContext();
  const caller = appRouter.createCaller(ctx);
  return caller;
}

/**
 * Test helper functions for different scenarios
 */
export class TRPCTestHelper {
  private caller: Awaited<ReturnType<typeof createTestCaller>>;

  constructor(caller: Awaited<ReturnType<typeof createTestCaller>>) {
    this.caller = caller;
  }

  // Test admin get users (since hello was removed)
  async testAdminGetUsersBasic() {
    console.log("🧪 Testing admin get users (basic test)...");
    try {
      const result = await this.caller.admin.getUsers({ page: 1, limit: 5 });
      console.log("✅ Admin get users result:", result);
      return result;
    } catch (error) {
      console.error("❌ Admin get users error:", error);
      throw error;
    }
  }

  // Test user signup
  async testUserSignup(userData?: {
    firstName?: string;
    lastName?: string;
    facultyId?: string;
    email?: string;
    password?: string;
    role?: Role;
  }) {
    console.log("🧪 Testing user signup...");
    const defaultData = {
      firstName: "Test",
      lastName: "User",
      facultyId: "TEST123",
      email: `test.user.${Date.now()}@college.edu`,
      password: "password123",
      role: Role.COURSE_COORDINATOR,
      ...userData,
    };

    try {
      const result = await this.caller.user.signUp(defaultData);
      console.log("✅ User signup result:", result);
      return result;
    } catch (error) {
      console.error("❌ User signup error:", error);
      throw error;
    }
  }

  // Test admin add user
  async testAdminAddUser(userData?: {
    firstName?: string;
    lastName?: string;
    facultyId?: string;
    email?: string;
    password?: string;
    role?: Role;
  }) {
    console.log("🧪 Testing admin add user...");
    const defaultData = {
      firstName: "Admin",
      lastName: "Created",
      facultyId: `ADMIN${Date.now()}`,
      email: `admin.created.${Date.now()}@college.edu`,
      password: "password123",
      role: Role.MODULE_COORDINATOR,
      ...userData,
    };

    try {
      const result = await this.caller.admin.addUser(defaultData);
      console.log("✅ Admin add user result:", result);
      return result;
    } catch (error) {
      console.error("❌ Admin add user error:", error);
      throw error;
    }
  }

  // Test admin get users
  async testAdminGetUsers(options?: {
    page?: number;
    limit?: number;
    role?: Role;
  }) {
    console.log("🧪 Testing admin get users...");
    const defaultOptions = {
      page: 1,
      limit: 10,
      ...options,
    };

    try {
      const result = await this.caller.admin.getUsers(defaultOptions);
      console.log("✅ Admin get users result:", result);
      return result;
    } catch (error) {
      console.error("❌ Admin get users error:", error);
      throw error;
    }
  }

  // Test admin update user role
  async testAdminUpdateUserRole(userId: string, newRole: Role) {
    console.log("🧪 Testing admin update user role...");
    try {
      const result = await this.caller.admin.updateUserRole({
        id: userId,
        role: newRole,
      });
      console.log("✅ Admin update user role result:", result);
      return result;
    } catch (error) {
      console.error("❌ Admin update user role error:", error);
      throw error;
    }
  }

  // Test admin delete user
  async testAdminDeleteUser(userId: string) {
    console.log("🧪 Testing admin delete user...");
    try {
      const result = await this.caller.admin.deleteUser({ id: userId });
      console.log("✅ Admin delete user result:", result);
      return result;
    } catch (error) {
      console.error("❌ Admin delete user error:", error);
      throw error;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log("🚀 Starting comprehensive tRPC tests...\n");

    try {
      // Test 1: Basic admin functionality
      await this.testAdminGetUsersBasic();
      console.log();

      // Test 2: User signup
      const userSignupResult = await this.testUserSignup();
      console.log();

      // Test 3: Admin add user
      const adminAddResult = await this.testAdminAddUser();
      console.log();

      // Test 4: Get users with pagination
      await this.testAdminGetUsers();
      console.log();

      // Test 5: Get users with role filter
      await this.testAdminGetUsers({ role: Role.ADMIN });
      console.log();

      console.log("🎉 All tests completed successfully!");

      return {
        userSignupResult,
        adminAddResult,
      };
    } catch (error) {
      console.error("💥 Test suite failed:", error);
      throw error;
    }
  }
}

/**
 * Quick test runner - you can call this function to test everything
 */
export async function runQuickTests() {
  console.log("📋 Creating test caller...");
  const caller = await createTestCaller();
  const testHelper = new TRPCTestHelper(caller);

  return await testHelper.runAllTests();
}

/**
 * Individual procedure tests
 */
export async function quickTestGetUsers() {
  const caller = await createTestCaller();
  return await caller.admin.getUsers({ page: 1, limit: 5 });
}

export async function quickTestUserSignup(email?: string) {
  const caller = await createTestCaller();
  return await caller.user.signUp({
    firstName: "Quick",
    lastName: "Test",
    facultyId: `QUICK${Date.now()}`,
    email: email || `quick.test.${Date.now()}@college.edu`,
    password: "password123",
    role: Role.COURSE_COORDINATOR,
  });
}

export async function quickTestAdminAddUser(email?: string) {
  const caller = await createTestCaller();
  return await caller.admin.addUser({
    firstName: "Admin",
    lastName: "Test",
    facultyId: `ADMINTEST${Date.now()}`,
    email: email || `admin.test.${Date.now()}@college.edu`,
    password: "password123",
    role: Role.PROGRAM_COORDINATOR,
  });
}

// Example usage (you can uncomment and run these):
/*
// Run individual tests
quickTestGetUsers().then(console.log).catch(console.error);
quickTestUserSignup().then(console.log).catch(console.error);
quickTestAdminAddUser().then(console.log).catch(console.error);

// Run all tests
runQuickTests().then(console.log).catch(console.error);
*/
