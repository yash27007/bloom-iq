/**
 * Comprehensive Admin Router Test Suite
 * Tests all admin functionalities including user management and course management
 *
 * Run with: bun run test-admin.ts
 */

import { createTestCaller } from "./src/trpc/test-caller";
import { Role } from "./src/generated/prisma";

// Test data
const testUsers = {
  admin: {
    firstName: "Admin",
    lastName: "User",
    email: `admin.${Date.now()}@college.edu`,
    facultyId: `ADMIN${Date.now()}`,
    password: "admin123",
    role: Role.ADMIN,
  },
  courseCoordinator: {
    firstName: "Course",
    lastName: "Coordinator",
    email: `course.${Date.now()}@college.edu`,
    facultyId: `CC${Date.now()}`,
    password: "course123",
    role: Role.COURSE_COORDINATOR,
  },
  moduleCoordinator: {
    firstName: "Module",
    lastName: "Coordinator",
    email: `module.${Date.now()}@college.edu`,
    facultyId: `MC${Date.now()}`,
    password: "module123",
    role: Role.MODULE_COORDINATOR,
  },
  programCoordinator: {
    firstName: "Program",
    lastName: "Coordinator",
    email: `program.${Date.now()}@college.edu`,
    facultyId: `PC${Date.now()}`,
    password: "program123",
    role: Role.PROGRAM_COORDINATOR,
  },
  controller: {
    firstName: "Controller",
    lastName: "Examination",
    email: `controller.${Date.now()}@college.edu`,
    facultyId: `COE${Date.now()}`,
    password: "controller123",
    role: Role.CONTROLLER_OF_EXAMINATION,
  },
};

const testCourse = {
  courseCode: `CS${Date.now()}`,
  courseName: `Test Course ${Date.now()}`,
};

// Store created IDs for cleanup and cross-references
const createdIds = {
  users: [] as string[],
  courses: [] as string[],
};

async function runAdminTests() {
  console.log("🚀 Starting Comprehensive Admin Tests...\n");

  const caller = await createTestCaller();
  let testsPassed = 0;
  let testsFailed = 0;

  function logTest(name: string, success: boolean, details?: unknown) {
    const emoji = success ? "✅" : "❌";
    console.log(`${emoji} ${name}`);
    if (details) {
      console.log(`   ${JSON.stringify(details, null, 2)}`);
    }
    if (success) testsPassed++;
    else testsFailed++;
    console.log("");
  }

  try {
    console.log(
      "==================== USER MANAGEMENT TESTS ====================\n"
    );

    // Test 1: Create Users
    console.log("📝 Test 1: Creating test users...");
    const createdUsers: Record<
      string,
      { id: string; email: string; role: string }
    > = {};

    for (const [key, userData] of Object.entries(testUsers)) {
      try {
        const result = await caller.admin.addUser(userData);
        if (result?.success && result.data) {
          createdUsers[key] = result.data;
          createdIds.users.push(result.data.id);
          logTest(`Create ${key}`, true, {
            email: result.data.email,
            role: result.data.role,
          });
        } else {
          logTest(`Create ${key}`, false, result);
        }
      } catch (error) {
        logTest(
          `Create ${key}`,
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Test 2: Get All Users
    console.log("📋 Test 2: Fetching all users...");
    try {
      const allUsers = await caller.admin.getUsers({});
      logTest("Get all users", allUsers.success, {
        users: allUsers.data?.map((user) => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          facultyId: user.facultyId,
          role: user.role,
          createdAt: user.createdAt,
        })),
        pagination: allUsers.pagination,
      });
    } catch (error) {
      logTest(
        "Get all users",
        false,
        error instanceof Error ? error.message : error
      );
    }

    // Test 3: Get Users with Pagination
    console.log("📄 Test 3: Testing pagination...");
    try {
      const paginatedUsers = await caller.admin.getUsers({ page: 1, limit: 3 });
      logTest("Paginated users", paginatedUsers.success, {
        users: paginatedUsers.data?.map((user) => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        })),
        pagination: paginatedUsers.pagination,
      });
    } catch (error) {
      logTest(
        "Paginated users",
        false,
        error instanceof Error ? error.message : error
      );
    }

    // Test 4: Filter Users by Role
    console.log("🔍 Test 4: Filtering users by role...");
    try {
      const adminUsers = await caller.admin.getUsers({ role: Role.ADMIN });
      logTest("Filter by ADMIN role", adminUsers.success, {
        adminUsers: adminUsers.data?.map((user) => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          facultyId: user.facultyId,
          role: user.role,
        })),
        pagination: adminUsers.pagination,
      });
    } catch (error) {
      logTest(
        "Filter by ADMIN role",
        false,
        error instanceof Error ? error.message : error
      );
    }

    // Test 5: Search Users
    console.log("🔎 Test 5: Searching users...");
    try {
      const searchResults = await caller.admin.getUsers({
        search: "coordinator",
      });
      logTest('Search for "coordinator"', searchResults.success, {
        foundUsers: searchResults.data?.map((user) => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          facultyId: user.facultyId,
        })),
        pagination: searchResults.pagination,
      });
    } catch (error) {
      logTest(
        'Search for "coordinator"',
        false,
        error instanceof Error ? error.message : error
      );
    }

    // Test 5.5: Test User Sorting
    console.log("🔄 Test 5.5: Testing user sorting...");
    try {
      const sortedUsers = await caller.admin.getUsers({
        sortBy: "firstName",
        sortOrder: "asc",
        limit: 5,
      });
      logTest("Users sorted by firstName", sortedUsers.success, {
        sortedUsers: sortedUsers.data?.map((user) => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        })),
        pagination: sortedUsers.pagination,
        sortedBy: "firstName ASC",
      });
    } catch (error) {
      logTest(
        "Users sorted by firstName",
        false,
        error instanceof Error ? error.message : error
      );
    }

    // Test 6: Get User by ID
    if (createdUsers.admin) {
      console.log("👤 Test 6: Get user by ID...");
      try {
        const userById = await caller.admin.getUserById({
          id: createdUsers.admin.id,
        });
        logTest("Get user by ID", userById.success, {
          user: {
            name: `${userById.data?.firstName} ${userById.data?.lastName}`,
            email: userById.data?.email,
            facultyId: userById.data?.facultyId,
            role: userById.data?.role,
            createdAt: userById.data?.createdAt,
            // Show associated courses if any
            coordinatedCourses: {
              asCourseCoordinator:
                userById.data?.CourseCoordinatorCourses?.length || 0,
              asModuleCoordinator:
                userById.data?.ModuleCoordinatorCourses?.length || 0,
              asProgramCoordinator:
                userById.data?.ProgramCoordinatorCourses?.length || 0,
            },
          },
        });
      } catch (error) {
        logTest(
          "Get user by ID",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Test 7: Update User
    if (createdUsers.admin) {
      console.log("✏️ Test 7: Updating user...");
      try {
        const updatedUser = await caller.admin.updateUser({
          id: createdUsers.admin.id,
          firstName: "Updated Admin",
        });
        if (updatedUser) {
          logTest("Update user", updatedUser.success, {
            newName: updatedUser.data?.firstName,
          });
        }
      } catch (error) {
        logTest(
          "Update user",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Test 8: Get Eligible Coordinators
    console.log("👥 Test 8: Get eligible coordinators...");
    try {
      const coordinators = await caller.admin.getEligibleCoordinators({});
      logTest("Get eligible coordinators", coordinators.success, {
        coordinators: coordinators.data?.map((coord) => ({
          name: `${coord.firstName} ${coord.lastName}`,
          email: coord.email,
          facultyId: coord.facultyId,
          role: coord.role,
        })),
        totalCount: coordinators.data?.length || 0,
      });
    } catch (error) {
      logTest(
        "Get eligible coordinators",
        false,
        error instanceof Error ? error.message : error
      );
    }

    console.log(
      "==================== COURSE MANAGEMENT TESTS ====================\n"
    );

    // Test 9: Create Course (requires coordinators)
    if (
      createdUsers.courseCoordinator &&
      createdUsers.moduleCoordinator &&
      createdUsers.programCoordinator
    ) {
      console.log("📚 Test 9: Creating test course...");
      try {
        const courseData = {
          ...testCourse,
          courseCoordinatorId: createdUsers.courseCoordinator.id,
          moduleCoordinatorId: createdUsers.moduleCoordinator.id,
          programCoordinatorId: createdUsers.programCoordinator.id,
        };

        const createdCourse = await caller.admin.addCourse(courseData);
        if (createdCourse?.success && createdCourse.data) {
          createdIds.courses.push(createdCourse.data.id);
        }
        logTest("Create course", createdCourse?.success || false, {
          courseCode: createdCourse?.data?.courseCode,
          courseName: createdCourse?.data?.courseName,
        });
      } catch (error) {
        logTest(
          "Create course",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Test 10: Get All Courses
    console.log("📚 Test 10: Fetching all courses...");
    try {
      const allCourses = await caller.admin.getCourses({});
      logTest("Get all courses", allCourses.success, {
        courses: allCourses.data?.map((course) => ({
          courseCode: course.courseCode,
          courseName: course.courseName,
          coordinators: {
            courseCoordinator: course.courseCoordinator
              ? `${course.courseCoordinator.firstName} ${course.courseCoordinator.lastName} (${course.courseCoordinator.email})`
              : "None",
            moduleCoordinator: course.moduleCoordinator
              ? `${course.moduleCoordinator.firstName} ${course.moduleCoordinator.lastName} (${course.moduleCoordinator.email})`
              : "None",
            programCoordinator: course.programCoordinator
              ? `${course.programCoordinator.firstName} ${course.programCoordinator.lastName} (${course.programCoordinator.email})`
              : "None",
          },
          statistics: {
            questions: course._count?.questions || 0,
            materials: course._count?.materials || 0,
            paperPatterns: course._count?.paperPatterns || 0,
            generatedPapers: course._count?.generatedPapers || 0,
          },
        })),
        pagination: allCourses.pagination,
      });
    } catch (error) {
      logTest(
        "Get all courses",
        false,
        error instanceof Error ? error.message : error
      );
    }

    // Test 10.5: Test Course Pagination and Sorting
    console.log("📄 Test 10.5: Testing course pagination and sorting...");
    try {
      const sortedCourses = await caller.admin.getCourses({
        page: 1,
        limit: 5,
        sortBy: "courseCode",
        sortOrder: "asc",
      });
      logTest("Paginated and sorted courses", sortedCourses.success, {
        courses: sortedCourses.data?.map((course) => ({
          courseCode: course.courseCode,
          courseName: course.courseName,
        })),
        pagination: sortedCourses.pagination,
        sortedBy: "courseCode ASC",
      });
    } catch (error) {
      logTest(
        "Paginated and sorted courses",
        false,
        error instanceof Error ? error.message : error
      );
    }

    // Test 11: Get Course by ID
    if (createdIds.courses.length > 0) {
      console.log("📖 Test 11: Get course by ID...");
      try {
        const courseById = await caller.admin.getCourseById({
          id: createdIds.courses[0],
        });
        logTest("Get course by ID", courseById.success, {
          course: {
            courseCode: courseById.data?.courseCode,
            courseName: courseById.data?.courseName,
            coordinators: {
              courseCoordinator: courseById.data?.courseCoordinator
                ? {
                    name: `${courseById.data.courseCoordinator.firstName} ${courseById.data.courseCoordinator.lastName}`,
                    email: courseById.data.courseCoordinator.email,
                    facultyId: courseById.data.courseCoordinator.facultyId,
                  }
                : null,
              moduleCoordinator: courseById.data?.moduleCoordinator
                ? {
                    name: `${courseById.data.moduleCoordinator.firstName} ${courseById.data.moduleCoordinator.lastName}`,
                    email: courseById.data.moduleCoordinator.email,
                    facultyId: courseById.data.moduleCoordinator.facultyId,
                  }
                : null,
              programCoordinator: courseById.data?.programCoordinator
                ? {
                    name: `${courseById.data.programCoordinator.firstName} ${courseById.data.programCoordinator.lastName}`,
                    email: courseById.data.programCoordinator.email,
                    facultyId: courseById.data.programCoordinator.facultyId,
                  }
                : null,
            },
            statistics: {
              questions: courseById.data?._count?.questions || 0,
              materials: courseById.data?._count?.materials || 0,
              paperPatterns: courseById.data?._count?.paperPatterns || 0,
              generatedPapers: courseById.data?._count?.generatedPapers || 0,
            },
          },
        });
      } catch (error) {
        logTest(
          "Get course by ID",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Test 12: Update Course
    if (createdIds.courses.length > 0) {
      console.log("✏️ Test 12: Updating course...");
      try {
        const updatedCourse = await caller.admin.updateCourse({
          id: createdIds.courses[0],
          courseName: "Updated Course Name",
        });
        if (updatedCourse) {
          logTest("Update course", updatedCourse.success, {
            newName: updatedCourse.data?.courseName,
          });
        }
      } catch (error) {
        logTest(
          "Update course",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      "==================== BULK OPERATIONS TESTS ====================\n"
    );

    // Test 13: Bulk Delete Courses (if any were created)
    if (createdIds.courses.length > 0) {
      console.log("🗑️ Test 13: Bulk delete courses...");
      try {
        const bulkDeleteResult = await caller.admin.bulkDeleteCourses({
          ids: createdIds.courses,
        });
        logTest("Bulk delete courses", bulkDeleteResult.success, {
          deletedCount: createdIds.courses.length,
        });
        createdIds.courses = []; // Clear since they're deleted
      } catch (error) {
        logTest(
          "Bulk delete courses",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Test 14: Delete Individual User
    if (createdIds.users.length > 0) {
      console.log("🗑️ Test 14: Delete individual user...");
      try {
        const deleteResult = await caller.admin.deleteUser({
          id: createdIds.users[0],
        });
        if (deleteResult) {
          logTest("Delete individual user", deleteResult.success);
          createdIds.users.shift(); // Remove from tracking
        }
      } catch (error) {
        logTest(
          "Delete individual user",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Test 15: Bulk Delete Remaining Users
    if (createdIds.users.length > 0) {
      console.log("🗑️ Test 15: Bulk delete remaining users...");
      try {
        const bulkDeleteResult = await caller.admin.bulkDeleteUsers({
          ids: createdIds.users,
        });
        logTest("Bulk delete users", bulkDeleteResult.success, {
          deletedCount: createdIds.users.length,
        });
        createdIds.users = []; // Clear since they're deleted
      } catch (error) {
        logTest(
          "Bulk delete users",
          false,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      "==================== ERROR HANDLING TESTS ====================\n"
    );

    // Test 16: Invalid User Creation
    console.log("⚠️ Test 16: Testing invalid user creation...");
    try {
      await caller.admin.addUser({
        firstName: "", // Invalid: empty
        lastName: "Test",
        email: "invalid-email", // Invalid format
        facultyId: "TEST123",
        password: "123", // Too short
        role: Role.ADMIN,
      });
      logTest(
        "Invalid user creation (should fail)",
        false,
        "Expected validation error"
      );
    } catch {
      logTest(
        "Invalid user creation (expected to fail)",
        true,
        "Validation worked correctly"
      );
    }

    // Test 17: Non-existent User Retrieval
    console.log("🔍 Test 17: Get non-existent user...");
    try {
      await caller.admin.getUserById({ id: "non-existent-id" });
      logTest(
        "Get non-existent user (should fail)",
        false,
        "Expected not found error"
      );
    } catch {
      logTest(
        "Get non-existent user (expected to fail)",
        true,
        "Error handling worked correctly"
      );
    }

    // Test 18: Invalid Course Creation (wrong coordinator roles)
    if (createdUsers.admin) {
      console.log("📚 Test 18: Invalid course creation...");
      try {
        await caller.admin.addCourse({
          courseCode: "INVALID",
          courseName: "Invalid Course",
          courseCoordinatorId: createdUsers.admin.id, // Admin, not course coordinator
          moduleCoordinatorId: createdUsers.admin.id, // Admin, not module coordinator
          programCoordinatorId: createdUsers.admin.id, // Admin, not program coordinator
        });
        logTest(
          "Invalid course creation (should fail)",
          false,
          "Expected role validation error"
        );
      } catch {
        logTest(
          "Invalid course creation (expected to fail)",
          true,
          "Role validation worked correctly"
        );
      }
    }
  } catch (error) {
    console.error("💥 Fatal test error:", error);
  }

  // Final summary
  console.log("==================== TEST SUMMARY ====================\n");
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(
    `📊 Success Rate: ${(
      (testsPassed / (testsPassed + testsFailed)) *
      100
    ).toFixed(1)}%`
  );

  if (testsFailed === 0) {
    console.log(
      "🎉 All tests passed! Admin functionality is working correctly."
    );
  } else {
    console.log("⚠️ Some tests failed. Please review the output above.");
  }
}

// Cleanup function
async function cleanup() {
  console.log("\n🧹 Cleaning up test data...");
  const caller = await createTestCaller();

  try {
    // Clean up any remaining courses
    if (createdIds.courses.length > 0) {
      await caller.admin.bulkDeleteCourses({ ids: createdIds.courses });
      console.log(`🗑️ Cleaned up ${createdIds.courses.length} courses`);
    }

    // Clean up any remaining users
    if (createdIds.users.length > 0) {
      await caller.admin.bulkDeleteUsers({ ids: createdIds.users });
      console.log(`🗑️ Cleaned up ${createdIds.users.length} users`);
    }

    console.log("✅ Cleanup completed");
  } catch (error) {
    console.log(
      "⚠️ Cleanup error (may be expected):",
      error instanceof Error ? error.message : error
    );
  }
}

// Run tests with cleanup
runAdminTests()
  .then(() => cleanup())
  .then(() => {
    console.log("\n🏁 Admin test suite completed!");
  })
  .catch((error) => {
    console.error("💥 Test suite error:", error);
    return cleanup();
  });
