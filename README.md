# Scholarship Finder

A personal Next.js application for technology scholarships, fellowships and training opportunities in Europe, the Americas and international online programmes. [PRODUCT.md](PRODUCT.md) defines requirements; [AGENTS.md](AGENTS.md) defines engineering standards.

The existing UI shell now supports owner-only GitHub authentication, profile preferences, durable on-demand discovery, a review queue, transactional approval and an approved-opportunity directory. Discovery never publishes automatically.

## Local setup

Use Node.js 24 LTS (`nvm use`), npm and PostgreSQL 14 or later. Use a database dedicated to this application.

```sh
npm ci
cp .env.example .env.local
```

Edit `.env.local` with your PostgreSQL connection string and personal GitHub OAuth credentials. Generate the authentication secret locally:

```sh
openssl rand -base64 32
```

Paste that value into `AUTH_SECRET`; never commit it. Configure the database before running:

```sh
npm run db:validate
npm run db:generate
npm run db:migrate
npm run dev
```

In another terminal, from this repository:

```sh
npm run worker
```

Open http://localhost:3000/dashboard. The public home page and empty directory can render without authentication configuration. Protected pages direct you to sign-in, and owner endpoints fail closed until configuration is complete. A configured but unavailable database shows an error rather than an invented empty result.

The worker is a separate process in this repository, not a separate backend API. It must remain running to process queued discoveries. Closing your browser does not stop it. After a worker crash, restart it; persisted query checkpoints and observations are reused, and pg-boss reclaims interrupted jobs after their lease expires (up to one hour).

## Personal GitHub sign-in

Create an **OAuth App** while signed into your personal GitHub account, `Fayomi49`, at [GitHub developer settings](https://github.com/settings/developers).

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- Put the client ID in `AUTH_GITHUB_ID` and client secret in `AUTH_GITHUB_SECRET`.
- Keep `OWNER_GITHUB_ID=132573008`, the public stable ID of your personal account.
- Set `AUTH_URL=http://localhost:3000` locally. Use your canonical HTTPS origin when deploying.

The application requests profile/email access, not repository access. It rejects other GitHub accounts before sign-in, and checks the linked provider account again for protected operations. No work-account access or public registration is enabled. No repository is created or pushed by setting up login.

Auth.js uses database sessions via the Prisma adapter. Do not use a client-supplied role or username to authorize requests. Configure OAuth separately for a production callback URL; never share production secrets with tests.

## Environment variables

| Variable                                | Purpose                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | PostgreSQL connection for Prisma and the queue worker                            |
| `AUTH_URL`                              | Canonical application origin, used for authentication and mutation-origin checks |
| `AUTH_SECRET`                           | Random authentication secret of at least 32 characters                           |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Personal GitHub OAuth app credentials                                            |
| `OWNER_GITHUB_ID`                       | Stable GitHub ID permitted to sign in                                            |
| `DISCOVERY_SEARCH_PROVIDER`             | `mock` (default) or `tavily`                                                     |
| `TAVILY_API_KEY`                        | Server-only search API key for live discovery                                    |
| `DISCOVERY_USER_AGENT`                  | Identified crawler, e.g. `ScholarshipFinder/1.0 (+https://YOUR-SITE/contact)`    |
| `TEST_DATABASE_URL`                     | Explicit isolated PostgreSQL URL for integration tests; never use production     |

The worker and Prisma CLI read `.env.local`; Next.js reads it normally. Never put these secrets into `NEXT_PUBLIC_` variables. `.env.example` contains placeholders and the public owner ID only.

## Discovery and review

1. Set your nationality, residence, degree, fields and destinations under **Edit your matching preferences**.
2. Click **Find New Scholarships** on the dashboard, optionally selecting filters.
3. Keep `npm run worker` running. Progress, result counts, duplicates, previously reviewed counts and errors are persisted.
4. Open **Review discovered opportunities**. Check the original source, application link and claim evidence.
5. Correct missing or unsupported details through **Edit and approve**. Confirm source authority and reviewed claims before approving. Approve multiple records by selecting up to 25.
6. Approved opportunities appear under `/scholarships`. Reject/ignore decisions remain attached on rediscovery.

Eligibility and relevance are separate. A confirmed mismatch is ineligible regardless of score. Unstated requirements need verification. Owner approval confirms the reviewed record, not the applicant's admission or funding entitlement.

### Mock discovery

`DISCOVERY_SEARCH_PROVIDER=mock` uses clearly labeled synthetic `.example` fixtures and makes no search or page requests. Run it repeatedly to see URL deduplication and retained review history. Demo candidates cannot be approved into the main scholarship database; this restriction is enforced on the server.

### Live discovery

Set `DISCOVERY_SEARCH_PROVIDER=tavily`, a `TAVILY_API_KEY`, and a contact-bearing `DISCOVERY_USER_AGENT` starting with `ScholarshipFinder`. Queries use Tavily Basic; optional answers and raw-content extraction are disabled. Nationality filters are sent to the search provider, but profile qualifications and private notes are not.

A run uses up to eight search attempts, including retries, with five results per query. Content requests are serial and limited to twenty, including redirects and retries. Individual HTTP requests have ten-second timeouts. HTML bodies are capped at 1.5 MB; robots bodies at 256 KB. Robots requests are separately cached and bounded by discovered hosts/redirects. HTTP 429 responses persist the provider/host cooldown from `Retry-After`; later runs respect it. Per-host pacing is at least 1.5 seconds and respects longer supported crawl delays. Excessive crawl delays are skipped.

Before the worker fetches a domain, review that site's terms and record a source policy using the local operator command:

```sh
npm run source:review -- HOST TERMS_URL official "Notes recording the terms you reviewed and the permission to fetch"
```

Use a hostname without scheme/path. Classification is `official`, `third-party` or `deny`. This command records your review; it does not decide whether terms permit fetching. Policies expire after 90 days. Run it again after checking current terms. Robots permission is checked independently; it does not substitute for terms permission. Domains without reviewed permission remain unverified search leads for manual inspection.

All page requests use DNS/IP validation, pinned connections and redirect revalidation. Private/reserved addresses, credentials in URLs, unsupported ports, CAPTCHAs, authentication barriers and paywalls are not bypassed. No page JavaScript runs.

Extraction supports exact labelled HTML facts, ISO dates, certain explicit stipend formats and selected JSON-LD programme/provider metadata. Arbitrary prose, language variants, PDFs and JavaScript-only pages often need manual correction. Funding and eligibility keywords alone never establish claims. Missing facts remain null/unknown; conflicting dates remain unknown. Search snippets do not verify facts. Official-page retrieval remains “needs review” until the owner checks claims.

Tavily currently lists 1,000 free monthly credits; Basic search costs one credit, and pay-as-you-go costs $0.008 per credit. Eight calls cost about $0.064 before free credits; 30 such runs cost about $1.92 excluding hosting. Check [current Tavily pricing](https://docs.tavily.com/documentation/api-credits) and your account terms before enabling paid usage. Failed attempts may consume provider credits, so they count toward the local budget.

## Architecture and migrations

```text
prisma/                   PostgreSQL schema and additive migrations
scripts/                  Durable worker and local source-policy operator command
src/
  app/                    Server-rendered routes, auth handlers and owner-only APIs
    dashboard/            Run controls and progress
    admin/discoveries/    Human review queue
    profile/              Matching preferences
    scholarships/         Published records and details
  components/             Existing shared layout and shadcn/ui primitives
  features/
    auth/                 Pure owner-identity policy
    discovery/            Zod contracts, identity rules and discovery/review UI
    matching/             Deterministic eligibility and relevance
    profile/              Preference form
  server/                 Server-only database, auth, fetching, pipeline and approval
  generated/prisma/       Generated, ignored client
tests/e2e/                Browser flows
```

PostgreSQL stores users, Auth.js accounts/sessions, profiles, scholarships and the planned saved-application relationships. Discoveries use separate runs, candidates, observations, source evidence and review events. SourcePolicy records reviewed access decisions. Flexible opportunity data is Zod-validated JSON alongside indexed scholarship fields and identity keys.

The migrations create application tables and a partial unique index enforcing one queued/running discovery per owner, then add intake-aware URL uniqueness and durable provider/host cooldown timestamps. It does not drop existing tables. If connecting a pre-existing database with tables of the same names, inspect/introspect and prepare a baseline migration first. Never reset an existing database to make migration succeed.

`DiscoveryRun` is a durable outbox: the web request only commits a run. The worker dispatches queued/running runs to pg-boss, which manages a separate `pgboss` schema with exclusive job keys, leases and retries. The worker database role needs permission to initialize that schema. Candidate observations and review transactions are idempotent. Approval locks candidates and checks duplicate identity/URLs before publication; unique constraints protect races.

For later schema changes, generate a development migration against a disposable/local database, inspect the SQL, back up persistent data and deploy with `npm run db:migrate`. Do not use `db push` or reset as a production migration workflow.

## Commands and tests

| Command                                       | Purpose                                    |
| --------------------------------------------- | ------------------------------------------ |
| `npm run dev`                                 | Next.js development server                 |
| `npm run build` / `npm start`                 | Production build/server                    |
| `npm run worker`                              | Durable discovery execution and dispatch   |
| `npm run source:review -- ...`                | Record a manually reviewed source policy   |
| `npm run db:generate` / `npm run db:validate` | Generate Prisma client / validate schema   |
| `npm run db:migrate`                          | Apply reviewed migrations                  |
| `npm run db:migrate:dev -- --name NAME`       | Create a development migration             |
| `npm run check`                               | Lint, strict types, formatting, unit tests |
| `npm run format`                              | Format implementation and documentation    |
| `npm run test:watch`                          | Watch unit tests                           |
| `npm run test:e2e`                            | Desktop and mobile browser checks          |

Install Chromium before browser checks:

```sh
npx playwright install chromium
npm run test:e2e
```

Unit tests cover extraction, validation, URL deduplication, hard matching criteria, date boundaries, owner authorization, robots, DNS and redirect restrictions. PostgreSQL integration tests additionally exercise concurrent run starts, checkpoint replay, retained review history, mock publication rejection, owner isolation, atomic approval, duplicate rollback and search failure.

By default the database suite is skipped. It currently requires an explicitly isolated local PostgreSQL instance on `127.0.0.1:55439`, with the migration applied. Run:

```sh
TEST_DATABASE_URL="postgresql://USER@127.0.0.1:55439/TEST_DATABASE" npx vitest run src/server/discovery/workflow.test.ts
```

For the authenticated browser workflow against that same isolated database, run:

```sh
TEST_DATABASE_URL="postgresql://USER@127.0.0.1:55439/TEST_DATABASE" npm run test:e2e
```

Playwright uses `.next-e2e` so it can run alongside a development server. It creates normal database session fixtures in the isolated test database, starts a real mock worker, and tests profile persistence, discovery and edit-and-approve. It never contacts GitHub or adds an application authentication bypass. The duplicate mobile copy of this owner workflow is intentionally skipped; public/access flows run on both devices and the owner workflow checks a mobile viewport.

The suite creates its own uniquely identified test user and removes only that user's records afterward. Do not point it at a database containing real records. Tests use synthetic data and mocked search results; no live search calls are required. OAuth itself must be verified manually after you configure your personal OAuth app. There is no production auth bypass for tests.

## Deployment boundary

Local development is configured first; no deployment has been selected or performed. Production needs PostgreSQL and a host capable of running the worker alongside Next.js, or a separately designed durable serverless executor. A serverless HTTP handler that starts work without waiting is not a replacement. Authentication requires a valid HTTPS origin and registered callback. System fonts and Webpack keep builds independent of font downloads and Turbopack worker restrictions.

Saved-application UI, notifications, general crawling and external LLM extraction remain outside this increment.
