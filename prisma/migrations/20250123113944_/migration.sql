/*
  Warnings:

  - You are about to drop the column `data` on the `tbl_daily_monitoring` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `tbl_sources_data` table. All the data in the column will be lost.
  - Added the required column `extras` to the `tbl_daily_monitoring` table without a default value. This is not possible if the table is not empty.
  - Added the required column `extras` to the `tbl_sources_data` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tbl_daily_monitoring" DROP COLUMN "data",
ADD COLUMN     "extras" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "tbl_sources_data" DROP COLUMN "data",
ADD COLUMN     "extras" JSONB NOT NULL;
