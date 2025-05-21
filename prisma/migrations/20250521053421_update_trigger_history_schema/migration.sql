/*
  Warnings:

  - Added the required column `revertedAt` to the `tbl_trigger_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revertedBy` to the `tbl_trigger_history` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tbl_trigger_history_repeatKey_key";

-- DropIndex
DROP INDEX "tbl_trigger_history_uuid_key";

-- AlterTable
ALTER TABLE "tbl_trigger_history" ADD COLUMN     "revertedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "revertedBy" TEXT NOT NULL;
