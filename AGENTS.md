Codex Agent Instructions
Mission
Build a personal scholarship discovery and matching application for technology opportunities in Europe, the Americas, and international remote programmes. Publication requires owner review. Follow PRODUCT.md as the product source of truth and README.md for setup.
Stack

- Next.js App Router, TypeScript strict mode, Tailwind CSS, shadcn/ui
- PostgreSQL and Prisma
- Auth.js for authentication; Zod for boundary validation
- React Hook Form for complex forms; TanStack Query only where client-side server-state caching is justified
- Vitest for unit/integration tests; Playwright for critical browser flows
  Engineering rules

1. Work in small, reviewable increments. Before coding, summarize the plan and files affected.
2. Prefer Server Components for reads, Server Actions or route handlers for mutations as appropriate. Never expose secrets or database credentials to the client.
3. Enforce authorization on the server for every write. Only admins may create, edit, archive or delete scholarship records. Users may manage only their own profiles and saved applications.
4. Validate all inputs with Zod, normalize field/country/degree tags, and use database constraints where appropriate.
5. Store scholarship source URL, last verified date, deadline, funding, degree levels, eligible nationalities and fields of study. Allow unknown eligibility rather than assuming everyone qualifies.
6. Owner-requested internet discovery is approved. Use bounded search API queries and permitted public-page fetching. Respect reviewed site terms, robots rules and access restrictions. Store discoveries in a separate review queue; never automatically publish.
7. Make matching deterministic and explainable. Hard constraints must not be overridden by a relevance score. Missing eligibility information means 'needs verification', not 'eligible'.
8. Use accessible, responsive UI with clear empty, loading and error states. Dates should be timezone-aware and shown clearly.
9. Keep database access in server-only modules; separate UI, business logic and persistence. Use migrations for schema changes.
10. Add tests for matching rules, permission checks, date boundaries and validation. Do not claim tests passed unless actually run.
11. Do not invent scholarships or eligibility facts. Display source links and verification dates. Avoid promising guaranteed admission or funding.
12. Do not add unrelated features, external AI/LLM APIs, Redux, or a separate backend API without explicit approval. A PostgreSQL-backed discovery worker in this repository is approved.
    Suggested implementation order
13. Bootstrap Next.js project, lint/format/test setup and environment example.
14. Prisma schema and migration; seed local demo records clearly labeled as examples.
15. Auth and admin authorization.
16. Admin scholarship CRUD with validation.
17. Profile preferences and deterministic matching engine.
18. Discovery/search/detail screens and match explanations.
19. Saved scholarships and application statuses.
20. Deadline indicators, tests, accessibility and deployment notes.
    Definition of done

- Types, lint and relevant tests pass; core flows tested.
- Auth and ownership checks are server enforced.
- No secret keys committed.
- Documentation and .env.example updated when behavior changes.
- UI works on mobile and desktop; no misleading eligibility claims.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Approved discovery architecture

- Personal GitHub sign-in only. The configured owner is Fayomi49 (stable GitHub ID 132573008). Authorize against the linked GitHub account ID on the server, never a client-supplied email, username, or role. Missing configuration denies access.
- Keep reads in Server Components. Discovery/profile/review endpoints must authenticate the owner; mutations must validate origin and Zod input. Do not expose OAuth tokens or search keys.
- Use Prisma 7 and PostgreSQL. Apply additive migrations with `npm run db:migrate`; never reset an existing database. pg-boss manages its own queue schema separately.
- DiscoveryRun is the durable outbox. The local `npm run worker` dispatcher queues committed runs, and processing uses database checkpoints, idempotent observations, bounded retries, and the active-owner unique index.
- Use mock discovery by default, Tavily Basic for live discovery. Cap billable search attempts at 8 and content HTTP requests (including redirects and retries) at 20 per run. Process content serially with per-origin pacing. Robots fetches have separate bounded response sizes and are cached. Persist HTTP 429 cooldowns and honor Retry-After before subsequent requests.
- Fetch public HTTP(S) URLs only through `src/server/discovery/fetch.ts`. Validate every redirect and DNS answer, pin validated addresses, limit time/body size, and never bypass access controls. Reviewed SourcePolicy permission expires after 90 days. Robots permission is not permission under site terms.
- Preserve null/unknown for unsupported facts. Exact labelled HTML and supported JSON-LD can supply evidence; arbitrary pages, PDFs and JavaScript-only pages require manual review. Do not infer funding or unrestricted eligibility from keywords.
- Keep source evidence and verification timestamps. Human approval confirms source authority and reviewed claims; it never confirms the applicant's eligibility automatically.
- Demo candidates use reserved `.example` domains, are clearly synthetic, and cannot be published. Keep real OAuth and live provider requests out of automated tests.
- Test extraction, URL/identity normalization, country codes, hard eligibility, date boundaries, owner checks, SSRF, transaction races, failures and checkpoint replay. PostgreSQL integration tests require an explicit isolated test database; browser tests must not introduce a production authentication bypass.
- Local development is the approved initial deployment target. Select a persistent worker host or durable serverless executor before production deployment; do not replace the worker with fire-and-forget request code.
