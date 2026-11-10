# Requirements

## Problem statement

Support teams handle each customer complaint as an isolated ticket. When one hidden fault produces many complaints (for example a payment failure), agents investigate each separately and nobody sees the pattern until it is a crisis. This wastes effort, delays incident detection and gives customers inconsistent answers.

PulseResolve analyses complaints with AI, finds the ones that share a cause, proposes a single incident with an evidence-based summary, lets a human confirm it, and resolves all linked complaints together.

## Users

| User | Goal |
|------|------|
| Customer (public) | Report a problem quickly and get an acknowledgement |
| Support lead / agent (staff, logged in) | See what is really breaking, review AI-suggested incidents, approve or reject, coordinate and resolve |

Market value: small and mid-size support teams (e-commerce, delivery, fintech, ISPs) who have no dedicated incident-detection tooling and lose time on duplicate investigations.

## Functional requirements

| ID | Requirement | Priority (Must / Should / Stretch) | Status |
|----|-------------|------------------------------------|--------|
| FR-01 | Customer submits a complaint (name, optional contact, text 10 to 2000 chars) without logging in | Must | Done |
| FR-02 | Each complaint is analysed: category, sentiment, urgency, symptoms, affected service. Output validated by schema; on AI failure a deterministic fallback is used and flagged | Must | Done |
| FR-03 | Each complaint gets an embedding; similarity to existing incidents and unassigned complaints is computed | Must | Done |
| FR-04 | New complaints join an existing open incident or, with at least 3 related unassigned complaints, form a new `suggested` incident. Unrelated and near-miss complaints are not merged | Must | Done |
| FR-05 | The system stores and shows why complaints were grouped (similarity, shared symptoms, reason) | Must | Done |
| FR-06 | Incident has an AI summary, shared symptoms, hypotheses with cited complaint ids and suggested actions; every cited id is validated to belong to the incident | Must | Done |
| FR-07 | Staff login (seeded accounts). All state-changing actions require a valid token | Must | Done |
| FR-08 | Human approves or rejects a suggested incident; rejection releases complaints and blocks the same pairing from being re-suggested | Must | Done |
| FR-09 | Status flow suggested, open, investigating, resolved (plus rejected, reopen); every change is recorded in an append-only history | Must | Done |
| FR-10 | Resolving an incident updates all linked complaints atomically (all or none) | Must | Done |
| FR-11 | A matching complaint arriving after resolution is flagged `possible_recurrence` on that incident; a human can reopen, which folds it in | Must | Done |
| FR-12 | Dashboard: totals, active incidents, high-priority incidents, sentiment overview, category and per-day charts, recent complaints, active incidents | Must | Done |
| FR-13 | Priority and assigned team editable by staff | Should | Done |
| FR-14 | CSV import of complaints (large, malformed and non-English files handled, row-level error report) | Should | Done |
| FR-15 | Correlation graph (incidents and complaints with similarity edges) | Stretch | Done |
| FR-16 | Priority score computed from complaint count, sentiment and urgency | Should | Done |
| FR-17 | Standalone complaints (in no incident) can be assigned to a team, resolved with a note and reopened; nothing is deleted | Must | Done |
| FR-18 | Team deadlines by priority (critical gets the least time, custom deadline possible); staff see overdue and due-within-1-hour unresolved work as a bell, banner and countdown | Should | Done |
| FR-19 | An admin can delete finished incidents and standalone complaints (e.g. positive reviews); deletes are soft (hidden, kept with who and why) and restorable; agents cannot delete | Should | Done |
| FR-20 | The customer receives a complaint ID after submitting and can check its status on a public page; when staff resolve it they write a message the customer sees | Should | Done |
| FR-21 | A report that describes several unrelated problems keeps one ID, is never added to an incident or used to form one, and is handled individually by staff | Should | Done |
| FR-22 | Complaint text is rendered and stored as plain text; hostile input (HTML, SQL, null bytes, prompt injection) never executes or changes behaviour | Must | Done |

## Non-functional requirements

| ID | Category | Requirement | Target | How measured | Result |
|----|----------|-------------|--------|--------------|--------|
| NFR-01 | Reliability | App works when Gemini is down or rate-limited | 100% of core flows work with AI disabled | Automated tests with the AI failing, rate-limited, returning invalid output or out of quota; manual run on the offline engine | Met. `test_ai.py` (15 tests) and a live demo on the offline reader. |
| NFR-02 | Accuracy | Grouping quality on the labelled set (near-misses, mixed language, one-offs) | Pairwise precision at least 0.85, report recall honestly | `scripts/eval_grouping.py` on 43 labelled complaints | Met on the offline engine: precision 0.949, recall 1.000, 0 near-miss pairs merged. One partial Gemini run: 1.000 / 0.929 (free quota ran out mid-run). Rules were tuned on this same set, so the numbers are optimistic. |
| NFR-03 | Stability | Grouping result does not depend on ticket order beyond the documented rule | Identical partition across 6 random arrival orders of the clear-cut set | Pytest shuffle test | Met (`test_order_independence_on_clear_set`). |
| NFR-04 | Integrity | Resolve is atomic and race-safe | 0 partial updates under injected failure; exactly one winner when clicked at the same time | Pytest failure injection; 5 simultaneous resolves on a real database file | Met. Failure rolls back; 5 simultaneous resolves gave 1 success and 4 clear conflicts. |
| NFR-05 | Security | State-changing endpoints reject missing or invalid tokens; only a lead can delete | 100% of protected endpoints return 401 or 403 | Pytest over 13 routes with no token and a bad token; forged, expired and unsigned tokens; role escalation | Met. Role is read from the database, never trusted from the token. |
| NFR-06 | Abuse protection | Complaint intake, login and public status lookups are rate limited | 429 with Retry-After after the limit | Pytest | Met (6 submissions, 10 logins, 30 lookups per minute per connection). Known limit: ten people behind one shared connection can be throttled. |
| NFR-07 | Performance | Submit-to-analysed response | p95 under 10 s with AI, under 1 s with the offline engine | Timed runs | Partly met. Offline engine: median 21 ms, p95 26 ms. Gemini path: typically 3 to 5 s, but 9 to 15 s when models rotate after quota or rate limits, so the 10 s target is not always met. Live reads from Pakistan to the host: median 310 to 410 ms, p95 under 0.7 s. |
| NFR-08 | Privacy | No real personal data, no secrets in repo or history | 0 findings | Secret scan of the tree and git history before each push | Met. Synthetic data only. Limits: contact details are stored in plain text (access-controlled, never shown publicly) and complaint text is sent to Gemini. |
| NFR-09 | Compatibility | Works on phones and tablets, with international text and common CSV encodings, on Windows development and Linux hosting | No horizontal scroll at 375 px and 768 px on public pages; Urdu, Roman Urdu and emoji accepted; CSV in UTF-8, UTF-8 BOM, UTF-16 and Windows-1252; Python 3.12 or newer, Node 18 or newer | Browser-emulation check on the live public pages; pytest CSV and Unicode cases; CI on Ubuntu | Met for the public pages at 375 and 768 px. Not checked: staff pages on a phone, Safari, Firefox, real devices. |
| NFR-10 | Maintainability | Code is layered, tested and documented | Tests run on every push; API contract and design documented | GitHub Actions, `docs/` | Met: 149 tests, CI green. No automated frontend tests. |
| NFR-11 | Availability | Visible health, graceful degradation | Health endpoint; automatic AI fallback | `/api/health`, tests | Partly met. The free host sleeps when idle (first request can take up to a minute) and resets its data on every redeploy; demo data is re-seeded. |

## Constraints

Six-hour build window (9:00 to 3:00), team of two, free tiers only (Gemini free quota, free hosting with about 512 MB RAM), SQLite, no local ML models (no PyTorch).

## Assumptions

Synthetic data only. Complaints are short text, English, Roman Urdu or Urdu script. One company is served (single tenant). Staff users are seeded, no self-registration.

## Out of scope

Live helpdesk integrations, multi-tenant accounts, email or SMS notifications, self-registration, learning from past incidents, production-grade rate limiting across multiple servers.
