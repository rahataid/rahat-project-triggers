/*
  Warnings:

  - Added the required column `type` to the `tbl_sources_data` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('RAINFALL', 'WATER_LEVEL');

-- AlterTable
ALTER TABLE "tbl_sources_data" ADD COLUMN     "type" "SourceType" NOT NULL;
