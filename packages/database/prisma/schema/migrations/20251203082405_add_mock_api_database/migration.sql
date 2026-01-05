/*
  Warnings:

  - You are about to drop the `tbl_activities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_activity_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_activity_managers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_applications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_daily_monitoring` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_phases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_sources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_sources_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_stats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_trigger_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tbl_triggers` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `dataType` on the `tbl_settings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."ActivityStatus" AS ENUM ('NOT_STARTED', 'WORK_IN_PROGRESS', 'COMPLETED', 'DELAYED');

-- CreateEnum
CREATE TYPE "public"."ApplicationEnvironment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST');

-- CreateEnum
CREATE TYPE "mock"."MockSettingDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'OBJECT');

-- CreateEnum
CREATE TYPE "public"."Phases" AS ENUM ('PREPAREDNESS', 'READINESS', 'ACTIVATION');

-- CreateEnum
CREATE TYPE "public"."SettingDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'OBJECT');

-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('RAINFALL', 'WATER_LEVEL');

-- CreateEnum
CREATE TYPE "public"."DataSource" AS ENUM ('DHM', 'GLOFAS', 'MANUAL', 'DAILY_MONITORING', 'GFH');

-- DropForeignKey
ALTER TABLE "tbl_activities" DROP CONSTRAINT "tbl_activities_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "tbl_activities" DROP CONSTRAINT "tbl_activities_managerId_fkey";

-- DropForeignKey
ALTER TABLE "tbl_activities" DROP CONSTRAINT "tbl_activities_phaseId_fkey";

-- DropForeignKey
ALTER TABLE "tbl_daily_monitoring" DROP CONSTRAINT "tbl_daily_monitoring_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "tbl_phases" DROP CONSTRAINT "tbl_phases_riverBasin_fkey";

-- DropForeignKey
ALTER TABLE "tbl_sources_data" DROP CONSTRAINT "tbl_sources_data_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "tbl_trigger_history" DROP CONSTRAINT "tbl_trigger_history_phaseId_fkey";

-- DropForeignKey
ALTER TABLE "tbl_triggers" DROP CONSTRAINT "tbl_triggers_phaseId_fkey";

-- AlterTable
ALTER TABLE "mock"."tbl_settings" DROP COLUMN "dataType",
ADD COLUMN     "dataType" "mock"."MockSettingDataType" NOT NULL;

-- DropTable
DROP TABLE "tbl_activities";

-- DropTable
DROP TABLE "tbl_activity_categories";

-- DropTable
DROP TABLE "tbl_activity_managers";

-- DropTable
DROP TABLE "tbl_applications";

-- DropTable
DROP TABLE "tbl_daily_monitoring";

-- DropTable
DROP TABLE "tbl_phases";

-- DropTable
DROP TABLE "tbl_sources";

-- DropTable
DROP TABLE "tbl_sources_data";

-- DropTable
DROP TABLE "tbl_stats";

-- DropTable
DROP TABLE "tbl_trigger_history";

-- DropTable
DROP TABLE "tbl_triggers";

-- DropEnum
DROP TYPE "ActivityStatus";

-- DropEnum
DROP TYPE "ApplicationEnvironment";

-- DropEnum
DROP TYPE "DataSource";

-- DropEnum
DROP TYPE "Phases";

-- DropEnum
DROP TYPE "SettingDataType";

-- DropEnum
DROP TYPE "SourceType";

-- CreateTable
CREATE TABLE "public"."tbl_activity_categories" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_activity_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_activity_managers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "public"."tbl_activities" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leadTime" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "managerId" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "status" "public"."ActivityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "activityDocuments" JSONB,
    "activityCommunication" JSONB,
    "activityPayout" JSONB,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "differenceInTriggerAndActivityCompletion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_applications" (
    "cuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "description" TEXT,
    "environment" "public"."ApplicationEnvironment" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_applications_pkey" PRIMARY KEY ("cuid")
);

-- CreateTable
CREATE TABLE "public"."tbl_stats" (
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_stats_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "public"."tbl_phases" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" "public"."Phases" NOT NULL,
    "activeYear" TEXT NOT NULL,
    "requiredMandatoryTriggers" INTEGER DEFAULT 0,
    "requiredOptionalTriggers" INTEGER DEFAULT 0,
    "receivedMandatoryTriggers" INTEGER DEFAULT 0,
    "receivedOptionalTriggers" INTEGER DEFAULT 0,
    "canRevert" BOOLEAN NOT NULL DEFAULT false,
    "canTriggerPayout" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "riverBasin" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_settings" (
    "name" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "dataType" "public"."SettingDataType" NOT NULL,
    "requiredFields" TEXT[],
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tbl_settings_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "public"."tbl_sources" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "source" "public"."DataSource"[],
    "riverBasin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_sources_data" (
    "id" SERIAL NOT NULL,
    "type" "public"."SourceType" NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "dataSource" "public"."DataSource",
    "info" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_sources_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_daily_monitoring" (
    "id" SERIAL NOT NULL,
    "groupKey" TEXT,
    "dataEntryBy" TEXT NOT NULL,
    "info" JSONB NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "dataSource" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_daily_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_triggers" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "repeatKey" TEXT NOT NULL,
    "repeatEvery" TEXT,
    "triggerStatement" JSONB,
    "triggerDocuments" JSONB,
    "notes" TEXT,
    "title" TEXT,
    "description" TEXT,
    "phaseId" TEXT,
    "source" "public"."DataSource",
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isTriggered" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isDailyMonitored" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "triggeredBy" TEXT,
    "transactionHash" TEXT,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_trigger_history" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "repeatKey" TEXT NOT NULL,
    "repeatEvery" TEXT,
    "triggerStatement" JSONB,
    "triggerDocuments" JSONB,
    "notes" TEXT,
    "title" TEXT,
    "description" TEXT,
    "phaseId" TEXT,
    "phaseActivationDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "source" "public"."DataSource",
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isTriggered" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isDailyMonitored" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" TEXT,
    "transactionHash" TEXT,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3) NOT NULL,
    "revertedBy" TEXT NOT NULL,

    CONSTRAINT "tbl_trigger_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_activity_categories_uuid_key" ON "public"."tbl_activity_categories"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_activity_categories_app_name_key" ON "public"."tbl_activity_categories"("app", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_activity_managers_id_key" ON "public"."tbl_activity_managers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_activities_uuid_key" ON "public"."tbl_activities"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_stats_name_key" ON "public"."tbl_stats"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_phases_uuid_key" ON "public"."tbl_phases"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_phases_riverBasin_activeYear_name_key" ON "public"."tbl_phases"("riverBasin", "activeYear", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_settings_name_key" ON "public"."tbl_settings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_sources_uuid_key" ON "public"."tbl_sources"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_sources_riverBasin_key" ON "public"."tbl_sources"("riverBasin");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_triggers_uuid_key" ON "public"."tbl_triggers"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_triggers_repeatKey_key" ON "public"."tbl_triggers"("repeatKey");

-- AddForeignKey
ALTER TABLE "public"."tbl_activities" ADD CONSTRAINT "tbl_activities_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."tbl_phases"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_activities" ADD CONSTRAINT "tbl_activities_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."tbl_activity_categories"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_activities" ADD CONSTRAINT "tbl_activities_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."tbl_activity_managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_phases" ADD CONSTRAINT "tbl_phases_riverBasin_fkey" FOREIGN KEY ("riverBasin") REFERENCES "public"."tbl_sources"("riverBasin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_sources_data" ADD CONSTRAINT "tbl_sources_data_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."tbl_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_daily_monitoring" ADD CONSTRAINT "tbl_daily_monitoring_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."tbl_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_triggers" ADD CONSTRAINT "tbl_triggers_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."tbl_phases"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_trigger_history" ADD CONSTRAINT "tbl_trigger_history_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."tbl_phases"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
