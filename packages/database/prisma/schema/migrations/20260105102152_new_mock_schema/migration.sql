-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "mock";

-- CreateEnum
-- CREATE TYPE "mock"."MockSettingDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'OBJECT');

-- CreateTable
-- CREATE TABLE "mock"."tbl_settings" (
--     "name" TEXT NOT NULL,
--     "value" JSONB NOT NULL,
--     "dataType" "mock"."MockSettingDataType" NOT NULL,
--     "requiredFields" TEXT[],
--     "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
--     "isPrivate" BOOLEAN NOT NULL DEFAULT true,

--     CONSTRAINT "tbl_settings_pkey" PRIMARY KEY ("name")
-- );

-- CreateIndex
-- CREATE UNIQUE INDEX "tbl_settings_name_key" ON "mock"."tbl_settings"("name");
