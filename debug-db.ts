import { prisma } from "./src/lib/prisma";

async function debugDatabase() {
  console.log("🔍 Debugging database records...\n");

  // Check all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  console.log("📤 All users:");
  users.forEach(user => {
    console.log(`  - ${user.email} (${user.role}) - ID: ${user.id}`);
  });

  // Check all courses
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      courseCode: true,
      courseName: true,
      courseCoordinatorId: true,
      moduleCoordinatorId: true,
      programCoordinatorId: true,
    },
  });

  console.log("\n📚 All courses:");
  courses.forEach(course => {
    console.log(`  - ${course.courseCode}: ${course.courseName}`);
    console.log(`    Course Coordinator ID: ${course.courseCoordinatorId}`);
    console.log(`    Module Coordinator ID: ${course.moduleCoordinatorId}`);
    console.log(`    Program Coordinator ID: ${course.programCoordinatorId}`);
  });

  // Find james@gmail.com specifically
  const jamesUser = await prisma.user.findUnique({
    where: { email: "james@gmail.com" },
  });

  if (jamesUser) {
    console.log(`\n👤 James user found: ID = ${jamesUser.id}, Role = ${jamesUser.role}`);
    
    // Find courses where James is assigned
    const jamesCourses = await prisma.course.findMany({
      where: {
        OR: [
          { courseCoordinatorId: jamesUser.id },
          { moduleCoordinatorId: jamesUser.id },
          { programCoordinatorId: jamesUser.id },
        ],
      },
    });

    console.log(`📖 Courses assigned to James: ${jamesCourses.length}`);
    jamesCourses.forEach(course => {
      console.log(`  - ${course.courseCode}: ${course.courseName}`);
    });
  } else {
    console.log("\n❌ James user not found!");
  }

  await prisma.$disconnect();
}

debugDatabase().catch(console.error);
