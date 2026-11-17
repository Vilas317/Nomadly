# Nomadly Authentication Stage 3 — Session Security

## Scope

This stage adds:
- A persisted `AuthSession` record for each login/device session.
- Access-token validation against the live session on every guarded request.
- Immediate invalidation of access tokens when a session is revoked.
- Session metadata (user agent and IP address) for device/session visibility.
- `GET /api/v1/auth/sessions` to list active sessions.
- `DELETE /api/v1/auth/sessions/:sessionId` to revoke one session.
- `POST /api/v1/auth/logout-all` to revoke all sessions for the authenticated user.
- Logout revokes the authenticated session, not only the refresh token currently in the cookie.
- Refresh rotation updates session last-used time and sliding expiry.

## Database migration

Migration: `20261117195000_add_auth_sessions`

The migration:
1. Creates `AuthSession`.
2. Backfills one session per existing refresh-token family.
3. Adds indexes.
4. Adds the `AuthSession.userId -> User.id` and `RefreshToken.familyId -> AuthSession.id` foreign keys.

The backfill runs before the foreign key is added so existing refresh-token families are preserved. Existing session IDs are the existing `familyId` values.

## Apply / verify

The Prisma schema changes are already integrated into `apps/api/prisma/schema.prisma`:
- `User.authSessions`
- `AuthSession`
- `RefreshToken.session`

Do not try to apply a separate `schema.prisma.stage-3.patch` file; the schema was updated directly.

From the repository root, run:

```powershell
pnpm --filter @nomadly/api exec prisma format
pnpm --filter @nomadly/api exec prisma validate
pnpm --filter @nomadly/api prisma:generate
pnpm db:migrate
pnpm --filter @nomadly/api build
pnpm --filter @nomadly/web build
```

## Endpoints

All endpoints below use the existing HttpOnly access cookie or a Bearer access token, except `POST /auth/refresh`, which uses the refresh cookie and requires `X-Refresh-Request-Id`.

- `GET /api/v1/auth/sessions`
  - Returns active sessions for the signed-in user.
  - Each item includes `id`, `createdAt`, `lastUsedAt`, `expiresAt`, `userAgent`, `ipAddress`, and `isCurrent`.
- `DELETE /api/v1/auth/sessions/:sessionId`
  - Revokes only the specified session owned by the current user.
  - If the current session is revoked, the response clears both auth cookies.
- `POST /api/v1/auth/logout-all`
  - Revokes every active session owned by the current user and clears both auth cookies.
- `POST /api/v1/auth/logout`
  - Requires a valid access token and revokes the current session immediately.

## Security notes / remaining production work

- The access token must contain `sid` (session/family ID).
- A refresh retry returns the previously generated successor bundle only when the same request ID is used within the 30-second retry window **and the session and account are still active**.
- Logout requires a valid access token. If the access token is already expired, this endpoint rejects the request; a separate recovery/logout flow may be added later.
- This stage intentionally does not add rate limiting. Use distributed rate limiting with Redis or a trusted edge gateway before public production deployment.
- `request.ip` is informational metadata. Do not treat it as a verified identity attribute; configure Express proxy trust carefully behind a reverse proxy.
- Review CSRF/origin protections and production cookie/CORS settings before public deployment.
- Session validation performs a database lookup on every guarded request to provide immediate revocation. This is an intentional consistency/performance trade-off.

## Regression test

Run `STAGE-3-TESTS.ps1` from the repository root while the API is running. It prompts for the local test account credentials securely and does not print tokens or cookies.

The script tests:
1. Two independent logins create distinct sessions.
2. One session can revoke the other.
3. The revoked session's access and refresh tokens return HTTP 401.
4. The unaffected session remains authenticated.
5. Logout-all invalidates the remaining access and refresh tokens.
6. A fresh session can use single-session logout, after which its access and refresh tokens return HTTP 401.

Do not print or share JWTs, cookies, passwords, or environment secrets while testing.
