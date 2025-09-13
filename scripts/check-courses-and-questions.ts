import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== COURSES ===');
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });
    
    console.log(`Total courses: ${courses.length}`);
    courses.forEach((course, index) => {
      console.log(`${index + 1}. ID: ${course.id}`);
      console.log(`   Code: ${course.courseCode}`);
      console.log(`   Name: ${course.courseName}`);
      console.log(`   Questions: ${course._count.questions}`);
      console.log('');
    });

    console.log('=== QUESTIONS BY COURSE ===');
    for (const course of courses) {
      if (course._count.questions > 0) {
        console.log(`\n--- Questions for ${course.courseName} (ID: ${course.id}) ---`);
        const questions = await prisma.question.findMany({
          where: { courseId: course.id },
          select: {
            id: true,
            question: true,
            answer: true,
            createdAt: true,
            status: true
          },
          take: 3,
          orderBy: { createdAt: 'desc' }
        });
        
        questions.forEach((q, index) => {
          console.log(`${index + 1}. ${q.question.substring(0, 80)}...`);
          console.log(`   Answer: ${q.answer?.substring(0, 50)}...`);
          console.log(`   Status: ${q.status}`);
          console.log(`   Created: ${q.createdAt.toISOString()}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
