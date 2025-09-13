const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Starting complete database cleanup...\n');
  
  try {
    // Delete in order to respect foreign key constraints
    console.log('🗑️  Deleting questions...');
    const deletedQuestions = await prisma.question.deleteMany();
    console.log(`   Deleted ${deletedQuestions.count} questions`);
    
    console.log('🗑️  Deleting question generation jobs...');
    const deletedJobs = await prisma.questionGenerationJob.deleteMany();
    console.log(`   Deleted ${deletedJobs.count} jobs`);
    
    console.log('🗑️  Deleting course materials...');
    const deletedMaterials = await prisma.courseMaterial.deleteMany();
    console.log(`   Deleted ${deletedMaterials.count} materials`);
    
    console.log('\n✅ Database cleaned successfully!');
    console.log('📊 Final state:');
    
    const materialCount = await prisma.courseMaterial.count();
    const jobCount = await prisma.questionGenerationJob.count();
    const questionCount = await prisma.question.count();
    
    console.log(`   - Course Materials: ${materialCount}`);
    console.log(`   - Generation Jobs: ${jobCount}`);
    console.log(`   - Questions: ${questionCount}`);
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
