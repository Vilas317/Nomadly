# Initial Acceptance Testing Checklist

## Local infrastructure
- [ ] Docker database starts and reports healthy.
- [ ] Prisma client generates successfully.
- [ ] Prisma migration applies successfully.
- [ ] Seed command inserts destinations.

## API
- [ ] `GET /api/v1/health` returns status `ok`.
- [ ] `GET /api/v1/destinations` returns published destinations.
- [ ] `GET /api/v1/destinations?search=manali` filters results.
- [ ] `GET /api/v1/destinations/manali` returns the destination.
- [ ] Unknown destination returns HTTP 404.

## Web
- [ ] Home page renders.
- [ ] Main navigation works.
- [ ] Explore page renders destination cards.
- [ ] Connect page renders sample traveller cards.
- [ ] Trips page renders the trip-planning starter state.
- [ ] Festivals page renders sample festival cards and disclaimer.
- [ ] Profile page renders profile starter state.
- [ ] Layout works at mobile and desktop widths.

## Before public beta
- [ ] Authentication and authorization tests.
- [ ] Privacy and blocking tests.
- [ ] Report/moderation tests.
- [ ] Upload security tests.
- [ ] Accessibility checks.
- [ ] Database backup restore test.
