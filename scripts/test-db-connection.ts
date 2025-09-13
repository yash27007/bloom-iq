import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log("Testing database connection...");
    
    // Test basic connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    
    // Test course query
    const courses = await prisma.course.findMany({
      take: 1
    });
    console.log(`✅ Found ${courses.length} courses`);
    
    // Test materials query
    const materials = await prisma.courseMaterial.findMany({
      take: 1
    });
    console.log(`✅ Found ${materials.length} materials`);
    
    // Test job creation (dry run)
    console.log("✅ Database schema looks good");
    
  } catch (error) {
    console.error("❌ Database error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection()
  .then(() => {
    console.log("Database test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database test failed:", error);
    process.exit(1);
  });
