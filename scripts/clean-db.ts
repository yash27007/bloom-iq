import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log("🧹 Cleaning database...");

    // Delete all courses first (due to foreign key constraints)
    await prisma.course.deleteMany({});
    console.log("   ✅ Deleted all courses");

    // Delete all users except yash@gmail.com
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          not: "yash@gmail.com",
        },
      },
    });
    console.log(
      `   ✅ Deleted ${deletedUsers.count} users (kept yash@gmail.com)`
    );

    // Check if yash@gmail.com exists, if not create it
    const yashUser = await prisma.user.findUnique({
      where: { email: "yash@gmail.com" },
    });

    if (!yashUser) {
      await prisma.user.create({
        data: {
          firstName: "Yash",
          lastName: "Admin",
          facultyId: "ADMIN001",
          email: "yash@gmail.com",
          role: "ADMIN",
          password:
            "$2b$10$8K6Q8X7g9Q7J8K8Y7L8M8N8O8P8Q8R8S8T8U8V8W8X8Y8Z8A8B8C8D", // hashed 'admin123'
        },
      });
      console.log("   ✅ Created yash@gmail.com as admin");
    } else {
      console.log("   ✅ yash@gmail.com already exists");
    }

    console.log("🎉 Database cleanup completed!");
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
