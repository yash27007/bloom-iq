-- Align DB with Prisma department models (idempotent)

-- 1) Ensure departments table exists
CREATE TABLE IF NOT EXISTS "departments" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "hodId" TEXT,
  "deanId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) Ensure departmentId exists on courses
ALTER TABLE "courses"
ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- 3) Ensure indexes exist
CREATE INDEX IF NOT EXISTS "courses_departmentId_idx"
ON "courses"("departmentId");

CREATE INDEX IF NOT EXISTS "departments_hodId_idx"
ON "departments"("hodId");

CREATE INDEX IF NOT EXISTS "departments_deanId_idx"
ON "departments"("deanId");

-- 4) Ensure foreign keys exist (safe conditional add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_departmentId_fkey'
  ) THEN
    ALTER TABLE "courses"
    ADD CONSTRAINT "courses_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_hodId_fkey'
  ) THEN
    ALTER TABLE "departments"
    ADD CONSTRAINT "departments_hodId_fkey"
    FOREIGN KEY ("hodId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_deanId_fkey'
  ) THEN
    ALTER TABLE "departments"
    ADD CONSTRAINT "departments_deanId_fkey"
    FOREIGN KEY ("deanId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
