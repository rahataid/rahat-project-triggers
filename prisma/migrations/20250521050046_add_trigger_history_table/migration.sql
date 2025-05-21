-- CreateTable
CREATE TABLE "tbl_trigger_history" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "repeatKey" TEXT NOT NULL,
    "repeatEvery" TEXT,
    "triggerStatement" JSONB,
    "triggerDocuments" JSONB,
    "notes" TEXT,
    "title" TEXT,
    "phaseId" TEXT,
    "phaseActivationDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "source" "DataSource",
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isTriggered" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isDailyMonitored" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" TEXT,
    "transactionHash" TEXT,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_trigger_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_trigger_history_uuid_key" ON "tbl_trigger_history"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_trigger_history_repeatKey_key" ON "tbl_trigger_history"("repeatKey");

-- AddForeignKey
ALTER TABLE "tbl_trigger_history" ADD CONSTRAINT "tbl_trigger_history_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "tbl_phases"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
