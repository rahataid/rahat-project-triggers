-- AlterTable
ALTER TABLE "tbl_activities" ALTER COLUMN "isAutomated" SET DEFAULT false;

-- CreateTable
CREATE TABLE "tbl_sources_data" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "source" TEXT,
    "location" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_sources_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_daily_monitoring" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "dataEntryBy" TEXT NOT NULL,
    "source" TEXT,
    "location" TEXT,
    "data" JSONB NOT NULL,
    "createdBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_daily_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_sources_data_uuid_key" ON "tbl_sources_data"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_daily_monitoring_uuid_key" ON "tbl_daily_monitoring"("uuid");
