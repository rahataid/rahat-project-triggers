/*
  Warnings:

  - You are about to drop the column `app` on the `tbl_sources_data` table. All the data in the column will be lost.
  - Added the required column `app` to the `tbl_daily_monitoring` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tbl_daily_monitoring" ADD COLUMN     "app" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tbl_sources_data" DROP COLUMN "app";
