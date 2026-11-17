# Nomadly Stage 4.1 — Redis-backed authentication rate limiting

This patch adds shared, Redis-backed fixed-window rate limits to the authentication routes. It does not change Prisma models or require a database migration.

## What changes

- Redis 7 is added to the existing Docker Compose stack.
- `ioredis` is added to the API package.
- A NestJS route decorator and guard apply endpoint-specific limits.
- A Lua script increments and checks all buckets atomically.
- IP and email identifiers are HMAC-SHA256 hashed before they are used in Redis keys. The HMAC key is a dedicated `RATE_LIMIT_HMAC_SECRET`, independent of JWT signing secrets. raw email addresses and IP addresses are not written to Redis key names.
- If Redis is unavailable, protected authentication routes fail closed with HTTP 503. They do not silently fall back to per-process counters.
- HTTP 429 responses include `Retry-After`.
- Express trusts no proxy by default. `TRUST_PROXY_HOPS` must be set to the exact number of trusted reverse-proxy hops in production; do not set it to `true`.

## Initial policies

| Endpoint | Bucket | Limit | Window |
|---|---|---:|---:|
| `POST /auth/register` | Per IP | 5 | 15 minutes |
| `POST /auth/login` | Per IP + normalized email | 10 | 15 minutes |
| `POST /auth/login` | Per IP across emails | 50 | 15 minutes |
| `POST /auth/refresh` | Per IP | 60 | 1 minute |
| `POST /auth/logout` | Per IP | 20 | 1 minute |
| `POST /auth/logout-all` | Per IP | 20 | 1 minute |

These are initial policies, not universal values. Review and tune them using real traffic and abuse patterns before public launch. In particular, refresh retries still consume the refresh endpoint's generous per-IP allowance; the Stage 2 same-request-ID retry behavior is otherwise unchanged.

## Apply the patch

1. Stop the running API (`Ctrl+C` in the terminal running `pnpm dev`).
2. Extract this ZIP into the Nomadly repository root, preserving the folder structure and allowing the listed files to be replaced.
3. From the repository root, install the Redis client:

   ```powershell
   pnpm --filter @nomadly/api add ioredis
   ```

   This updates `apps/api/package.json` and the workspace `pnpm-lock.yaml`. Keep both changes for the eventual commit.

4. Compare your existing `apps/api/.env` with `apps/api/.env.example`. Do not overwrite `.env` and do not paste secrets into chat. Ensure these values exist in `.env`:

   ```dotenv
   REDIS_URL=redis://127.0.0.1:6379
   REDIS_CONNECT_TIMEOUT_MS=2000
   REDIS_COMMAND_TIMEOUT_MS=2000
   TRUST_PROXY_HOPS=0
   ```

   Keep the existing `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REFRESH_TOKEN_ENCRYPTION_KEY`, and `DATABASE_URL` unchanged. Configure `RATE_LIMIT_HMAC_SECRET` as a separate 64-character hexadecimal secret. Changing it resets the effective Redis rate-limit key namespace. The updated example documents the actual local PostgreSQL host port `5433`.

5. Start Redis:

   ```powershell
   docker compose up -d redis
   docker compose ps
   ```

   Wait until `nomadly-redis` reports healthy. You can also verify it with:

   ```powershell
   docker exec nomadly-redis redis-cli ping
   ```

   Expected output: `PONG`.

6. Build the API:

   ```powershell
   pnpm --filter @nomadly/api build
   ```

7. Start the application:

   ```powershell
   pnpm dev
   ```

## Tests

In a second PowerShell terminal at the repository root, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\STAGE-4.1-TESTS.ps1
```

The script uses synthetic `.invalid` email addresses and intentionally wrong passwords. It does not create users or need real account credentials. It checks:

- API health is available.
- The first 10 login attempts for a fresh email+IP identity reach credential validation and return 401.
- The 11th attempt returns 429.
- The 429 response contains `Retry-After`.
- A different email from the same IP has an independent email+IP bucket.

Then rerun the existing Stage 3 regression script to confirm session management remains intact:

```powershell
.\STAGE-3-TESTS.ps1
```

That script prompts for an existing local test account's credentials.

## Additional manual checks before committing

### Registration limit

Use a known existing email and submit six registration attempts from the same client IP within 15 minutes. The first five should reach the registration service (normally returning 409 for an existing email); the sixth should return 429. Do not use a new email for this check, because a successful first request would create an account.

### Refresh and idempotency

Run the existing Stage 2 refresh-idempotency regression steps. Confirm that two retries using the same old refresh token and the same `X-Refresh-Request-Id` still return the same successor token bundle within the retry window. Confirm that a different request ID still triggers the existing replay response. The new refresh rate limit is 60 requests per IP per minute, so a normal pair of retries is not blocked.

### Redis outage behavior

1. Keep the API running.
2. Stop Redis:

   ```powershell
   docker stop nomadly-redis
   ```

3. Send one login request. The route should return HTTP 503, not process credentials without rate limiting.
4. Restart Redis:

   ```powershell
   docker start nomadly-redis
   ```
5. Retry after Redis is healthy. Authentication should resume.

Do not run this outage check against a shared or production environment.

## Deployment notes

- Redis must be private to the application network, authenticated, and preferably encrypted in transit in production. The local Compose service binds to `127.0.0.1` and intentionally has no password because it is for local development only.
- Set `REDIS_URL` to the production Redis connection URL. Do not expose Redis publicly.
- Set `TRUST_PROXY_HOPS` to the exact trusted proxy count. Incorrect proxy trust can let clients spoof their IP and bypass IP-based limits.
- Rate limits are fixed-window counters. A rolling-window or token-bucket algorithm may be appropriate later if production traffic requires smoother limits.
- Redis uses `noeviction`; if it runs out of memory, rate-limited authentication fails closed with 503. Monitor Redis memory and configure appropriate capacity/alerts.
- Rate limiting reduces brute-force throughput but is not a substitute for email verification, MFA, breached-password checks, monitoring, or a full production security review.
