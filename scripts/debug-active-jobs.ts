#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';

async function debugActiveJobs() {
  console.log('=== Debugging Active Question Generation Jobs ===');
  
  try {
    // Get all jobs that are currently processing
    const activeJobs = await prisma.questionGenerationJob.findMany({
      where: {
        status: 'PROCESSING'
      },
      include: {
        material: {
          include: {
            course: true
          }
        },
        course: true,
        initiatedBy: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${activeJobs.length} active jobs:`);
    
    for (const job of activeJobs) {
      console.log('\n--- Job Details ---');
      console.log('Job ID:', job.id);
      console.log('Course:', job.course.courseName);
      console.log('Material:', job.material?.title || 'No material');
      console.log('Processing Stage:', job.processingStage);
      console.log('Progress:', job.progress + '%');
      console.log('Questions Generated:', job.generatedCount, '/', job.totalQuestions);
      console.log('Started At:', job.createdAt);
      console.log('Updated At:', job.updatedAt);
      console.log('Error:', job.errorMessage);
      
      // Check how long it's been since last update
      const timeSinceUpdate = Date.now() - job.updatedAt.getTime();
      const minutesSinceUpdate = Math.floor(timeSinceUpdate / (1000 * 60));
      console.log('Minutes since last update:', minutesSinceUpdate);
      
      if (minutesSinceUpdate > 5) {
        console.log('⚠️ This job seems stuck (no update for >5 minutes)');
      }
    }

    // Check if there are any questions generated for these jobs
    if (activeJobs.length > 0) {
      console.log('\n=== Checking Generated Questions ===');
      for (const job of activeJobs) {
        const questions = await prisma.question.findMany({
          where: {
            courseId: job.courseId,
            // Check recent questions that might be from this job
            createdAt: {
              gte: job.createdAt
            }
          },
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        console.log(`Questions for ${job.course.courseName} (since job start): ${questions.length}`);
        if (questions.length > 0) {
          console.log('Latest question:', questions[0].question.substring(0, 100) + '...');
        }
      }
    }

  } catch (error) {
    console.error('Error debugging jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugActiveJobs();
