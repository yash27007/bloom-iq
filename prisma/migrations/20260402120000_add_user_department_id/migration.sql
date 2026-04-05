-- Ensure User.departmentId exists for department-scoped auth/profile queries
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

CREATE INDEX IF NOT EXISTS "user_departmentId_idx"
ON "user"("departmentId");
