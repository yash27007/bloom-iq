/*
  Warnings:

  - Added the required column `marks` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionType` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SHORT_ANSWER', 'LONG_ANSWER');

-- CreateEnum
CREATE TYPE "Marks" AS ENUM ('TWO_MARKS', 'EIGHT_MARKS', 'SIXTEEN_MARKS');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "marks" "Marks" NOT NULL,
ADD COLUMN     "optionA" TEXT,
ADD COLUMN     "optionB" TEXT,
ADD COLUMN     "optionC" TEXT,
ADD COLUMN     "optionD" TEXT,
ADD COLUMN     "questionType" "QuestionType" NOT NULL,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "topic" TEXT,
ALTER COLUMN "answer" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'CREATED_BY_COURSE_COORDINATOR';

-- CreateTable
CREATE TABLE "QuestionGenerationJob" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "materialId" TEXT,
    "initiatedById" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "bloomLevels" TEXT NOT NULL,
    "questionTypes" TEXT NOT NULL,
    "difficultyLevels" TEXT NOT NULL,
    "unit" INTEGER,
    "questionsPerType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionGenerationJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionGenerationJob" ADD CONSTRAINT "QuestionGenerationJob_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGenerationJob" ADD CONSTRAINT "QuestionGenerationJob_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "CourseMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGenerationJob" ADD CONSTRAINT "QuestionGenerationJob_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
