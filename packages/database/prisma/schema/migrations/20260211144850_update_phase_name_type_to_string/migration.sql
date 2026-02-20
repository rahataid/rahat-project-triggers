/*
  Warnings:

  - Changed the type of `name` on the `tbl_phases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."tbl_phases" DROP COLUMN "name",
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tbl_phases_riverBasin_activeYear_name_key" ON "public"."tbl_phases"("riverBasin", "activeYear", "name");
