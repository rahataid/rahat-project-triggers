-- AlterTable: Add responsibleStation column if it doesn't exist (safe for existing data)
ALTER TABLE "public"."tbl_activities" ADD COLUMN IF NOT EXISTS "responsibleStation" TEXT;
