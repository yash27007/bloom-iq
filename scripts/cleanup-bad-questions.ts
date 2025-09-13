import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function cleanupBadQuestions() {
  try {
    console.log('=== Cleaning up bad questions ===');
    
    // Find questions that are clearly fake/generic
    const badQuestions = await prisma.question.findMany({
      where: {
        OR: [
          { question: { contains: 'discussed in' } },
          { question: { contains: 'concept discussed' } },
          { question: { contains: 'Unit 1' } },
          { answer: null },
          { answer: { contains: 'Sample answer' } },
          { answer: { contains: 'undefined' } }
        ]
      }
    });
    
    console.log(`Found ${badQuestions.length} bad questions`);
    
    if (badQuestions.length > 0) {
      console.log('Sample bad questions:');
      badQuestions.slice(0, 3).forEach((q, index) => {
        console.log(`${index + 1}. ${q.question.substring(0, 60)}...`);
        console.log(`   Answer: ${q.answer?.substring(0, 60) || 'null'}...`);
      });
      
      // Delete bad questions
      const deleteResult = await prisma.question.deleteMany({
        where: {
          OR: [
            { question: { contains: 'discussed in' } },
            { question: { contains: 'concept discussed' } },
            { question: { contains: 'Unit 1' } },
            { answer: null },
            { answer: { contains: 'Sample answer' } },
            { answer: { contains: 'undefined' } }
          ]
        }
      });
      
      console.log(`Deleted ${deleteResult.count} bad questions`);
    }
    
    // Show remaining questions
    const remainingQuestions = await prisma.question.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n=== Remaining questions: ${remainingQuestions.length} ===`);
    remainingQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ${q.question.substring(0, 80)}...`);
      console.log(`   Answer: ${q.answer?.substring(0, 80) || 'null'}...`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupBadQuestions();
