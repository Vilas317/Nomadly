# Nomadly

**Discover. Connect. Plan. Book. Experience.**

Nomadly is an India-first social travel and discovery ecosystem. This repository is the initial runnable development foundation for the product.

## What's included

- `apps/web`: Next.js + TypeScript responsive web application with Explore, Connect, Trips, Festivals and Profile starter screens.
- `apps/api`: NestJS REST API foundation with health and destination endpoints.
- `packages/shared`: shared TypeScript types.
- `prisma/schema.prisma`: initial PostgreSQL data model for users, destinations, posts, connections, trips, messaging, festivals and moderation.
- `docker-compose.yml`: local PostgreSQL database.
- `docs/`: product scope, architecture, development roadmap and the Nomadly visual design system.

## Important scope note

This is a **starter foundation**, not a completed production travel platform. The web app includes working navigation and seeded demonstration content. The API includes health and destination read endpoints. The database schema establishes the initial domain model. Authentication, uploads, live chat, matching, AI, booking, payments, moderation workflows and the remaining business logic must be implemented and tested in subsequent milestones.

## Requirements

- Node.js 20.11+
- pnpm 9+
- Docker Desktop (recommended for local PostgreSQL)

## Quick start

1. Extract this ZIP.
2. Open a terminal in the `nomadly` directory.
3. Install dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

4. Create your local environment files:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item apps/api/.env.example apps/api/.env
   Copy-Item apps/web/.env.example apps/web/.env.local
   ```

5. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

6. Generate the Prisma client and apply the initial migration:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

7. Start web and API in development mode:

   ```bash
   pnpm dev
   ```

8. Open:
   - Web: http://localhost:3000
   - API health: http://localhost:4000/api/v1/health
   - API destinations: http://localhost:4000/api/v1/destinations

## Useful commands

```bash
pnpm dev           # Run web and API together
pnpm dev:web       # Run Next.js only
pnpm dev:api       # Run NestJS only
pnpm build         # Build both applications
pnpm lint          # Run available lint scripts
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Create/apply local migrations
pnpm db:seed       # Insert sample destinations and festivals
pnpm db:studio     # Open Prisma Studio
```

## Environment variables

See `apps/api/.env.example` and `apps/web/.env.example`.

Do not commit `.env` or `.env.local` files. Never put API secrets in browser-exposed variables.

## Development order

See `docs/DEVELOPMENT-ROADMAP.md`. Recommended next milestone: implement authentication and user onboarding end-to-end, then destination administration and saved destinations.

## Visual direction

The starter now includes the first pass of Nomadly's calm, premium, editorial travel UI: a cinematic homepage hero, spacious layouts, restrained forest/sage/sand palette, refined responsive cards and subtle interactions. See `docs/DESIGN-SYSTEM.md` for the design principles and implementation guardrails. This is a visual foundation, not a finished production design; replace demo imagery with licensed optimized assets before launch.

## Brand

Nomadly is a working product name. Check domain, social handle, app-store and trademark availability before public launch.
