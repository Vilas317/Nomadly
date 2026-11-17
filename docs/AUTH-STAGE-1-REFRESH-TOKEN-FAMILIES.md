# Authentication Hardening — Stage 1: Refresh-token families

## What changes
- Each login creates a unique refresh-token family (`familyId`).
- Every refresh token in that login session retains the same family ID.
- Consumed refresh-token rows are retained with `revokedAt` and `replacedByTokenHash`; they are no longer deleted.
- Rotation conditionally consumes the current token and inserts its successor in one database transaction.
- If an already-consumed token is presented again, every still-active token in that family is revoked.
- Logout revokes the entire refresh-token family represented by the supplied refresh cookie.

## Apply
1. Merge this ZIP into the repository, replacing the existing `apps/api/src/modules/auth/auth.service.ts` and adding the migration and documentation.
2. Apply the changes in `SCHEMA-CHANGE.txt` to the existing `RefreshToken` model in `apps/api/prisma/schema.prisma`. Do not replace the full schema.
3. From the repository root run:
   `pnpm --filter @nomadly/api exec prisma format`
   `pnpm --filter @nomadly/api prisma:generate`
   `pnpm db:migrate`
   The migration SQL is already included in this ZIP, so Prisma should apply that existing migration. Do not create a second migration for the same columns.
4. Run:
   `pnpm --filter @nomadly/api build`

## Testing notes
- Existing login, refresh, and logout flows must be retested after migration.
- To test reuse, log in, save the first refresh cookie securely in a local variable, rotate once, then replay the saved old cookie in a separate cookie session. Expected result: HTTP 401 and revocation of the whole family, including the current successor.
- A concurrent refresh race should be tested with two requests using the same cookie. Exactly one request should rotate successfully; the losing request is treated as reuse and revokes the family.

## Scope and caveats
- This stage hardens refresh-token family handling only. It does not yet add CSRF defenses, rate limiting, device/session management UI, or immediate revocation of already-issued access JWTs. Access JWTs remain valid until their 15-minute expiry unless a later stage adds server-side session checks.
- Keep revoked rows for detection and audit. Expired/revoked-row retention cleanup is a later stage; do not delete rows before the reuse-detection retention window has elapsed.
