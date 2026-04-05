/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[courseCoordinatorId]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[moduleCoordinatorId]` on the table `courses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[programCoordinatorId]` on the table `courses` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Parsing_Status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AcademicLevel" AS ENUM ('UG', 'PG', 'PHD');

-- CreateEnum
CREATE TYPE "RenderingType" AS ENUM ('TEXT', 'LATEX', 'MERMAID', 'MIXED');

-- CreateEnum
CREATE TYPE "BloomLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');

-- CreateEnum
CREATE TYPE "GenerationType" AS ENUM ('DIRECT', 'INDIRECT', 'SCENARIO_BASED', 'PROBLEM_BASED');

-- CreateEnum
CREATE TYPE "PatternStatus" AS ENUM ('DRAFT', 'PENDING_MC_APPROVAL', 'PENDING_PC_APPROVAL', 'PENDING_COE_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('DRAFT', 'GENERATED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('SESSIONAL_1', 'SESSIONAL_2', 'END_SEMESTER');

-- CreateEnum
CREATE TYPE "SemesterType" AS ENUM ('ODD', 'EVEN');

-- DropForeignKey
ALTER TABLE "course_material" DROP CONSTRAINT "course_material_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_courseCoordinatorId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_moduleCoordinatorId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_programCoordinatorId_fkey";

-- DropForeignKey
ALTER TABLE "question_generation_job" DROP CONSTRAINT "question_generation_job_initiatedById_fkey";

-- DropIndex
DROP INDEX "questions_courseId_id_idx";

-- AlterTable
ALTER TABLE "course_material" ADD COLUMN     "embeddingError" TEXT,
ADD COLUMN     "embeddingStatus" "Parsing_Status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "parsedContent" TEXT,
ADD COLUMN     "parsingError" TEXT,
ADD COLUMN     "parsingStatus" "Parsing_Status" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "academicLevel" "AcademicLevel" NOT NULL DEFAULT 'UG',
ADD COLUMN     "bloomJustification" TEXT,
ADD COLUMN     "bloomLevel" "BloomLevel" NOT NULL DEFAULT 'UNDERSTAND',
ADD COLUMN     "ccApprovedAt" TIMESTAMP(3),
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "generationType" "GenerationType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "isFinalized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latexContent" TEXT,
ADD COLUMN     "materialId" TEXT,
ADD COLUMN     "materialName" TEXT,
ADD COLUMN     "mcApprovedAt" TIMESTAMP(3),
ADD COLUMN     "mermaidContent" TEXT,
ADD COLUMN     "pcApprovedAt" TIMESTAMP(3),
ADD COLUMN     "realWorldContext" TEXT,
ADD COLUMN     "renderingType" "RenderingType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "reviewedByCc" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedByMc" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedByPc" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "password" TEXT,
    "designation" "Designation" NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_chunks" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "unit" INTEGER NOT NULL DEFAULT 0,
    "chunkIndex" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "tokenCount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_paper_patterns" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "patternName" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "semesterType" "SemesterType" NOT NULL,
    "examType" "ExamType" NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "partAStructure" JSONB NOT NULL,
    "partBStructure" JSONB NOT NULL,
    "instructions" TEXT,
    "status" "PatternStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByRole" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "mcApproved" BOOLEAN NOT NULL DEFAULT false,
    "mcApprovedAt" TIMESTAMP(3),
    "mcApprovedById" TEXT,
    "mcRemarks" TEXT,
    "pcApproved" BOOLEAN NOT NULL DEFAULT false,
    "pcApprovedAt" TIMESTAMP(3),
    "pcApprovedById" TEXT,
    "pcRemarks" TEXT,
    "coeApproved" BOOLEAN NOT NULL DEFAULT false,
    "coeApprovedAt" TIMESTAMP(3),
    "coeApprovedById" TEXT,
    "coeRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_paper_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_papers" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "paperCode" TEXT NOT NULL,
    "setVariant" TEXT NOT NULL,
    "partA_questionIds" TEXT[],
    "partB_questionIds" TEXT[],
    "paperContent" TEXT,
    "answerKeyContent" TEXT,
    "status" "PaperStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3),
    "generatedById" TEXT NOT NULL,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_papers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_facultyId_key" ON "user"("facultyId");

-- CreateIndex
CREATE INDEX "user_email_facultyId_idx" ON "user"("email", "facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "material_chunks_materialId_unit_idx" ON "material_chunks"("materialId", "unit");

-- CreateIndex
CREATE INDEX "material_chunks_materialId_chunkIndex_idx" ON "material_chunks"("materialId", "chunkIndex");

-- CreateIndex
CREATE INDEX "chat_history_userId_materialId_createdAt_idx" ON "chat_history"("userId", "materialId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_history_createdAt_idx" ON "chat_history"("createdAt");

-- CreateIndex
CREATE INDEX "question_paper_patterns_courseId_idx" ON "question_paper_patterns"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "question_papers_paperCode_key" ON "question_papers"("paperCode");

-- CreateIndex
CREATE INDEX "question_papers_patternId_idx" ON "question_papers"("patternId");

-- CreateIndex
CREATE INDEX "question_papers_courseId_idx" ON "question_papers"("courseId");

-- CreateIndex
CREATE INDEX "course_material_courseId_unit_idx" ON "course_material"("courseId", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "courses_courseCoordinatorId_key" ON "courses"("courseCoordinatorId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_moduleCoordinatorId_key" ON "courses"("moduleCoordinatorId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_programCoordinatorId_key" ON "courses"("programCoordinatorId");

-- CreateIndex
CREATE INDEX "questions_courseId_id_status_idx" ON "questions"("courseId", "id", "status");

-- CreateIndex
CREATE INDEX "questions_materialId_idx" ON "questions"("materialId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_courseCoordinatorId_fkey" FOREIGN KEY ("courseCoordinatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_moduleCoordinatorId_fkey" FOREIGN KEY ("moduleCoordinatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_programCoordinatorId_fkey" FOREIGN KEY ("programCoordinatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_material" ADD CONSTRAINT "course_material_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "course_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "course_material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "course_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_job" ADD CONSTRAINT "question_generation_job_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_paper_patterns" ADD CONSTRAINT "question_paper_patterns_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_papers" ADD CONSTRAINT "question_papers_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "question_paper_patterns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
