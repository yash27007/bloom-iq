/**
 * Individual tRPC Test Functions
 * Run specific tests with: bun run test-individual.ts
 */

import { devTests, initTestEnvironment } from "./src/trpc/dev-utils";
import { Role } from "./src/generated/prisma";

// Initialize once
await initTestEnvironment();

console.log("🧪 Available Test Functions:");
console.log("");

// Test 1: List all users
console.log("📋 Test: List all users");
const allUsers = await devTests.getUsers();
console.log(
  `Found ${allUsers.users.length} users:`,
  allUsers.users.map((u) => ({
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
  }))
);
console.log("");

// Test 2: List only admins
console.log("👑 Test: List admin users");
const admins = await devTests.getUsersByRole(Role.ADMIN);
console.log(
  `Found ${admins.users.length} admin(s):`,
  admins.users.map((u) => u.email)
);
console.log("");

// Test 3: Create a course coordinator
console.log("🏫 Test: Create course coordinator");
const coordinator = await devTests.createUser({
  firstName: "Dr. Jane",
  lastName: "Smith",
  email: `coordinator.${Date.now()}@college.edu`,
  role: Role.COURSE_COORDINATOR,
});
console.log(
  "Created coordinator:",
  coordinator.success ? coordinator.user?.email : "Failed"
);
console.log("");

// Test 4: Create a module coordinator
console.log("📚 Test: Create module coordinator");
const moduleCoord = await devTests.createUser({
  firstName: "Prof. John",
  lastName: "Doe",
  email: `module.${Date.now()}@college.edu`,
  role: Role.MODULE_COORDINATOR,
});
console.log(
  "Created module coordinator:",
  moduleCoord.success ? moduleCoord.user?.email : "Failed"
);
console.log("");

// Test 5: Final count
console.log("📊 Final user count:");
const finalUsers = await devTests.getUsers();
console.log(`Total users in system: ${finalUsers.users.length}`);

console.log("");
console.log("✅ All individual tests completed!");
