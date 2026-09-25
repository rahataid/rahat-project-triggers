-- CreateEnum
CREATE TYPE "public"."TriggerCallbackType" AS ENUM ('ACTIVITY_COMMUNICATION', 'WEBHOOK', 'MS_EVENT', 'INTERNAL_EVENT');

-- CreateEnum
CREATE TYPE "public"."TriggerCallbackStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "public"."tbl_trigger_callbacks" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "type" "public"."TriggerCallbackType" NOT NULL,
    "name" TEXT,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dispatchedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_trigger_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_trigger_callback_logs" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "callbackId" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."TriggerCallbackStatus" NOT NULL DEFAULT 'PENDING',
    "request" JSONB,
    "response" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_trigger_callback_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_trigger_callbacks_uuid_key" ON "public"."tbl_trigger_callbacks"("uuid");

-- CreateIndex
CREATE INDEX "tbl_trigger_callbacks_triggerId_idx" ON "public"."tbl_trigger_callbacks"("triggerId");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_trigger_callback_logs_uuid_key" ON "public"."tbl_trigger_callback_logs"("uuid");

-- CreateIndex
CREATE INDEX "tbl_trigger_callback_logs_callbackId_idx" ON "public"."tbl_trigger_callback_logs"("callbackId");

-- CreateIndex
CREATE INDEX "tbl_trigger_callback_logs_triggerId_idx" ON "public"."tbl_trigger_callback_logs"("triggerId");

-- AddForeignKey
ALTER TABLE "public"."tbl_trigger_callbacks" ADD CONSTRAINT "tbl_trigger_callbacks_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "public"."tbl_triggers"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_trigger_callback_logs" ADD CONSTRAINT "tbl_trigger_callback_logs_callbackId_fkey" FOREIGN KEY ("callbackId") REFERENCES "public"."tbl_trigger_callbacks"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
