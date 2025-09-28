import { PrismaClient, Role, Designation } from "@/generated/prisma";
import { hashPassword } from "@/lib/hash-password";

const prisma = new PrismaClient();

// Enhanced sample data for more realistic generation
const firstNames = [
  // Male names
  "Alexander",
  "Benjamin",
  "Christopher",
  "Daniel",
  "Edward",
  "Frederick",
  "George",
  "Henry",
  "Isaac",
  "Jacob",
  "Kevin",
  "Lucas",
  "Matthew",
  "Nathan",
  "Oliver",
  "Patrick",
  "Quincy",
  "Robert",
  "Samuel",
  "Theodore",
  "Victor",
  "William",
  "Xavier",
  "Zachary",
  "Adrian",
  "Bradley",
  "Cameron",
  "Derek",
  "Ethan",
  "Felix",
  "Gabriel",
  "Harrison",
  // Female names
  "Alice",
  "Beatrice",
  "Catherine",
  "Diana",
  "Eleanor",
  "Fiona",
  "Grace",
  "Hannah",
  "Isabella",
  "Julia",
  "Katherine",
  "Lily",
  "Margaret",
  "Natalie",
  "Olivia",
  "Penelope",
  "Quinn",
  "Rebecca",
  "Sophia",
  "Taylor",
  "Ursula",
  "Victoria",
  "Wendy",
  "Xenia",
  "Yasmin",
  "Zoe",
  "Amelia",
  "Brooke",
  "Charlotte",
  "Delphine",
  "Emma",
  "Faith",
];

const lastNames = [
  "Anderson",
  "Baker",
  "Campbell",
  "Davis",
  "Evans",
  "Fischer",
  "Green",
  "Hall",
  "Irving",
  "Jackson",
  "King",
  "Lewis",
  "Mitchell",
  "Nelson",
  "O'Connor",
  "Parker",
  "Quinn",
  "Roberts",
  "Stewart",
  "Thompson",
  "Underwood",
  "Vincent",
  "Watson",
  "Young",
  "Zhang",
  "Adams",
  "Brooks",
  "Collins",
  "Edwards",
  "Foster",
  "Garcia",
  "Hughes",
  "Johnson",
  "Kumar",
  "Lopez",
  "Martinez",
  "Nakamura",
  "Okafor",
  "Patel",
  "Rodriguez",
  "Singh",
  "Taylor",
  "Valdez",
  "Williams",
  "Yamamoto",
  "Zhou",
];

const departments = [
  "Computer Science",
  "Information Technology",
  "Software Engineering",
  "Data Science",
  "Mathematics",
  "Statistics",
  "Physics",
  "Chemistry",
  "Biology",
  "Biochemistry",
  "English Literature",
  "Linguistics",
  "History",
  "Geography",
  "Political Science",
  "Psychology",
  "Sociology",
  "Economics",
  "Business Administration",
  "Marketing",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Philosophy",
  "Art History",
  "Music",
  "Theatre",
  "Education",
  "Anthropology",
];

const courseData = [
  {
    code: "CS101",
    name: "Introduction to Programming",
    desc: "Fundamental programming concepts using modern languages",
  },
  {
    code: "CS102",
    name: "Data Structures and Algorithms",
    desc: "Essential data structures and algorithmic thinking",
  },
  {
    code: "CS201",
    name: "Database Systems",
    desc: "Database design, SQL, and database management systems",
  },
  {
    code: "CS202",
    name: "Software Engineering",
    desc: "Software development lifecycle and engineering practices",
  },
  {
    code: "CS301",
    name: "Computer Networks",
    desc: "Network protocols, architecture, and distributed systems",
  },
  {
    code: "CS302",
    name: "Machine Learning",
    desc: "Introduction to ML algorithms and applications",
  },
  {
    code: "CS401",
    name: "Artificial Intelligence",
    desc: "AI fundamentals and intelligent system design",
  },
  {
    code: "CS402",
    name: "Web Development",
    desc: "Full-stack web application development",
  },
  {
    code: "IT201",
    name: "Information Systems",
    desc: "Business information systems and enterprise architecture",
  },
  {
    code: "IT301",
    name: "Cybersecurity",
    desc: "Information security principles and practices",
  },
  {
    code: "MATH101",
    name: "Calculus I",
    desc: "Differential calculus and applications",
  },
  {
    code: "MATH201",
    name: "Linear Algebra",
    desc: "Vector spaces, matrices, and linear transformations",
  },
  {
    code: "MATH301",
    name: "Statistics",
    desc: "Probability theory and statistical inference",
  },
  {
    code: "PHYS101",
    name: "General Physics I",
    desc: "Mechanics and thermodynamics",
  },
  {
    code: "PHYS201",
    name: "Quantum Physics",
    desc: "Introduction to quantum mechanics",
  },
  {
    code: "CHEM101",
    name: "General Chemistry",
    desc: "Chemical principles and laboratory techniques",
  },
  {
    code: "BIO101",
    name: "Cell Biology",
    desc: "Cellular structure and molecular processes",
  },
  {
    code: "ENG101",
    name: "Academic Writing",
    desc: "Advanced composition and rhetoric",
  },
  {
    code: "HIST201",
    name: "World History",
    desc: "Global historical perspectives and analysis",
  },
  {
    code: "PSYC101",
    name: "Introduction to Psychology",
    desc: "Psychological theories and research methods",
  },
  {
    code: "ECON201",
    name: "Microeconomics",
    desc: "Individual and firm economic behavior",
  },
  {
    code: "BUS301",
    name: "Strategic Management",
    desc: "Business strategy and organizational leadership",
  },
  {
    code: "ENG201",
    name: "Thermodynamics",
    desc: "Energy systems and thermal engineering",
  },
  {
    code: "EEE101",
    name: "Circuit Analysis",
    desc: "Electrical circuits and network analysis",
  },
  {
    code: "CIV101",
    name: "Structural Design",
    desc: "Design principles for civil structures",
  },
];

// Utility functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateFacultyId(index: number, department: string): string {
  const year = new Date().getFullYear();
  const deptCode = department
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return `${deptCode}${year}${String(index).padStart(4, "0")}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `${cleanFirst}.${cleanLast}${randomNum}@university.edu`;
}

async function main() {
  console.log("Starting comprehensive seed process...");

  // Create admin user
  console.log("👨‍💼 Creating admin user...");
  const admin = await prisma.user.create({
    data: {
      firstName: "System",
      lastName: "Administrator",
      email: "admin@university.edu",
      facultyId: "SYS2025ADMIN",
      password: await hashPassword("admin123"),
      role: Role.ADMIN,
      designation: Designation.PROFESSOR,
      isActive: true,
    },
  });

  console.log(`✅ Admin created: ${admin.email}`);

  // Create a diverse set of faculty users
  console.log("👥 Creating faculty members...");
  const users = [];
  const roles = [
    Role.COURSE_COORDINATOR,
    Role.MODULE_COORDINATOR,
    Role.PROGRAM_COORDINATOR,
    Role.CONTROLLER_OF_EXAMINATION,
  ];

  // Create 200 users for better testing of pagination and scalability
  const userCount = 200;
  for (let i = 1; i <= userCount; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const department = getRandomElement(departments);
    const role = getRandomElement(roles);
    const designation = getRandomElement(Object.values(Designation));

    // 85% active, 15% inactive for realistic testing
    const isActive = Math.random() > 0.15;

    try {
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: generateEmail(firstName, lastName),
          facultyId: generateFacultyId(i, department),
          password: await hashPassword("password123"),
          role,
          designation,
          isActive,
        },
      });

      users.push(user);

      if (i % 50 === 0) {
        console.log(`✅ Created ${i}/${userCount} users...`);
      }
    } catch (_error) {
      console.log(`⚠️ Skipping user ${i} due to uniqueness constraint`);
      continue;
    }
  }

  console.log(`✅ Created ${users.length} faculty users`);

  // Create courses with proper coordinator assignments
  console.log("📚 Creating comprehensive course catalog...");

  // Get active coordinators by role
  const activeCoordinators = users.filter((u) => u.isActive);
  const courseCoordinators = activeCoordinators.filter(
    (u) => u.role === Role.COURSE_COORDINATOR
  );
  const moduleCoordinators = activeCoordinators.filter(
    (u) => u.role === Role.MODULE_COORDINATOR
  );
  const programCoordinators = activeCoordinators.filter(
    (u) => u.role === Role.PROGRAM_COORDINATOR
  );

  console.log(`📊 Available coordinators:`);
  console.log(`   - Course Coordinators: ${courseCoordinators.length}`);
  console.log(`   - Module Coordinators: ${moduleCoordinators.length}`);
  console.log(`   - Program Coordinators: ${programCoordinators.length}`);

  const courses = [];

  if (
    courseCoordinators.length >= 1 &&
    moduleCoordinators.length >= 1 &&
    programCoordinators.length >= 1
  ) {
    // Create all available courses
    for (const courseInfo of courseData) {
      try {
        const course = await prisma.course.create({
          data: {
            course_code: courseInfo.code,
            name: courseInfo.name,
            description: courseInfo.desc,
            courseCoordinatorId: getRandomElement(courseCoordinators).id,
            moduleCoordinatorId: getRandomElement(moduleCoordinators).id,
            programCoordinatorId: getRandomElement(programCoordinators).id,
          },
        });

        courses.push(course);
        console.log(`✅ Course: ${course.course_code} - ${course.name}`);
      } catch (_error) {
        console.log(
          `⚠️ Skipping course ${courseInfo.code} due to constraint error`
        );
        continue;
      }
    }
  } else {
    console.log("⚠️ Warning: Insufficient coordinators for course creation");
    console.log(
      "   - This may be due to random generation. Re-run seed for different results."
    );
  }

  console.log(`✅ Created ${courses.length} courses`);
  console.log("🌱 Comprehensive seed process completed successfully!");

  // Detailed summary
  console.log("\n📊 Database Summary:");
  console.log(`┌─────────────────────────────────────────────┐`);
  console.log(`│                USER STATISTICS              │`);
  console.log(`├─────────────────────────────────────────────┤`);
  console.log(`│ Total users: ${String(users.length + 1).padStart(31)} │`);
  console.log(
    `│ Active users: ${String(
      users.filter((u) => u.isActive).length + 1
    ).padStart(30)} │`
  );
  console.log(
    `│ Inactive users: ${String(
      users.filter((u) => !u.isActive).length
    ).padStart(28)} │`
  );
  console.log(`│                                             │`);
  console.log(
    `│ Course coordinators: ${String(courseCoordinators.length).padStart(23)} │`
  );
  console.log(
    `│ Module coordinators: ${String(moduleCoordinators.length).padStart(23)} │`
  );
  console.log(
    `│ Program coordinators: ${String(programCoordinators.length).padStart(
      22
    )} │`
  );
  console.log(
    `│ Exam controllers: ${String(
      activeCoordinators.filter(
        (u) => u.role === Role.CONTROLLER_OF_EXAMINATION
      ).length
    ).padStart(26)} │`
  );
  console.log(`└─────────────────────────────────────────────┘`);

  console.log(`┌─────────────────────────────────────────────┐`);
  console.log(`│              COURSE STATISTICS              │`);
  console.log(`├─────────────────────────────────────────────┤`);
  console.log(`│ Total courses: ${String(courses.length).padStart(29)} │`);
  console.log(
    `│ Available course templates: ${String(courseData.length).padStart(16)} │`
  );
  console.log(`└─────────────────────────────────────────────┘`);

  // Role distribution
  const roleDistribution = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`┌─────────────────────────────────────────────┐`);
  console.log(`│              ROLE DISTRIBUTION              │`);
  console.log(`├─────────────────────────────────────────────┤`);
  Object.entries(roleDistribution).forEach(([role, count]) => {
    const roleName = role
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
    console.log(
      `│ ${roleName}: ${String(count).padStart(41 - roleName.length - 2)} │`
    );
  });
  console.log(`└─────────────────────────────────────────────┘`);

  console.log(`\n🎉 Database is ready for comprehensive testing!`);
  console.log(`   - Test pagination with ${users.length + 1} users`);
  console.log(`   - Test course assignments with ${courses.length} courses`);
  console.log(`   - Test inactive user restrictions`);
  console.log(`   - Test search and filtering across large datasets`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
