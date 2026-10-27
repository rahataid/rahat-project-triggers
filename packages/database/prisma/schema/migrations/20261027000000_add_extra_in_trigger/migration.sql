-- AlterTable
ALTER TABLE "tbl_triggers" ADD COLUMN     "extra" JSONB;

-- AlterTable
ALTER TABLE "tbl_trigger_history" ADD COLUMN     "extra" JSONB;
