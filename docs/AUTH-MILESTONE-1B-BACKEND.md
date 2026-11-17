# Nomadly — Authentication Milestone 1B (Backend)

## Included
- Email/password registration and login.
- Argon2id password hashing.
- Short-lived access JWT and rotating refresh JWT.
- Refresh token hashes stored in PostgreSQL; raw tokens are only placed in HttpOnly cookies.
- Logout revokes the current refresh token.
- Protected `GET /api/v1/auth/me`.
- DTO validation and duplicate email/username conflict handling.

## API
- `POST /api/v1/auth/register` — `{ "email", "password", "username", "displayName" }`; creates account but does not log in.
- `POST /api/v1/auth/login` — `{ "email", "password" }`; sets HttpOnly access/refresh cookies.
- `POST /api/v1/auth/refresh` — rotates refresh token cookie.
- `POST /api/v1/auth/logout` — revokes refresh token and clears cookies.
- `GET /api/v1/auth/me` — requires valid access cookie or Bearer token.

## Apply
1. Merge the ZIP contents into the project, preserving the folder structure.
2. From repository root run `pnpm install`.
3. Add `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to `apps/api/.env`. Use two different random secrets of at least 32 characters. Never commit `.env`.
4. Run `pnpm db:generate`.
5. Run `pnpm db:migrate` and name the migration `add_refresh_tokens` (the included SQL is reference/manual migration content; Prisma migration command should generate the local migration from schema).
6. Run `pnpm --filter @nomadly/api build`.
7. Start with `pnpm dev`.

## Important
The frontend is not wired to these endpoints in this patch. Registration currently creates an account; login establishes cookies. Email verification, password reset, Google sign-in, CSRF token strategy, rate limiting, session/device management and cleanup of expired refresh-token rows are not included yet.

Cookies use `SameSite=Lax`, HttpOnly and a path scoped to `/api/v1/auth`; `Secure` is enabled in production. Keep frontend and API on the same site in production or revisit cookie/CORS/CSRF design before deploying cross-site.
