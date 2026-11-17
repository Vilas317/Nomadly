CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- Backfill one session record for every existing refresh-token family.
INSERT INTO "AuthSession" ("id", "userId", "createdAt", "lastUsedAt", "expiresAt", "revokedAt")
SELECT
    "familyId",
    "userId",
    MIN("createdAt"),
    MAX("createdAt"),
    MAX("expiresAt"),
    CASE
        WHEN BOOL_AND("revokedAt" IS NOT NULL) THEN MAX("revokedAt")
        ELSE NULL
    END
FROM "RefreshToken"
GROUP BY "familyId", "userId";

CREATE INDEX "AuthSession_userId_revokedAt_idx"
    ON "AuthSession"("userId", "revokedAt");

CREATE INDEX "AuthSession_expiresAt_idx"
    ON "AuthSession"("expiresAt");

ALTER TABLE "AuthSession"
    ADD CONSTRAINT "AuthSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "AuthSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
