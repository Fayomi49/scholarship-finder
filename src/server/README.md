# Server boundary

All executable modules here import `server-only`. Database credentials, sessions, provider tokens, page fetching, queue persistence and approval transactions stay on the server.

`requireOwner()` authenticates the database session and checks its linked GitHub provider account against the configured stable owner ID. Every discovery/profile/review route calls it. Mutations also validate request origin and Zod input. Route guards are not a substitute for service ownership checks.

The worker imports persistence and domain logic without importing Next.js authentication. `errors.ts` provides shared errors without coupling worker execution to the web runtime. `DiscoveryRun` serves as the durable outbox. See README.md for worker startup and database migrations.
