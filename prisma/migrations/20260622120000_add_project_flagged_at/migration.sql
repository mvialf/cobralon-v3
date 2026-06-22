-- Add explicit timestamp for project attention markers.
ALTER TABLE "Project" ADD COLUMN "flaggedAt" TIMESTAMP(3);

-- Preserve ordering for projects flagged before this column existed.
UPDATE "Project"
SET "flaggedAt" = "updatedAt"
WHERE "flagStatus" = 'flagged' AND "flaggedAt" IS NULL;

CREATE INDEX "Project_flagStatus_flaggedAt_idx" ON "Project"("flagStatus", "flaggedAt" DESC);
