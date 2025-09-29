/* prisma/seed.ts
   Run with: npx ts-node prisma/seed.ts
   or add to package.json -> "prisma": { "seed": "ts-node --transpile-only prisma/seed.ts" }
*/

import { PrismaClient, Designation, Role } from "@/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const firstNames = [
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
  "Parker",
  "Quinn",
  "Roberts",
  "Stewart",
  "Thompson",
  "Vincent",
  "Watson",
  "Young",
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
  "Patel",
  "Rodriguez",
  "Singh",
  "Taylor",
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
  "English Literature",
  "History",
  "Psychology",
  "Economics",
  "Business Administration",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Philosophy",
];

const courseData = [
  {
    code: "CS101",
    name: "Introduction to Programming",
    desc: "Fundamental programming concepts",
  },
  {
    code: "CS102",
    name: "Data Structures",
    desc: "Essential data structures and algorithms",
  },
  { code: "CS201", name: "Database Systems", desc: "Database design and SQL" },
  {
    code: "CS202",
    name: "Software Engineering",
    desc: "Software development lifecycle",
  },
  {
    code: "CS301",
    name: "Computer Networks",
    desc: "Network protocols and architecture",
  },
  {
    code: "CS302",
    name: "Machine Learning",
    desc: "ML algorithms and applications",
  },
  { code: "CS401", name: "Artificial Intelligence", desc: "AI fundamentals" },
  { code: "CS402", name: "Web Development", desc: "Full-stack development" },
  {
    code: "IT201",
    name: "Information Systems",
    desc: "Business information systems",
  },
  { code: "IT301", name: "Cybersecurity", desc: "Security principles" },
  { code: "MATH101", name: "Calculus I", desc: "Differential calculus" },
  {
    code: "MATH201",
    name: "Linear Algebra",
    desc: "Vector spaces and matrices",
  },
  { code: "MATH301", name: "Statistics", desc: "Probability and statistics" },
  {
    code: "PHYS101",
    name: "General Physics I",
    desc: "Mechanics and thermodynamics",
  },
  { code: "PHYS201", name: "Quantum Physics", desc: "Quantum mechanics intro" },
  { code: "CHEM101", name: "General Chemistry", desc: "Chemical principles" },
  { code: "BIO101", name: "Cell Biology", desc: "Cellular structure" },
  {
    code: "ENG101",
    name: "Academic Writing",
    desc: "Composition and rhetoric",
  },
  {
    code: "HIST201",
    name: "World History",
    desc: "Global historical perspectives",
  },
  { code: "PSYC101", name: "Psychology", desc: "Psychological theories" },
  { code: "ECON201", name: "Microeconomics", desc: "Economic behavior" },
  { code: "BUS301", name: "Strategic Management", desc: "Business strategy" },
  { code: "ME201", name: "Thermodynamics", desc: "Energy systems" },
  { code: "EE101", name: "Circuit Analysis", desc: "Electrical circuits" },
  { code: "CE101", name: "Structural Design", desc: "Civil structures" },
];

function getRandomElement<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFacultyId(index: number, department: string) {
  const year = new Date().getFullYear();
  const deptCode = department
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return `${deptCode}${year}${String(index).padStart(4, "0")}`;
}

function generateEmail(firstName: string, lastName: string, index: number) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, "");
  return `${cleanFirst}.${cleanLast}${index}bloomiq.com`;
}

async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function main() {
  console.log("🌱 Starting seed...");

  // Safety guard: stop if DB already has many users to avoid dupes
  const existingCount = await prisma.user.count();
  if (existingCount >= 50) {
    console.log(
      `⚠️ Aborting: there are already ${existingCount} users in DB. If you want to reseed, clear users/courses first.`
    );
    await prisma.$disconnect();
    return;
  }

  const TOTAL_USERS = 100;

  // Role distribution (must sum to TOTAL_USERS)
  // includes 1 admin, so there will be exactly 1 ADMIN in the seeded users
  const roleDistribution: { role: Role; count: number }[] = [
    { role: Role.ADMIN, count: 1 },
    { role: Role.COURSE_COORDINATOR, count: 35 },
    { role: Role.MODULE_COORDINATOR, count: 25 },
    { role: Role.PROGRAM_COORDINATOR, count: 20 },
    { role: Role.CONTROLLER_OF_EXAMINATION, count: 19 },
  ];

  const designations = Object.values(Designation);

  // create users
  const users: Array<any> = [];
  let userIndex = 1;

  console.log(`👥 Creating ${TOTAL_USERS} users...`);
  for (const bucket of roleDistribution) {
    for (let i = 0; i < bucket.count; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const department = getRandomElement(departments);
      const designation = getRandomElement(designations) as Designation;
      const isActive = Math.random() > 0.1; // ~90% active
      const triesMax = 5;
      let created = null;

      for (let attempt = 0; attempt < triesMax; attempt++) {
        const email = generateEmail(firstName, lastName, userIndex);
        const facultyId = generateFacultyId(userIndex, department);
        try {
          created = await prisma.user.create({
            data: {
              firstName,
              lastName,
              email,
              facultyId,
              password: await hashPassword("Password@123"), // default seeded password
              role: bucket.role,
              designation,
              isActive,
            },
          });
          break;
        } catch (err: any) {
          // uniqueness conflict or other error -> bump index and retry
          console.warn(
            `  ⚠️ user create attempt ${
              attempt + 1
            } failed for index ${userIndex}: ${
              err?.message?.split("\n")[0] ?? err
            }`
          );
          userIndex++;
        }
      }

      if (!created) {
        console.error(
          ` ❌ Failed to create user after ${triesMax} attempts (index ~${userIndex}). Skipping.`
        );
        continue;
      }

      users.push(created);
      userIndex++;
      if (users.length % 20 === 0)
        console.log(`   -> created ${users.length}/${TOTAL_USERS}`);
    }
  }

  console.log(`✅ Created ${users.length} users.`);

  // Sanity check: ensure we have at least some coordinators for course assignment
  const activeCourseCoordinators = users.filter(
    (u) => u.role === Role.COURSE_COORDINATOR && u.isActive
  );
  const activeModuleCoordinators = users.filter(
    (u) => u.role === Role.MODULE_COORDINATOR && u.isActive
  );
  const activeProgramCoordinators = users.filter(
    (u) => u.role === Role.PROGRAM_COORDINATOR && u.isActive
  );

  if (
    activeCourseCoordinators.length === 0 ||
    activeModuleCoordinators.length === 0 ||
    activeProgramCoordinators.length === 0
  ) {
    console.error(
      "❌ Not enough active coordinators to assign to courses. Aborting course creation."
    );
    await prisma.$disconnect();
    return;
  }

  console.log("📚 Creating courses and assigning coordinators...");

  // create courses and assign coordinators (strict one-to-one - each user can only be assigned to ONE course total)
  const courses: Array<any> = [];
  const usedCoordinators = new Set<string>(); // Track ALL users assigned to any course

  for (let i = 0; i < courseData.length; i++) {
    const c = courseData[i];

    // Find available coordinators (not already assigned to ANY course in ANY role)
    const availableCourseCoordinators = activeCourseCoordinators.filter(
      (u) => !usedCoordinators.has(u.id)
    );
    const availableModuleCoordinators = activeModuleCoordinators.filter(
      (u) => !usedCoordinators.has(u.id)
    );
    const availableProgramCoordinators = activeProgramCoordinators.filter(
      (u) => !usedCoordinators.has(u.id)
    );

    // If we run out of any coordinator type, break the loop
    if (
      availableCourseCoordinators.length === 0 ||
      availableModuleCoordinators.length === 0 ||
      availableProgramCoordinators.length === 0
    ) {
      console.log(
        `⚠️  Stopping course creation at course ${i + 1}/${
          courseData.length
        } due to insufficient available coordinators`
      );
      console.log(
        `   Available: Course(${availableCourseCoordinators.length}), Module(${availableModuleCoordinators.length}), Program(${availableProgramCoordinators.length})`
      );
      break;
    }

    // Pick the first available coordinator of each type
    const cc = availableCourseCoordinators[0];
    const mc = availableModuleCoordinators[0];
    const pc = availableProgramCoordinators[0];

    // Ensure no overlap - if any user is selected for multiple roles, skip this course
    const selectedIds = [cc.id, mc.id, pc.id];
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== selectedIds.length) {
      console.log(
        `⚠️  Skipping course ${c.code} - same user would be assigned multiple coordinator roles`
      );
      continue;
    }

    // Mark ALL selected coordinators as used
    usedCoordinators.add(cc.id);
    usedCoordinators.add(mc.id);
    usedCoordinators.add(pc.id);

    try {
      const createdCourse = await prisma.course.create({
        data: {
          course_code: c.code,
          name: c.name,
          description: c.desc,
          // connect relations by id so that user->courses relations are visible
          courseCoordinator: { connect: { id: cc.id } },
          moduleCoordinator: { connect: { id: mc.id } },
          programCoordinator: { connect: { id: pc.id } },
        },
      });
      courses.push(createdCourse);
      console.log(
        `   ✅ ${createdCourse.course_code} assigned -> course:${cc.email}, module:${mc.email}, program:${pc.email}`
      );
    } catch (err) {
      console.warn(
        `   ⚠️ Skipping course ${c.code}:`,
        (err as any)?.message?.split("\n")[0] ?? err
      );
    }
  }

  console.log(`✅ Created ${courses.length} courses.`);

  // sample query to show the relation is visible from User
  const sampleCoordinator =
    courses.length > 0 ? courses[0].courseCoordinatorId : users[0]?.id;
  if (sampleCoordinator) {
    const sample = await prisma.user.findUnique({
      where: { id: sampleCoordinator },
      include: {
        courseCoordinatorCourses: true,
        moduleCoordinatorCourses: true,
        programCoordinatorCourses: true,
      },
    });
    console.log("\n🔎 Sample coordinator (and their related courses):");
    console.log(
      `   ${sample?.firstName} ${sample?.lastName} (${sample?.email})`
    );
    console.log(
      `   courseCoordinatorCourses: ${
        sample?.courseCoordinatorCourses
          ?.map((c: any) => c.course_code)
          .join(", ") || "none"
      }`
    );
    console.log(
      `   moduleCoordinatorCourses: ${
        sample?.moduleCoordinatorCourses
          ?.map((c: any) => c.course_code)
          .join(", ") || "none"
      }`
    );
    console.log(
      `   programCoordinatorCourses: ${
        sample?.programCoordinatorCourses
          ?.map((c: any) => c.course_code)
          .join(", ") || "none"
      }`
    );
  }

  // Summary
  console.log("\n" + "=".repeat(40));
  console.log("SEED SUMMARY:");
  console.log(`  Total seeded users: ${users.length}`);
  console.log(
    `  Active course coordinators: ${activeCourseCoordinators.length}`
  );
  console.log(
    `  Active module coordinators: ${activeModuleCoordinators.length}`
  );
  console.log(
    `  Active program coordinators: ${activeProgramCoordinators.length}`
  );
  console.log(`  Total courses created: ${courses.length}`);
  console.log("\n  Default password for seeded accounts: Password@123");
  console.log("=".repeat(40) + "\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Seed failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
