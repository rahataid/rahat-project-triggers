/*
  Warnings:

  - You are about to drop the column `sourceId` on the `tbl_phases` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[riverBasin,activeYear,name]` on the table `tbl_phases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[riverBasin]` on the table `tbl_sources` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `riverBasin` to the `tbl_phases` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "tbl_phases" DROP CONSTRAINT "tbl_phases_sourceId_fkey";

-- DropIndex
DROP INDEX "tbl_phases_sourceId_activeYear_name_key";

-- DropIndex
DROP INDEX "tbl_sources_source_riverBasin_key";

-- AlterTable
ALTER TABLE "tbl_phases" DROP COLUMN "sourceId",
ADD COLUMN     "riverBasin" TEXT NOT NULL,
ALTER COLUMN "activeYear" SET DATA TYPE TEXT;

-- First create a temporary column for the array type
ALTER TABLE "tbl_sources" ADD COLUMN "source_array" "DataSource"[];

-- Update the temporary column with an array containing the current source value
UPDATE "tbl_sources" SET "source_array" = ARRAY[source]::"DataSource"[];

-- Drop the original column
ALTER TABLE "tbl_sources" DROP COLUMN "source";

-- Rename the temporary column to the original column name
ALTER TABLE "tbl_sources" RENAME COLUMN "source_array" TO "source";

-- AlterTable
ALTER TABLE "tbl_triggers" ADD COLUMN     "source" "DataSource";

-- CreateIndex
CREATE UNIQUE INDEX "tbl_phases_riverBasin_activeYear_name_key" ON "tbl_phases"("riverBasin", "activeYear", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_sources_riverBasin_key" ON "tbl_sources"("riverBasin");

-- AddForeignKey
ALTER TABLE "tbl_phases" ADD CONSTRAINT "tbl_phases_riverBasin_fkey" FOREIGN KEY ("riverBasin") REFERENCES "tbl_sources"("riverBasin") ON DELETE RESTRICT ON UPDATE CASCADE;
