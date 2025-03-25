/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `tbl_daily_monitoring` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `tbl_daily_monitoring` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "tbl_daily_monitoring" ADD COLUMN     "uuid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tbl_daily_monitoring_uuid_key" ON "tbl_daily_monitoring"("uuid");
