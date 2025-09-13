-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('COURSE_COORDINATOR', 'MODULE_COORDINATOR', 'PROGRAM_COORDINATOR', 'CONTROLLER_OF_EXAMINATION', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."BLOOM_LEVEL" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');

-- CreateEnum
CREATE TYPE "public"."DIFFICULTY_LEVEL" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "public"."STATUS" AS ENUM ('CREATED_BY_COURSE_COORDINATOR', 'UNDER_REVIEW_FROM_PROGRAM_COORDINATOR', 'UNDER_REVIEW_FROM_MODULE_COORDINATOR', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('STRAIGHTFORWARD', 'PROBLEM_BASED', 'SCENARIO_BASED');

-- CreateEnum
CREATE TYPE "public"."Marks" AS ENUM ('TWO_MARKS', 'EIGHT_MARKS', 'SIXTEEN_MARKS');

-- CreateEnum
CREATE TYPE "public"."QuestionCategory" AS ENUM ('DIRECT', 'SCENARIO', 'PROBLEMATIC', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."MaterialType" AS ENUM ('SYLLABUS', 'UNIT_MATERIAL');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Course" (
    "id" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "courseCoordinatorId" TEXT NOT NULL,
    "moduleCoordinatorId" TEXT NOT NULL,
    "programCoordinatorId" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseMaterial" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" INTEGER,
    "filePath" TEXT NOT NULL,
    "materialType" "public"."MaterialType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markdownContent" TEXT,
    "sectionsData" JSONB,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,

    CONSTRAINT "CourseMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "questionType" "public"."QuestionType" NOT NULL,
    "unit" INTEGER NOT NULL,
    "bloomLevel" "public"."BLOOM_LEVEL" NOT NULL,
    "difficultyLevel" "public"."DIFFICULTY_LEVEL" NOT NULL,
    "marks" "public"."Marks" NOT NULL,
    "category" "public"."QuestionCategory" NOT NULL DEFAULT 'DIRECT',
    "status" "public"."STATUS" NOT NULL DEFAULT 'CREATED_BY_COURSE_COORDINATOR',
    "topic" TEXT,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "reviewedById" TEXT,
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "sourceMaterialId" TEXT,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionPaperPattern" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPaperPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionPatternSlot" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "questionNo" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "bloomLevel" "public"."BLOOM_LEVEL" NOT NULL,
    "unit" INTEGER NOT NULL,
    "allowsOrQuestion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionPatternSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionPaper" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionPaperQuestion" (
    "id" TEXT NOT NULL,
    "questionPaperId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "QuestionPaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionGenerationJob" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "materialId" TEXT,
    "initiatedById" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "bloomLevels" TEXT NOT NULL,
    "questionTypes" TEXT NOT NULL,
    "difficultyLevels" TEXT NOT NULL,
    "unit" INTEGER,
    "questionsPerType" TEXT,
    "sectionsToProcess" TEXT,
    "processingStage" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Course_courseCode_key" ON "public"."Course"("courseCode");

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_courseCoordinatorId_fkey" FOREIGN KEY ("courseCoordinatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_moduleCoordinatorId_fkey" FOREIGN KEY ("moduleCoordinatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_programCoordinatorId_fkey" FOREIGN KEY ("programCoordinatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseMaterial" ADD CONSTRAINT "CourseMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseMaterial" ADD CONSTRAINT "CourseMaterial_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_sourceMaterialId_fkey" FOREIGN KEY ("sourceMaterialId") REFERENCES "public"."CourseMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaperPattern" ADD CONSTRAINT "QuestionPaperPattern_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaperPattern" ADD CONSTRAINT "QuestionPaperPattern_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPatternSlot" ADD CONSTRAINT "QuestionPatternSlot_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "public"."QuestionPaperPattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaper" ADD CONSTRAINT "QuestionPaper_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaper" ADD CONSTRAINT "QuestionPaper_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "public"."QuestionPaperPattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaper" ADD CONSTRAINT "QuestionPaper_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaperQuestion" ADD CONSTRAINT "QuestionPaperQuestion_questionPaperId_fkey" FOREIGN KEY ("questionPaperId") REFERENCES "public"."QuestionPaper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaperQuestion" ADD CONSTRAINT "QuestionPaperQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionGenerationJob" ADD CONSTRAINT "QuestionGenerationJob_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionGenerationJob" ADD CONSTRAINT "QuestionGenerationJob_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "public"."CourseMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionGenerationJob" ADD CONSTRAINT "QuestionGenerationJob_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

