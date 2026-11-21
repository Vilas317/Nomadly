NOMADLY — STAGE 4.3 FRONTEND AUTHENTICATION STATE PATCH

Included files (preserve paths):
- apps/web/src/context/auth-context.tsx
- apps/web/src/components/app-shell.tsx
- apps/web/src/components/google-sign-in.tsx
- apps/web/src/app/login/page.tsx
- apps/web/src/app/layout.tsx
- apps/web/src/lib/api-client.ts

Changes:
1. Adds shared AuthProvider. It checks GET /api/v1/auth/me at application startup.
2. Synchronizes Google and email/password sign-in with shared auth state.
3. Shows Sign in when logged out; Your profile + Logout when authenticated.
4. Adds logout controls to desktop and mobile navigation.
5. Preserves the existing API URL, credentials: include, refresh request ID and retry behavior, and existing auth helpers.

Install:
1. Extract this ZIP at the Nomadly repository root, preserving folder structure.
2. Replace the listed files.
3. Run from repository root:
   pnpm --filter @nomadly/web build
4. If the build passes, test logged-out navigation, Google login, page refresh while signed in, logout, and email/password login.

No backend files, Prisma schema, migrations, or environment variables are changed.
Do not share JWTs, cookie values, Google credentials, or .env files.
Do not commit/push until builds and focused functional checks pass.
