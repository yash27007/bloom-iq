-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('COURSE_COORDINATOR', 'MODULE_COORDINATOR', 'PROGRAM_COORDINATOR', 'CONTROLLER_OF_EXAMINATION', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Designation" AS ENUM ('ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "public"."Material_Type" AS ENUM ('SYLLABUS', 'UNIT_PDF');

-- CreateEnum
CREATE TYPE "public"."Question_Type" AS ENUM ('REMEMBER', 'ANALYZE', 'UNDERSTAND', 'APPLY', 'EVALUATE', 'CREATE');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."Marks" AS ENUM ('TWO', 'EIGHT', 'SIXTEEN');

-- CreateEnum
CREATE TYPE "public"."QuestionStatus" AS ENUM ('DRAFT', 'CREATED_BY_COURSE_COORDINATOR', 'UNDER_REVIEW_FROM_PROGRAM_COORDINATOR', 'UNDER_REVIEW_FROM_MODULE_COORDINATOR', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "designation" "public"."Designation" NOT NULL,
    "role" "public"."Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "course_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "courseCoordinatorId" TEXT NOT NULL,
    "moduleCoordinatorId" TEXT NOT NULL,
    "programCoordinatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_material" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "materialType" "public"."Material_Type" NOT NULL,
    "unit" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "unit" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "questionType" "public"."Question_Type" NOT NULL,
    "marks" "public"."Marks" NOT NULL,
    "status" "public"."QuestionStatus" NOT NULL DEFAULT 'CREATED_BY_COURSE_COORDINATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_feedback" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_generation_job" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "materialId" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "initiatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_generation_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_facultyId_key" ON "public"."users"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_facultyId_idx" ON "public"."users"("email", "facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_course_code_key" ON "public"."courses"("course_code");

-- CreateIndex
CREATE INDEX "courses_course_code_id_idx" ON "public"."courses"("course_code", "id");

-- CreateIndex
CREATE INDEX "course_material_id_courseId_idx" ON "public"."course_material"("id", "courseId");

-- CreateIndex
CREATE INDEX "questions_courseId_id_idx" ON "public"."questions"("courseId", "id");

-- CreateIndex
CREATE INDEX "question_feedback_questionId_id_idx" ON "public"."question_feedback"("questionId", "id");

-- CreateIndex
CREATE INDEX "question_generation_job_courseId_materialId_idx" ON "public"."question_generation_job"("courseId", "materialId");

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_courseCoordinatorId_fkey" FOREIGN KEY ("courseCoordinatorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_moduleCoordinatorId_fkey" FOREIGN KEY ("moduleCoordinatorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_programCoordinatorId_fkey" FOREIGN KEY ("programCoordinatorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_material" ADD CONSTRAINT "course_material_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_material" ADD CONSTRAINT "course_material_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_feedback" ADD CONSTRAINT "question_feedback_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_generation_job" ADD CONSTRAINT "question_generation_job_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "public"."course_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_generation_job" ADD CONSTRAINT "question_generation_job_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_generation_job" ADD CONSTRAINT "question_generation_job_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
