# Nomadly Stage 4.2 implementation patch

This patch adds email verification, Google Identity Services sign-in, and initial login/registration screens. It is designed to apply over the Stage 4.1 source snapshot (commit `706c5eb`).

## Files changed
- Prisma schema and migration for hashed, single-use email verification tokens.
- Auth service/controller routes for email verification, resend, and Google sign-in.
- Resend-backed email delivery abstraction.
- Redis rate-limit policies for new public endpoints.
- `/login`, `/register`, and `/verify-email` frontend routes.
- Google Identity Services button and client helpers.

## Required local configuration
Add these values to `apps/api/.env` (never commit the file):

```dotenv
RESEND_API_KEY=re_your_resend_key
EMAIL_FROM=Nomadly <verified-sender@your-domain.com>
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
```

Add this to `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
```

The Google Client ID must be the same web OAuth client in both places. Configure the authorized JavaScript origin(s) in Google Cloud Console (for local development, `http://localhost:3000`). Resend requires a verified sending domain/address appropriate to your account.

## Apply and generate Prisma client
From the repository root in PowerShell:

```powershell
pnpm --filter @nomadly/api exec prisma format
pnpm --filter @nomadly/api exec prisma migrate dev --name email_verification
pnpm db:generate
```

The patch includes a migration named `20261118190000_email_verification`. If Prisma reports that the migration name already exists, stop and inspect migration history rather than creating a duplicate.

## Run
```powershell
pnpm dev
```

Visit `http://localhost:3000/login` and `http://localhost:3000/register`.

## Important implementation notes / limitations
- Existing email/password users can still log in when unverified. The login page explains the status and offers resend.
- Registration persists the user before sending the email. If Resend delivery fails, the user record remains and can use the resend action after signing in.
- Resend is called through a small provider service; only this service needs replacing to change providers.
- Google ID tokens are validated server-side against Google's tokeninfo endpoint and the configured audience, and the email must be verified by Google. A Google-verified matching email is treated as proof of mailbox ownership and is marked verified. Google-only accounts receive a random unusable password hash; Nomadly never receives or stores their Google password.
- The current User schema requires a password hash. If you later implement account linking/unlinking or password recovery, model external identities explicitly (provider + provider subject) rather than treating email as a permanent provider identifier.
- Google tokeninfo is appropriate for this initial integration but is a network call on each login. Before high-volume production use, replace it with a maintained Google auth library that verifies JWT signatures, issuer, audience, and expiry locally using Google's rotating public keys.
- This patch does not enforce verified-email restrictions on social actions; the previously agreed policy is to allow login and introduce feature-specific restrictions later.
- This source patch has not been run against your local database or your provider credentials. Run the builds and tests below before committing.

## Verification checklist
1. `pnpm --filter @nomadly/api build`
2. `pnpm --filter @nomadly/web build`
3. Register a new email: ensure email delivery, token expiry, and single-use behavior.
4. Resend: verify previous token becomes unusable.
5. Verify expired/invalid/reused token returns an error and does not mark the account verified.
6. Confirm an unverified account can still log in and sees the resend action.
7. Configure Google Client ID and test both a new Google account and a matching existing email account.
8. Confirm both login methods set the existing HttpOnly access/refresh cookies and create an AuthSession.
9. Run the existing `STAGE-3-TESTS.ps1` and `STAGE-4.1-TESTS.ps1`.

Do not commit until these checks pass.
