Product Requirements — Scholarship Finder
Product vision
A personal scholarship discovery, matching and application-tracking platform focused on Europe and the Americas. The owner curates scholarship information from official websites, with on-demand internet discovery feeding a separate review queue. Users enter their academic niche and preferences to find relevant opportunities.
Product principles

- Human-approved records; automated discovery never publishes opportunities.
- Eligibility transparency before ranking.
- Official source links and verification dates on every record.
- Simple, responsive, accessible interface.
- Build the MVP before adding AI or notifications.
  Primary users
- Administrator: creates, updates, verifies and archives scholarship records.
- Scholarship seeker: creates a profile, searches and filters opportunities, saves and tracks applications.
  For the first release, one account may have both roles; architecture should support separate roles.
  Geography
  Destination countries in Europe, North America, Central America and South America. Store countries individually rather than assuming every country in a region is supported. Scholarship eligibility may be limited by applicant nationality/residence.
  MVP scope
  Admin scholarship management
  Create, read, update and archive scholarships. Fields:
- Title, provider/institution, destination country, optional city/university
- Official source URL and application URL
- Description, fields of study (multi-select), degree levels (multi-select)
- Funding type (full/partial/other/unknown), benefits and currency/amount where stated
- Eligible nationalities and residence restrictions (including 'not specified')
- Other requirements (GPA, language tests, work experience) as structured fields where practical plus notes
- Opening date (optional), deadline (optional), deadline type (fixed/rolling/unknown)
- Last verified date, record status (draft/published/archived), admin notes
  Avoid hard deleting records by default.
  Seeker profile
- Preferred field(s) / niche(s) and keywords
- Desired degree level
- Nationality and optionally country of residence
- Preferred destination countries/regions
- Funding preference
- Optional academic qualifications and language-test details
  All fields editable. Collect only what matching requires.
  Discovery
- Search by title, provider, keywords and fields
- Filter by destination, degree, funding, field, deadline and eligibility state
- Sort by deadline, newest verified and match relevance
- Detail page shows requirements, funding, source and application link
- Clearly label expired, rolling and unverified deadlines
  Matching

1. Evaluate hard criteria: degree, applicant nationality/residency, and explicit field restrictions. A confirmed mismatch = ineligible.
2. Missing or ambiguous criteria = needs verification, never confirmed eligible.
3. Among eligible or possibly eligible scholarships, rank relevance based on field overlap, destination preference, funding preference and deadline proximity.
4. Show a short explanation such as 'Matches master's level and data science; nationality eligibility not stated.'
5. Never use scores to conceal an explicit ineligibility.
   Application tracking

- Save/unsave scholarship
- Status: interested, preparing, applied, accepted, rejected, withdrawn
- Optional personal notes and date applied
- Upcoming deadlines section; no email/push notifications in MVP
  Suggested data model
- User (id, email, role, createdAt)
- UserProfile (userId, nationality, residenceCountry, preferredDegree, preferredFields, preferredCountries, fundingPreference, optional qualifications)
- Scholarship (id, title, provider, description, country, city, university, sourceUrl, applicationUrl, fundingType, benefits, currency, amount, opensAt, deadlineAt, deadlineType, verifiedAt, status, createdBy, timestamps)
- ScholarshipField (scholarshipId, fieldId)
- FieldOfStudy (id, name, slug, optional parentId)
- ScholarshipDegree (scholarshipId, degreeLevel)
- ScholarshipEligibility (scholarshipId, eligibleCountries, excludedCountries, residenceRules, GPA/language/experience requirements, freeText, completeness)
- SavedScholarship (userId, scholarshipId, applicationStatus, notes, appliedAt, timestamps)
  Add indexes for country, status, deadline, degree and field associations. Use normalized ISO country codes and enums where suitable.
  Main pages
- / — landing/dashboard
- /scholarships — discovery and filters
- /scholarships/[id] — scholarship details
- /profile — seeker preferences
- /saved — saved opportunities and application progress
- /admin/scholarships — management table
- /admin/scholarships/new — create form
- /admin/scholarships/[id]/edit — edit form
  Acceptance criteria

1. Admin can publish a scholarship with a valid official source URL.
2. Non-admin cannot mutate scholarship records, including through direct requests.
3. Seeker can set 'Computer Science', 'Master's', and destination preferences and get relevant matches.
4. Explicit nationality or degree mismatch is marked ineligible, not eligible.
5. Missing nationality restrictions are flagged for verification.
6. Deadline filters exclude expired fixed-deadline scholarships when 'open only' is selected.
7. User can save a scholarship, change application status and retrieve it after signing in again.
8. Every published scholarship shows its source and verification date.
9. Responsive layout and accessible form labels are present.
   Out of scope for MVP
   Unbounded crawling, unattended automatic publication, AI-generated scholarship facts, AI chat, external email reminders, document upload, automated applications, payments, and university admissions advice.
   Later enhancements
   CSV import with validation, manual review queue, source freshness reminders, optional email alerts, richer taxonomy, and opt-in semantic matching.
   Open product decisions

- Personal-only use versus opening registration to other seekers.
- Which applicant nationality and residence rules should be mandatory for publishing.
- Whether scholarship data entry should support pasted website text with manual confirmation later.


Approved extension — on-demand technology opportunity discovery

- Owner: personal GitHub account Fayomi49; no open registration or work-account access. Use a stable GitHub account ID for authorization. Preserve support for separate admin/seeker roles in the model.
- Geography: Europe, North America (including Caribbean opportunities), Central America, South America, and remote/online international programmes. Store country codes individually; a region never establishes applicant eligibility.
- Fields: software engineering, computer science, AI, machine learning, data science, cybersecurity, cloud computing, IT and related technology disciplines.
- Types: full/partial master's scholarships, fellowships, funded research, graduate assistantships, stipend training, sponsored bootcamps, professional training and international programmes covering stated costs.
- The owner starts discovery from `/dashboard`, optionally filtering by field, type, region, funding and nationality. The nationality filter goes to the search provider; private profile details do not.
- Runs persist stage, budgets, counts, observations, rate-limit cooldowns and categorized errors. Only one queued/running run is permitted per owner. Work survives closing the browser and is resumed through a PostgreSQL-backed worker.
- Search is configurable (`mock` or `tavily`). Default limits are eight billable search attempts and twenty content HTTP requests per run. Redirects and retries consume the content budget; robots requests are cached separately.
- Official source priority does not establish truth by itself. A terms-reviewed source policy and robots permission are required before fetching; blocked pages remain unverified leads. No access-control bypasses.
- Extract supported explicit facts and retain claim evidence. Store unstated/ambiguous funding, amounts, currencies, eligibility and dates as unknown. Date-only deadlines have unknown timezones; never invent a precise instant.
- Deduplicate against approved scholarships and prior candidates using canonical URLs and programme identity. Distinguish intakes where known. Possible fuzzy duplicates require review. Preserve rejected and ignored decisions on rediscovery.
- `/admin/discoveries` supports pending/approved/rejected/ignored views, source evidence, eligibility explanations, separate relevance ranking, direct approval, edit-and-approve and approval of up to 25 selected records.
- Approval is owner-authorized, validated, audited and transactional. Require explicit confirmation of source authority and reviewed claims, supported geography, provider, opportunity type and technology fields. Unknown benefits/requirements may remain unknown. Synthetic fixtures can never be published.
- Matching states are eligible, possibly eligible, ineligible and unknown. Missing hard criteria never yield confirmed eligibility. Additional requirements still need assessment. Relevance cannot erase an explicit mismatch.
- Additive models: DiscoveryRun, DiscoveredCandidate, DiscoveryObservation, CandidateSource, ReviewEvent and SourcePolicy. Keep approved opportunities in Scholarship; protect SavedScholarship relationships from deletion.
- Local PostgreSQL and a worker process are the initial execution environment. Production hosting remains undecided.

Extension acceptance criteria

1. Owner can start a mock run without search credentials, leave the dashboard and later review its persisted results.
2. Direct unauthenticated or non-owner discovery/review/profile requests are denied; simultaneous starts resolve to the same active run.
3. Search/fetch failures are visible and successful partial results remain reviewable.
4. New discoveries never enter Scholarship before a valid owner approval; repeated/concurrent approvals create at most one record.
5. Rejected/ignored discoveries stay reviewed when encountered again.
6. Every approved record retains its official source and owner review timestamp. Unknown facts and eligibility remain explicit.
7. Mock fixtures, unsafe URLs and unsupported geography cannot be published.
8. Unit, database integration and critical browser checks cover the discovery/review boundaries without real search API calls.

Implementation boundary

This extension does not implement saved-application UI, notification delivery, generic crawling, document/PDF extraction, external LLM extraction, or a production hosting provider. The SavedScholarship schema preserves the planned tracking relationship for later work.
