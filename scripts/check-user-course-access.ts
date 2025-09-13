import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function checkUsersAndCourses() {
  try {
    console.log('=== USERS ===');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      }
    });
    
    console.log(`Total users: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });

    console.log('=== COURSE COORDINATOR ASSIGNMENTS ===');
    const courseId = '15d20e79-f647-4398-828b-cefdfb23922b'; // Computer Networks
    
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        courseCoordinator: true,
        moduleCoordinator: true,
        programCoordinator: true,
      }
    });

    if (course) {
      console.log(`Course: ${course.courseName} (${course.courseCode})`);
      console.log(`Course Coordinator ID: ${course.courseCoordinatorId}`);
      console.log(`Module Coordinator ID: ${course.moduleCoordinatorId}`);
      console.log(`Program Coordinator ID: ${course.programCoordinatorId}`);
      console.log('');
      
      console.log('Course Coordinator Details:');
      if (course.courseCoordinator) {
        console.log(`  Name: ${course.courseCoordinator.firstName} ${course.courseCoordinator.lastName}`);
        console.log(`  Email: ${course.courseCoordinator.email}`);
        console.log(`  ID: ${course.courseCoordinator.id}`);
      }
      console.log('');
      
      // Check which users have james@gmail.com
      const jamesUser = users.find(u => u.email === 'james@gmail.com');
      if (jamesUser) {
        console.log('James user from users table:');
        console.log(`  ID: ${jamesUser.id}`);
        console.log(`  Name: ${jamesUser.firstName} ${jamesUser.lastName}`);
        console.log(`  Email: ${jamesUser.email}`);
        
        console.log('\nChecking if James has access to Computer Networks:');
        console.log(`  James ID: ${jamesUser.id}`);
        console.log(`  Course Coordinator ID: ${course.courseCoordinatorId}`);
        console.log(`  Match: ${jamesUser.id === course.courseCoordinatorId}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersAndCourses();
