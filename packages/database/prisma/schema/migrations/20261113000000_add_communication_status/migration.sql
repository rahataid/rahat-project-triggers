-- CreateEnum
CREATE TYPE "public"."CommunicationStatus" AS ENUM ('SCHEDULED', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."tbl_communications" ADD COLUMN     "status" "public"."CommunicationStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- CreateIndex
CREATE INDEX "tbl_communications_xrefId_status_idx" ON "public"."tbl_communications"("xrefId", "status");

-- Backfill
UPDATE "public"."tbl_communications" c
SET "status" = CASE
    WHEN c."isScheduled" AND c."scheduledAt" > NOW() THEN 'SCHEDULED'
    WHEN t.total = 0 OR t.pending = t.total THEN 'NOT_STARTED'
    WHEN t.cancelled = t.total THEN 'CANCELLED'
    WHEN t.pending + t.processing > 0 THEN 'IN_PROGRESS'
    WHEN t.failed = t.total - t.cancelled THEN 'FAILED'
    ELSE 'COMPLETED'
END::"public"."CommunicationStatus"
FROM (
    SELECT
        c2."id",
        COUNT(g."id") AS total,
        COUNT(g."id") FILTER (WHERE g."status" = 'PENDING') AS pending,
        COUNT(g."id") FILTER (WHERE g."status" = 'PROCESSING') AS processing,
        COUNT(g."id") FILTER (WHERE g."status" = 'FAILED') AS failed,
        COUNT(g."id") FILTER (WHERE g."status" = 'CANCELLED') AS cancelled
    FROM "public"."tbl_communications" c2
    LEFT JOIN "public"."tbl_communication_group_targets" g ON g."communicationId" = c2."id"
    GROUP BY c2."id"
) t
WHERE c."id" = t."id";
