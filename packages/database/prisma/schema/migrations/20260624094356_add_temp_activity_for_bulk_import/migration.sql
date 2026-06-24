-- CreateTable
CREATE TABLE "public"."tbl_temp_activities" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_temp_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_temp_activities_uuid_key" ON "public"."tbl_temp_activities"("uuid");

-- CreateIndex
CREATE INDEX "tbl_temp_activities_batchId_idx" ON "public"."tbl_temp_activities"("batchId");

-- CreateIndex
CREATE INDEX "tbl_temp_activities_status_idx" ON "public"."tbl_temp_activities"("status");
