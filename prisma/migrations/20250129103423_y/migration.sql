-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateTable
CREATE TABLE "tbl_stats" (
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_stats_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "tbl_beneficiaries" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "walletAddress" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "extras" JSONB,
    "benTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tbl_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_stats_name_key" ON "tbl_stats"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_beneficiaries_uuid_key" ON "tbl_beneficiaries"("uuid");
