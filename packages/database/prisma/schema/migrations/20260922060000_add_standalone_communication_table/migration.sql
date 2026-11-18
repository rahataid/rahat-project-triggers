-- CreateEnum
CREATE TYPE "public"."CommunicationTargetStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."tbl_communications" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "xrefId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "subject" TEXT,
    "audioURL" JSONB,
    "transportId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_communication_group_targets" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "communicationId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupType" TEXT NOT NULL,
    "sessionId" TEXT,
    "status" "public"."CommunicationTargetStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_communication_group_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_communications_uuid_key" ON "public"."tbl_communications"("uuid");

-- CreateIndex
CREATE INDEX "tbl_communications_xrefId_idx" ON "public"."tbl_communications"("xrefId");

-- CreateIndex
CREATE INDEX "tbl_communications_transportId_idx" ON "public"."tbl_communications"("transportId");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_communication_group_targets_uuid_key" ON "public"."tbl_communication_group_targets"("uuid");

-- CreateIndex
CREATE INDEX "tbl_communication_group_targets_groupType_groupId_idx" ON "public"."tbl_communication_group_targets"("groupType", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_communication_group_targets_communicationId_groupType_g_key" ON "public"."tbl_communication_group_targets"("communicationId", "groupType", "groupId");

-- AddForeignKey
ALTER TABLE "public"."tbl_communication_group_targets" ADD CONSTRAINT "tbl_communication_group_targets_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "public"."tbl_communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
