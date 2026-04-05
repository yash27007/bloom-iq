-- Align question_paper_patterns table with current Prisma schema for HoD/Dean workflow.

-- 1) Ensure PatternStatus enum supports new approval states
ALTER TYPE "PatternStatus" ADD VALUE IF NOT EXISTS 'PENDING_HOD_APPROVAL';
ALTER TYPE "PatternStatus" ADD VALUE IF NOT EXISTS 'PENDING_DEAN_APPROVAL';

-- 2) Ensure HoD approval tracking columns exist
ALTER TABLE "question_paper_patterns"
ADD COLUMN IF NOT EXISTS "hodApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hodApprovedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "hodApprovedById" TEXT,
ADD COLUMN IF NOT EXISTS "hodRemarks" TEXT;

-- 3) Ensure Dean approval tracking columns exist
ALTER TABLE "question_paper_patterns"
ADD COLUMN IF NOT EXISTS "deanApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "deanApprovedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deanApprovedById" TEXT,
ADD COLUMN IF NOT EXISTS "deanRemarks" TEXT;
