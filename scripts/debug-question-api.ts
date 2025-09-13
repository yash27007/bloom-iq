import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function testGetCourseQuestions() {
  try {
    const courseId = '15d20e79-f647-4398-828b-cefdfb23922b'; // Computer Networks
    
    console.log('Testing getCourseQuestions API logic...');
    console.log(`Course ID: ${courseId}`);
    
    // Test the same query as the API
    const questions = await prisma.question.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      take: 10, // limit to first 10
    });

    console.log(`\nFound ${questions.length} questions:`);
    
    questions.forEach((q, index) => {
      console.log(`\n${index + 1}. Question: ${q.question.substring(0, 100)}...`);
      console.log(`   Answer: ${q.answer || 'No answer'}...`);
      console.log(`   Type: ${q.questionType}`);
      console.log(`   Marks: ${q.marks}`);
      console.log(`   Status: ${q.status}`);
      console.log(`   Unit: ${q.unit || 'No unit'}`);
      console.log(`   Topic: ${q.topic || 'No topic'}`);
    });

    // Check course access
    console.log('\n=== CHECKING COURSE ACCESS ===');
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        courseCoordinator: true,
        moduleCoordinator: true,
        programCoordinator: true,
      }
    });

    if (course) {
      console.log(`Course: ${course.courseName}`);
      console.log(`Course Coordinator: ${course.courseCoordinator?.firstName} ${course.courseCoordinator?.lastName} (${course.courseCoordinator?.email})`);
      console.log(`Module Coordinator: ${course.moduleCoordinator?.firstName} ${course.moduleCoordinator?.lastName} (${course.moduleCoordinator?.email})`);
      console.log(`Program Coordinator: ${course.programCoordinator?.firstName} ${course.programCoordinator?.lastName} (${course.programCoordinator?.email})`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGetCourseQuestions();
