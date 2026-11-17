# Stage 2 — Idempotent refresh

## Included
- Refresh requires `X-Refresh-Request-Id`.
- Server stores only a SHA-256 hash of that ID.
- AES-256-GCM encrypts the successor access/refresh token bundle on the consumed token row.
- Same old refresh token + same request ID within 30 seconds returns the same successor bundle.
- Different request ID or request outside the window is treated as reuse and revokes only that session family.
- Frontend API client uses same-tab single-flight and a short-lived request ID persisted in localStorage for network retries.
- Automatic post-refresh retry is limited to GET/HEAD/OPTIONS; mutation requests are not replayed automatically.

## Apply
1. Work in `D:\\CodeChronicles\\Projects\\Nomadly` on `feature/authentication`.
2. Commit or back up your current working Stage 1 changes first.
3. Replace `apps/api/src/modules/auth/auth.service.ts` and `auth.controller.ts` with the files in this patch.
4. Add the five fields listed in `apps/api/prisma/SCHEMA-CHANGE-STAGE-2.txt` to your existing `RefreshToken` model. Preserve `familyId`, `revokedAt`, `replacedByTokenHash` and existing indexes.
5. Keep the included migration folder in `apps/api/prisma/migrations`.
6. Generate an encryption key:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   Put it in `apps/api/.env` as `REFRESH_TOKEN_ENCRYPTION_KEY=<generated value>`. Do not send it in chat or commit `.env`.
7. Add a placeholder variable to `apps/api/.env.example` (not the real key).
8. Add `apps/web/src/lib/api-client.ts`.
9. Run:
   `pnpm --filter @nomadly/api exec prisma format`
   `pnpm --filter @nomadly/api prisma:generate`
   `pnpm db:migrate`
   `pnpm --filter @nomadly/api build`
   `pnpm --filter @nomadly/web build`

## Concurrency test
Login once and capture the original `nomadly_refresh` cookie as `$token`. Then run two requests with the SAME request ID:

```powershell
$requestId = [guid]::NewGuid().ToString()
$jobs = 1..2 | ForEach-Object {
  Start-Job -ArgumentList $token, $requestId -ScriptBlock {
    param($refreshToken, $id)
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $c = New-Object System.Net.Cookie("nomadly_refresh", $refreshToken, "/api/v1/auth", "localhost")
    $s.Cookies.Add($c)
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/refresh" -Method POST `
        -Headers @{ "X-Refresh-Request-Id" = $id } -WebSession $s
      $next = $s.Cookies.GetCookies("http://localhost:4000/api/v1/auth") |
        Where-Object Name -eq "nomadly_refresh" | Select-Object -ExpandProperty Value
      [PSCustomObject]@{ Status = [int]$r.StatusCode; Body = $r.Content; Successor = $next }
    } catch {
      [PSCustomObject]@{ Status = [int]$_.Exception.Response.StatusCode; Error = $_.ErrorDetails.Message }
    }
  }
}
$jobs | Wait-Job | Receive-Job
$jobs | Remove-Job
```

Expected: both HTTP 200 responses and identical successor refresh cookie values.

Then replay the original `$token` using a DIFFERENT request ID. Expected: HTTP 401 and revocation of that device family. Log in separately to create another device family and verify it remains unaffected.

## Caveats
- The frontend currently has no login/register UI wired to this client; this patch creates reusable API functions, not new auth pages.
- The localStorage request ID helps same-origin tabs share a short-lived key, but there is no explicit cross-tab mutex/BroadcastChannel lock yet. Validate tab races when auth UI is integrated.
- Access JWTs remain valid until expiry unless a later session-aware guard checks family status.
- Keep the encryption key stable. Changing it makes outstanding encrypted retry bundles unreadable.
