ALTER TABLE "RefreshToken"
ADD COLUMN "refreshRequestKeyHash" TEXT,
ADD COLUMN "retryUntil" TIMESTAMP(3),
ADD COLUMN "successorCiphertext" TEXT,
ADD COLUMN "successorIv" TEXT,
ADD COLUMN "successorAuthTag" TEXT;

CREATE INDEX "RefreshToken_retryUntil_idx" ON "RefreshToken"("retryUntil");
