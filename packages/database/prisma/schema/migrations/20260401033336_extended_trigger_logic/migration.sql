-- AlterTable
ALTER TABLE "public"."tbl_phases" ADD COLUMN     "extendedTriggerLogic" JSONB;

-- AlterTable
ALTER TABLE "public"."tbl_trigger_history" ADD COLUMN     "logicKey" TEXT;

-- AlterTable
ALTER TABLE "public"."tbl_triggers" ADD COLUMN     "logicKey" TEXT;
