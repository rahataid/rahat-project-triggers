-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "mock";

-- CreateEnum
CREATE TYPE "mock"."MockSettingDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'OBJECT');

-- CreateEnum
CREATE TYPE "public"."Chain" AS ENUM ('EVM', 'STELLAR');

-- CreateTable
CREATE TABLE "mock"."tbl_settings" (
    "name" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "dataType" "mock"."MockSettingDataType" NOT NULL,
    "requiredFields" TEXT[],
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tbl_settings_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "public"."tbl_phase_blockchain" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockchainId" TEXT NOT NULL,
    "chain" "public"."Chain" NOT NULL DEFAULT 'EVM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_phase_blockchain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tbl_source_blockchain" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockchainId" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'evm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_source_blockchain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_settings_name_key" ON "mock"."tbl_settings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_phase_blockchain_phaseId_key" ON "public"."tbl_phase_blockchain"("phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_source_blockchain_sourceId_key" ON "public"."tbl_source_blockchain"("sourceId");

-- AddForeignKey
ALTER TABLE "public"."tbl_phase_blockchain" ADD CONSTRAINT "tbl_phase_blockchain_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."tbl_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tbl_source_blockchain" ADD CONSTRAINT "tbl_source_blockchain_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."tbl_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
