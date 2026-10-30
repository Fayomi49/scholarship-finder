# Feature boundaries

Feature modules contain domain presentation and independently testable rules. Matching uses explicit hard requirements separately from relevance. Discovery contracts validate API filters, extracted candidates, review edits and profile preferences.

UI components call owner-protected route handlers. Persistence, authentication, restricted network fetching and approval transactions live in `src/server`. Routes and metadata live in `src/app`.

Synthetic discovery fixtures are explicitly labeled, use reserved `.example` URLs and cannot be published.
