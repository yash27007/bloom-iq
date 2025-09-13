import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function resetMaterials() {
  try {
    console.log('=== Resetting Materials ===');
    
    // Reset all materials to not processed
    const updateResult = await prisma.courseMaterial.updateMany({
      data: {
        isProcessed: false,
        markdownContent: null,
        sectionsData: null
      }
    });
    
    console.log(`Reset ${updateResult.count} materials`);
    
    // Clean up any failed jobs
    await prisma.questionGenerationJob.deleteMany({
      where: {
        status: { in: ['FAILED', 'PROCESSING'] }
      }
    });
    
    console.log('Cleaned up failed jobs');
    
    const materials = await prisma.courseMaterial.findMany({
      include: {
        course: {
          select: { courseName: true, courseCode: true }
        }
      }
    });
    
    console.log('\n=== Current Materials ===');
    materials.forEach((material, index) => {
      console.log(`${index + 1}. ${material.title}`);
      console.log(`   Course: ${material.course.courseCode} - ${material.course.courseName}`);
      console.log(`   File: ${material.filePath}`);
      console.log(`   Processed: ${material.isProcessed}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetMaterials();
