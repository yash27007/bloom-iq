import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function checkMaterials() {
  try {
    console.log('=== COURSE MATERIALS ===');
    const materials = await prisma.courseMaterial.findMany({
      include: {
        course: {
          select: {
            courseName: true,
            courseCode: true
          }
        }
      }
    });
    
    console.log(`Total materials: ${materials.length}`);
    
    materials.forEach((material, index) => {
      console.log(`\n${index + 1}. Material: ${material.title}`);
      console.log(`   Course: ${material.course.courseCode} - ${material.course.courseName}`);
      console.log(`   File Path: ${material.filePath}`);
      console.log(`   Is Processed: ${material.isProcessed}`);
      console.log(`   Has Markdown Content: ${!!material.markdownContent}`);
      console.log(`   Markdown Length: ${material.markdownContent?.length || 0} chars`);
      console.log(`   Has Sections Data: ${!!material.sectionsData}`);
      
      if (material.markdownContent) {
        console.log(`   Content Preview: ${material.markdownContent.substring(0, 200)}...`);
      }
      
      if (material.sectionsData) {
        try {
          const sections = material.sectionsData as any;
          console.log(`   Sections Count: ${Array.isArray(sections) ? sections.length : 'Not an array'}`);
        } catch (e) {
          console.log(`   Sections Data: Error parsing`);
        }
      }
    });

    console.log('\n=== QUESTION GENERATION JOBS ===');
    const jobs = await prisma.questionGenerationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    jobs.forEach((job, index) => {
      console.log(`\n${index + 1}. Job ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Stage: ${job.processingStage}`);
      console.log(`   Progress: ${job.progress}%`);
      console.log(`   Total Questions: ${job.totalQuestions}`);
      console.log(`   Created: ${job.createdAt.toISOString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMaterials();
