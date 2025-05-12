/*
  Warnings:

  - You are about to drop the column `app` on the `tbl_daily_monitoring` table. All the data in the column will be lost.
  - You are about to drop the column `uuid` on the `tbl_daily_monitoring` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tbl_daily_monitoring_uuid_key";

-- AlterTable
ALTER TABLE "tbl_daily_monitoring" DROP COLUMN "app",
DROP COLUMN "uuid",
ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "groupKey" TEXT;

-- AlterTable
ALTER TABLE "tbl_triggers" ADD COLUMN     "isDailyMonitored" BOOLEAN NOT NULL DEFAULT false;
