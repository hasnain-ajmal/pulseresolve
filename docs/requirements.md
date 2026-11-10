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
| FR-01 | Customer submits a complaint (name, optional contact, text 10 to 2000 chars) without logging in | Must | Planned |
| FR-02 | Each complaint is analysed: category, sentiment, urgency, symptoms, affected service. Output validated by schema; on AI failure a deterministic fallback is used and flagged | Must | Planned |
| FR-03 | Each complaint gets an embedding; similarity to existing incidents and unassigned complaints is computed | Must | Planned |
| FR-04 | New complaints join an existing open incident or, with at least 3 related unassigned complaints, form a new `suggested` incident. Unrelated and near-miss complaints are not merged | Must | Planned |
| FR-05 | The system stores and shows why complaints were grouped (similarity, shared symptoms, reason) | Must | Planned |
| FR-06 | Incident has an AI summary, shared symptoms, hypotheses with cited complaint ids and suggested actions; every cited id is validated to belong to the incident | Must | Planned |
| FR-07 | Staff login (seeded accounts). All state-changing actions require a valid token | Must | Planned |
| FR-08 | Human approves or rejects a suggested incident; rejection releases complaints and blocks the same pairing from being re-suggested | Must | Planned |
| FR-09 | Status flow suggested, open, investigating, resolved (plus rejected, reopen); every change is recorded in an append-only history | Must | Planned |
| FR-10 | Resolving an incident updates all linked complaints atomically (all or none) | Must | Planned |
| FR-11 | A matching complaint arriving after resolution is flagged `possible_recurrence` on that incident; a human can reopen, which folds it in | Must | Planned |
| FR-12 | Dashboard: totals, active incidents, high-priority incidents, sentiment overview, category and per-day charts, recent complaints, active incidents | Must | Planned |
| FR-13 | Priority and assigned team editable by staff | Should | Planned |
| FR-14 | CSV import of complaints (large, malformed and non-English files handled, row-level error report) | Should | Planned |
| FR-15 | Correlation graph (incidents and complaints with similarity edges) | Stretch | Planned |
| FR-16 | Priority score computed from complaint count, sentiment and urgency | Should | Planned |
| FR-17 | Standalone complaints (in no incident) can be assigned to a team, resolved with a note and reopened; nothing is deleted | Must | Done |
| FR-18 | Team deadlines by priority (critical gets the least time, custom deadline possible); staff see overdue and due-within-1-hour unresolved work as a bell, banner and countdown | Should | Done |
| FR-19 | An admin can delete finished incidents and standalone complaints (e.g. positive reviews); deletes are soft (hidden, kept with who and why) and restorable; agents cannot delete | Should | Done |

## Non-functional requirements

| ID | Category | Requirement | Target | How measured | Result |
|----|----------|-------------|--------|--------------|--------|
| NFR-01 | Reliability | App works when Gemini is down or rate-limited | 100% of core flows work with AI disabled | Automated test with AI stub failing, and manual demo with key removed | |
| NFR-02 | Accuracy | Grouping quality on the labelled set (near-misses, mixed language, one-offs) | Report pairwise precision and recall honestly; target precision at least 0.85 | `scripts/eval_grouping.py` | |
| NFR-03 | Stability | Grouping result does not depend on ticket order beyond the documented rule | Identical partition across 20 shuffles of the clear-cut set | Pytest shuffle test | |
| NFR-04 | Integrity | Resolve is atomic | 0 partial updates under injected failure | Pytest with forced mid-transaction error | |
| NFR-05 | Security | State-changing endpoints reject missing or invalid tokens | 100% of protected endpoints return 401/403 | Pytest parametrised over all routes | |
| NFR-06 | Abuse protection | Complaint intake and login are rate limited | 429 after limit | Pytest | |
| NFR-07 | Performance | Submit-to-analysed response | p95 under 10 s with AI, under 1 s with fallback | Timed manual test and pytest | |
| NFR-08 | Privacy | No real personal data, no secrets in repo or history | 0 findings | Grep for key patterns before each push | |

## Constraints

Six-hour build window (9:00 to 3:00), team of two, free tiers only (Gemini free quota, free hosting with about 512 MB RAM), SQLite, no local ML models (no PyTorch).

## Assumptions

Synthetic data only. Complaints are short text, English, Roman Urdu or Urdu script. One company is served (single tenant). Staff users are seeded, no self-registration.

## Out of scope

Live helpdesk integrations, multi-tenant accounts, email or SMS notifications, self-registration, learning from past incidents, production-grade rate limiting across multiple servers.
