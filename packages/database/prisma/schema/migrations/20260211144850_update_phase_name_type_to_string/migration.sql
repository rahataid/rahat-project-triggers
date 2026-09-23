/*
  Warnings:

  - Changed the type of `name` on the `tbl_phases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable

ALTER TABLE "public"."tbl_phases"
ALTER COLUMN "name" TYPE TEXT USING "name"::text;

ALTER TABLE "public"."tbl_phases"
ALTER COLUMN "name" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tbl_phases_riverBasin_activeYear_name_key" ON "public"."tbl_phases"("riverBasin", "activeYear", "name");
