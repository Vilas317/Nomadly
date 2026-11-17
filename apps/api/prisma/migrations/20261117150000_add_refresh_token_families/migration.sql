-- Keep consumed refresh tokens so reuse can be detected.
ALTER TABLE "RefreshToken"
ADD COLUMN "familyId" TEXT,
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "replacedByTokenHash" TEXT;

-- Existing refresh rows (if any) become their own family. This is a safe
-- backfill for databases that already have refresh-token records.
UPDATE "RefreshToken" SET "familyId" = "id" WHERE "familyId" IS NULL;

ALTER TABLE "RefreshToken"
ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX "RefreshToken_familyId_revokedAt_idx"
ON "RefreshToken"("familyId", "revokedAt");
