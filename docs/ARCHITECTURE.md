# Architecture

## Architecture style

Start with a modular monolith. Avoid microservices until real scale and team requirements justify them.

## Applications

- `apps/web`: Next.js App Router frontend.
- `apps/api`: NestJS REST API.
- `packages/shared`: shared TypeScript contracts.

## Data

PostgreSQL is the primary database. The initial schema includes core social, destination, trip, messaging, festival and moderation entities. PostGIS is available in the local database image; geographic columns and spatial indexes can be introduced when nearby discovery is implemented.

## API conventions

- Prefix: `/api/v1`
- JSON request and response bodies.
- DTO validation in NestJS.
- Consistent error response format should be standardized before broad API expansion.
- Authorization must be enforced server-side.

## Security decisions still required

Before production:
- Choose and implement session/auth strategy.
- Add password reset and email verification providers.
- Add role-based admin authorization.
- Add rate limiting and abuse protection.
- Add upload validation and malware/content checks.
- Add privacy controls and account deletion.
- Add audit logging for moderation and admin operations.
- Review privacy and legal requirements for India.
