import { PrismaClient } from "@/generated/prisma";
import { hash } from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
    },
  });

  if (existingAdmin) {
    console.log("✅ Admin user already exists");
  } else {
    // Create admin user
    const hashedPassword = await hash("Admin@123");

    const admin = await prisma.user.create({
      data: {
        firstName: "System",
        lastName: "Administrator",
        email: "admin@bloomiq.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("✅ Admin user created:", {
      email: admin.email,
      role: admin.role,
    });
  }

  // Create course coordinator
  let coordinator = await prisma.user.findFirst({
    where: { email: "coordinator@bloomiq.com" },
  });

  if (!coordinator) {
    const coordinatorPassword = await hash("Coordinator@123");
    coordinator = await prisma.user.create({
      data: {
        firstName: "Course",
        lastName: "Coordinator",
        email: "coordinator@bloomiq.com",
        password: coordinatorPassword,
        role: "COURSE_COORDINATOR",
      },
    });
    console.log("✅ Course coordinator created:", coordinator.email);
  }

  // Create module coordinator
  let moduleCoordinator = await prisma.user.findFirst({
    where: { email: "module@bloomiq.com" },
  });

  if (!moduleCoordinator) {
    const modulePassword = await hash("Module@123");
    moduleCoordinator = await prisma.user.create({
      data: {
        firstName: "Module",
        lastName: "Coordinator",
        email: "module@bloomiq.com",
        password: modulePassword,
        role: "MODULE_COORDINATOR",
      },
    });
    console.log("✅ Module coordinator created:", moduleCoordinator.email);
  }

  // Create program coordinator
  let programCoordinator = await prisma.user.findFirst({
    where: { email: "program@bloomiq.com" },
  });

  if (!programCoordinator) {
    const programPassword = await hash("Program@123");
    programCoordinator = await prisma.user.create({
      data: {
        firstName: "Program",
        lastName: "Coordinator",
        email: "program@bloomiq.com",
        password: programPassword,
        role: "PROGRAM_COORDINATOR",
      },
    });
    console.log("✅ Program coordinator created:", programCoordinator.email);
  }

  // Create sample courses
  const courses = [
    {
      courseCode: "CS101",
      courseName: "Introduction to Computer Science",
    },
    {
      courseCode: "CS201",
      courseName: "Data Structures and Algorithms",
    },
    {
      courseCode: "CS301",
      courseName: "Database Management Systems",
    },
    {
      courseCode: "CS401",
      courseName: "Software Engineering",
    },
  ];

  for (const courseData of courses) {
    const existingCourse = await prisma.course.findFirst({
      where: { courseCode: courseData.courseCode },
    });

    if (!existingCourse) {
      const course = await prisma.course.create({
        data: {
          courseCode: courseData.courseCode,
          courseName: courseData.courseName,
          courseCoordinatorId: coordinator.id,
          moduleCoordinatorId: moduleCoordinator.id,
          programCoordinatorId: programCoordinator.id,
        },
      });
      console.log("✅ Course created:", course.courseCode);

      // Create sample materials for each course
      await prisma.courseMaterial.create({
        data: {
          title: `${courseData.courseCode} Syllabus`,
          filePath: `syllabus/${courseData.courseCode.toLowerCase()}_syllabus.pdf`,
          materialType: "SYLLABUS",
          courseId: course.id,
          uploadedById: coordinator.id,
          unit: null,
        },
      });

      await prisma.courseMaterial.create({
        data: {
          title: `${courseData.courseCode} Unit 1 Notes`,
          filePath: `materials/${courseData.courseCode.toLowerCase()}_unit1.pdf`,
          materialType: "UNIT_MATERIAL",
          courseId: course.id,
          uploadedById: coordinator.id,
          unit: 1,
        },
      });
    }
  }

  console.log("🎉 Seed completed successfully!");
  console.log("\n📝 Login credentials:");
  console.log("Admin: admin@bloomiq.com / Admin@123");
  console.log("Course Coordinator: coordinator@bloomiq.com / Coordinator@123");
  console.log("Module Coordinator: module@bloomiq.com / Module@123");
  console.log("Program Coordinator: program@bloomiq.com / Program@123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
