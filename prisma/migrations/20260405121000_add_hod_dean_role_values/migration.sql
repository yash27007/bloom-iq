-- Ensure Role enum supports department leadership roles used by application code.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'HOD';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DEAN';
