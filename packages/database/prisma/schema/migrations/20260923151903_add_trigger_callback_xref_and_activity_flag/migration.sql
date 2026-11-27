-- AlterTable
ALTER TABLE "public"."tbl_activities" ADD COLUMN     "hasTriggerCallback" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."tbl_trigger_callbacks" ADD COLUMN     "xref" TEXT;

-- CreateIndex
CREATE INDEX "tbl_trigger_callbacks_xref_idx" ON "public"."tbl_trigger_callbacks"("xref");
