-- CreateEnum
CREATE TYPE "public"."CommunicationGroupType" AS ENUM ('STAKEHOLDERS', 'BENEFICIARY');

-- CreateTable
CREATE TABLE "public"."tbl_communications" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "xrefId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "subject" TEXT,
    "audioURL" JSONB,
    "sessionId" TEXT,
    "transportId" TEXT,
    "groupId" TEXT NOT NULL,
    "groupType" "public"."CommunicationGroupType" NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_communications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_communications_uuid_key" ON "public"."tbl_communications"("uuid");

-- CreateIndex
CREATE INDEX "tbl_communications_xrefId_idx" ON "public"."tbl_communications"("xrefId");

-- CreateIndex
CREATE INDEX "tbl_communications_groupId_idx" ON "public"."tbl_communications"("groupId");
