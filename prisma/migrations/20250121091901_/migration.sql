-- CreateEnum
CREATE TYPE "ApplicationEnvironment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('DHM', 'GLOFAS', 'MANUAL');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('NOT_STARTED', 'WORK_IN_PROGRESS', 'COMPLETED', 'DELAYED');

-- CreateEnum
CREATE TYPE "Phases" AS ENUM ('PREPAREDNESS', 'READINESS', 'ACTIVATION');

-- CreateTable
CREATE TABLE "tbl_applications" (
    "cuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "description" TEXT,
    "environment" "ApplicationEnvironment" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_applications_pkey" PRIMARY KEY ("cuid")
);

-- CreateTable
CREATE TABLE "tbl_phases" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "name" "Phases" NOT NULL,
    "requiredMandatoryTriggers" INTEGER DEFAULT 0,
    "requiredOptionalTriggers" INTEGER DEFAULT 0,
    "receivedMandatoryTriggers" INTEGER DEFAULT 0,
    "receivedOptionalTriggers" INTEGER DEFAULT 0,
    "canRevert" BOOLEAN NOT NULL DEFAULT false,
    "canTriggerPayout" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_triggers" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "repeatKey" TEXT NOT NULL,
    "title" TEXT,
    "dataSource" "DataSource" NOT NULL,
    "location" TEXT,
    "repeatEvery" TEXT,
    "triggerStatement" JSONB,
    "triggerDocuments" JSONB,
    "notes" TEXT,
    "phaseId" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isTriggered" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" TEXT,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_activity_categories" (
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
CREATE TABLE "tbl_activities" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leadTime" TEXT NOT NULL,
    "responsibility" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "activityDocuments" JSONB,
    "activityCommunication" JSONB,
    "activityPayout" JSONB,
    "isAutomated" BOOLEAN NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "differenceInTriggerAndActivityCompletion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_phases_uuid_key" ON "tbl_phases"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_phases_name_key" ON "tbl_phases"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_triggers_uuid_key" ON "tbl_triggers"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_triggers_repeatKey_key" ON "tbl_triggers"("repeatKey");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_activity_categories_uuid_key" ON "tbl_activity_categories"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_activity_categories_name_key" ON "tbl_activity_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_activities_uuid_key" ON "tbl_activities"("uuid");

-- AddForeignKey
ALTER TABLE "tbl_triggers" ADD CONSTRAINT "tbl_triggers_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "tbl_phases"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_activities" ADD CONSTRAINT "tbl_activities_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "tbl_phases"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_activities" ADD CONSTRAINT "tbl_activities_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tbl_activity_categories"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
