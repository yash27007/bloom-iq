import { PrismaClient, Role } from "@/generated/prisma";
import { hashPassword } from "@/app/actions";

const prisma = new PrismaClient();

const userData = [
  // Course Coordinators
  {
    firstName: "Alice",
    lastName: "Johnson",
    facultyId: "CC001",
    email: "alice.johnson@university.edu",
    role: Role.COURSE_COORDINATOR,
    password: "password123",
  },
  {
    firstName: "Bob",
    lastName: "Smith",
    facultyId: "CC002",
    email: "bob.smith@university.edu",
    role: Role.COURSE_COORDINATOR,
    password: "password123",
  },
  {
    firstName: "Carol",
    lastName: "Davis",
    facultyId: "CC003",
    email: "carol.davis@university.edu",
    role: Role.COURSE_COORDINATOR,
    password: "password123",
  },
  {
    firstName: "David",
    lastName: "Wilson",
    facultyId: "CC004",
    email: "david.wilson@university.edu",
    role: Role.COURSE_COORDINATOR,
    password: "password123",
  },
  {
    firstName: "Eva",
    lastName: "Brown",
    facultyId: "CC005",
    email: "eva.brown@university.edu",
    role: Role.COURSE_COORDINATOR,
    password: "password123",
  },

  // Module Coordinators
  {
    firstName: "Frank",
    lastName: "Miller",
    facultyId: "MC001",
    email: "frank.miller@university.edu",
    role: Role.MODULE_COORDINATOR,
    password: "password123",
  },
  {
    firstName: "Grace",
    lastName: "Taylor",
    facultyId: "MC002",
    email: "grace.taylor@university.edu",
    role: Role.MODULE_COORDINATOR,
    password: "password123",
  },
  {
    firstName: "Henry",
    lastName: "Anderson",
    facultyId: "MC003",
    email: "henry.anderson@university.edu",
    role: Role.MODULE_COORDINATOR,
    password: "password123",
  },

  // Program Coordinators
  {
    firstName: "Iris",
    lastName: "Thomas",
    facultyId: "PC001",
    email: "iris.thomas@university.edu",
    role: Role.PROGRAM_COORDINATOR,
    password: "password123",
  },
  {
    firstName: "Jack",
    lastName: "Jackson",
    facultyId: "PC002",
    email: "jack.jackson@university.edu",
    role: Role.PROGRAM_COORDINATOR,
    password: "password123",
  },

  // Admin
  {
    firstName: "Admin",
    lastName: "User",
    facultyId: "ADMIN001",
    email: "admin@university.edu",
    role: Role.ADMIN,
    password: "admin123",
  },
];

const courseData = [
  {
    courseCode: "CS101",
    courseName: "Introduction to Computer Science",
    courseCoordinatorEmail: "alice.johnson@university.edu",
    moduleCoordinatorEmail: "frank.miller@university.edu",
    programCoordinatorEmail: "iris.thomas@university.edu",
  },
  {
    courseCode: "CS102",
    courseName: "Data Structures and Algorithms",
    courseCoordinatorEmail: "bob.smith@university.edu",
    moduleCoordinatorEmail: "frank.miller@university.edu",
    programCoordinatorEmail: "iris.thomas@university.edu",
  },
  {
    courseCode: "CS201",
    courseName: "Object-Oriented Programming",
    courseCoordinatorEmail: "carol.davis@university.edu",
    moduleCoordinatorEmail: "grace.taylor@university.edu",
    programCoordinatorEmail: "iris.thomas@university.edu",
  },
  {
    courseCode: "CS202",
    courseName: "Database Management Systems",
    courseCoordinatorEmail: "david.wilson@university.edu",
    moduleCoordinatorEmail: "grace.taylor@university.edu",
    programCoordinatorEmail: "jack.jackson@university.edu",
  },
  {
    courseCode: "CS301",
    courseName: "Software Engineering",
    courseCoordinatorEmail: "eva.brown@university.edu",
    moduleCoordinatorEmail: "henry.anderson@university.edu",
    programCoordinatorEmail: "jack.jackson@university.edu",
  },
  {
    courseCode: "CS302",
    courseName: "Computer Networks",
    courseCoordinatorEmail: "alice.johnson@university.edu",
    moduleCoordinatorEmail: "henry.anderson@university.edu",
    programCoordinatorEmail: "jack.jackson@university.edu",
  },
  {
    courseCode: "MATH101",
    courseName: "Calculus I",
    courseCoordinatorEmail: "bob.smith@university.edu",
    moduleCoordinatorEmail: "frank.miller@university.edu",
    programCoordinatorEmail: "iris.thomas@university.edu",
  },
  {
    courseCode: "MATH201",
    courseName: "Linear Algebra",
    courseCoordinatorEmail: "carol.davis@university.edu",
    moduleCoordinatorEmail: "grace.taylor@university.edu",
    programCoordinatorEmail: "iris.thomas@university.edu",
  },
  {
    courseCode: "PHYS101",
    courseName: "Physics for Engineers",
    courseCoordinatorEmail: "david.wilson@university.edu",
    moduleCoordinatorEmail: "frank.miller@university.edu",
    programCoordinatorEmail: "iris.thomas@university.edu",
  },
  {
    courseCode: "ENG101",
    courseName: "Technical Communication",
    courseCoordinatorEmail: "eva.brown@university.edu",
    moduleCoordinatorEmail: "grace.taylor@university.edu",
    programCoordinatorEmail: "jack.jackson@university.edu",
  },
];

async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    // Clear existing data
    console.log("🧹 Cleaning existing data...");
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    console.log("👤 Creating users...");
    const users = [];

    for (const user of userData) {
      const hashedPassword = await hashPassword(user.password);
      const createdUser = await prisma.user.create({
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          facultyId: user.facultyId,
          email: user.email,
          role: user.role,
          password: hashedPassword,
        },
      });
      users.push(createdUser);
      console.log(
        `   ✅ Created ${user.role.toLowerCase()}: ${user.firstName} ${
          user.lastName
        } (${user.email})`
      );
    }

    // Create a map of email to user ID for easier lookup
    const userEmailToId = new Map();
    users.forEach((user) => {
      userEmailToId.set(user.email, user.id);
    });

    // Create courses
    console.log("📚 Creating courses...");
    for (const course of courseData) {
      const courseCoordinatorId = userEmailToId.get(
        course.courseCoordinatorEmail
      );
      const moduleCoordinatorId = userEmailToId.get(
        course.moduleCoordinatorEmail
      );
      const programCoordinatorId = userEmailToId.get(
        course.programCoordinatorEmail
      );

      if (
        !courseCoordinatorId ||
        !moduleCoordinatorId ||
        !programCoordinatorId
      ) {
        console.error(
          `❌ Could not find coordinators for course ${course.courseCode}`
        );
        continue;
      }

      await prisma.course.create({
        data: {
          courseCode: course.courseCode,
          courseName: course.courseName,
          courseCoordinatorId,
          moduleCoordinatorId,
          programCoordinatorId,
        },
      });

      console.log(
        `   ✅ Created course: ${course.courseCode} - ${course.courseName}`
      );
    }

    console.log("🎉 Seeding completed successfully!");
    console.log(`
📊 Summary:
   • ${userData.length} users created
   • ${courseData.length} courses created
   
🔑 Login credentials (all passwords are 'password123' except admin):
   • Admin: admin@university.edu / admin123
   • Course Coordinators: alice.johnson@university.edu, bob.smith@university.edu, etc.
   • Module Coordinators: frank.miller@university.edu, grace.taylor@university.edu, etc.
   • Program Coordinators: iris.thomas@university.edu, jack.jackson@university.edu
    `);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
