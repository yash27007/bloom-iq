import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function quickReset() {
  try {
    // Reset materials
    await prisma.courseMaterial.updateMany({
      data: {
        isProcessed: false,
        markdownContent: null,
        sectionsData: null
      }
    });
    
    // Clean jobs
    await prisma.questionGenerationJob.deleteMany({});
    
    console.log('✅ Reset complete');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickReset();
