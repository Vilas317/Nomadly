# Nomadly API

NestJS API foundation.

Run from repository root:

```bash
pnpm dev:api
```

Base URL: `http://localhost:4000/api/v1`

- `GET /health`
- `GET /destinations`
- `GET /destinations/:slug`

The API currently implements health and destination read operations. Other domain modules are defined in the Prisma schema and roadmap but are not yet implemented as complete API workflows.
