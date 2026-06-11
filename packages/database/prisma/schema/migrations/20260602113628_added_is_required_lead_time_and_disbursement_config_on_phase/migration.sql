-- AlterTable
ALTER TABLE "public"."tbl_phases" ADD COLUMN     "disbursementConfig" JSONB,
ADD COLUMN     "isRequiredLeadTime" BOOLEAN NOT NULL DEFAULT false;
