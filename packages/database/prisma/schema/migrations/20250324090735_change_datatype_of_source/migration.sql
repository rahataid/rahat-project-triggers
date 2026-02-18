/*
  Warnings:

  - Changed the type of `source` on the `tbl_sources` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "tbl_sources" DROP COLUMN "source",
ADD COLUMN     "source" "DataSource" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tbl_sources_source_riverBasin_key" ON "tbl_sources"("source", "riverBasin");
