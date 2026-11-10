# PulseResolve: Frontend Specification and API Contract

For: Muhammad Sohail (frontend). Backend and AI: Claude Code (Hasnain's laptop). Written on build day, 10 Nov 2026.
Stack: React + Vite + Tailwind CSS + Recharts + Lucide icons. Work only in `frontend/`.
This file is the contract. The backend implements exactly these shapes. If something here is wrong or missing, tell Hasnain and it gets fixed in this file, do not guess.

---

## 1. Product in one paragraph
Customers submit complaints. The backend analyses each one with AI (category, sentiment, urgency), compares it with others, and groups related complaints into an **incident** (for example four different reports that all point to a payment problem). A staff member reviews the suggested incident (why it was grouped, AI summary, possible causes), approves or rejects it, works on it, and resolves it. Resolving updates every linked complaint at once.
Two audiences: a **public customer** (submit page only) and **staff** (everything else, behind login).

## 2. Build order (stop and demo-test after each)
1. API client + routing + layout shell + login
2. Submit complaint page
3. Complaints list
4. Incidents list
5. Incident detail with actions (approve, reject, investigating, resolve, reopen)
6. Dashboard (cards, charts, recent lists)
7. CSV import, correlation view, polish
If time is short drop 7, then charts. Never drop 1 to 5.

## 3. Global rules
- Base URL from `import.meta.env.VITE_API_URL` (e.g. `http://localhost:8000/api`). One file `src/api.js` with a fetch/axios wrapper. All requests JSON except CSV upload (multipart).
- Auth: `POST /auth/login` returns a token. Send `Authorization: Bearer <token>` on all staff calls. Keep the token in memory plus `sessionStorage`. On any 401, clear it and go to `/login`.
- Complaint text and AI text are untrusted: render as plain text only, never `dangerouslySetInnerHTML`.
- Every AI-generated block carries a small badge "AI-generated, needs human confirmation".
- Every data view has loading, empty and error states. Buttons that call the API are disabled while the request runs.
- Show friendly messages from `error.message`; never show raw server text or stack traces.
- Dates arrive as ISO 8601 UTC strings; show in local time (e.g. "10 Nov, 11:42").
- Responsive: laptop and phone widths. Keyboard usable, labelled inputs, readable contrast.
- No secrets in code. Only `VITE_API_URL`. Create `frontend/.env.example`.

## 4. Enums (use exactly these values)
| Name | Values |
|---|---|
| complaint.status | `new`, `linked`, `possible_recurrence`, `resolved` |
| sentiment | `positive`, `neutral`, `negative`, `frustrated` |
| urgency / priority | `low`, `medium`, `high`, `critical` |
| category | `billing`, `payment`, `login`, `delivery`, `performance`, `bug`, `account`, `other` |
| incident.status | `suggested`, `open`, `investigating`, `resolved`, `rejected` |
| analysis_source | `ai`, `fallback` |

Colors (suggested): critical red, high orange, medium amber, low slate; frustrated red, negative orange, neutral slate, positive green; suggested violet, open blue, investigating amber, resolved green, rejected gray. Use one palette everywhere through shared Badge components.

## 5. Data shapes

### Complaint
```json
{
  "id": 12,
  "customer_name": "Ayesha Khan",
  "customer_contact": "ayesha@example.com",
  "text": "Payment deducted but order not created",
  "category": "payment",
  "sentiment": "frustrated",
  "urgency": "high",
  "analysis_source": "ai",
  "status": "linked",
  "incident_id": 3,
  "created_at": "2026-11-10T06:42:10Z",
  "assigned_team": null,
  "resolution_note": null,
  "resolved_at": null
}
```
`incident_id` is null for one-off complaints. `category/sentiment/urgency` are always present (a safe default is used if AI fails; `analysis_source` is then `fallback`; show a small "basic analysis" tag).

### IncidentSummary (list item)
```json
{
  "id": 3, "title": "Payment confirmation failures after checkout",
  "affected_service": "Payments", "status": "suggested", "priority": "high",
  "assigned_team": null, "complaint_count": 4,
  "created_at": "2026-11-10T06:45:00Z", "updated_at": "2026-11-10T06:45:00Z"
}
```

### IncidentDetail
```json
{
  "id": 3, "title": "...", "affected_service": "Payments",
  "status": "suggested", "priority": "high", "assigned_team": null,
  "complaint_count": 4,
  "summary": "Four customers report ...",
  "shared_symptoms": ["payment deducted", "no order confirmation", "order stuck pending"],
  "evidence": [
    { "complaint_a": 12, "complaint_b": 14, "similarity": 0.82,
      "reason": "Both describe payment taken without an order being created" }
  ],
  "hypotheses": [
    { "text": "Payment gateway callback not reaching the order service",
      "confidence": "medium", "cited_complaint_ids": [12, 14, 15] }
  ],
  "suggested_actions": ["Check payment gateway webhook logs", "Compare failed orders with captured payments"],
  "complaints": [ /* Complaint[] */ ],
  "history": [
    { "from_status": null, "to_status": "suggested", "actor": "system",
      "note": "Created from 4 related complaints", "at": "2026-11-10T06:45:00Z" }
  ],
  "new_matching_complaints": 0,
  "created_at": "...", "updated_at": "...", "resolved_at": null
}
```
`hypotheses[].confidence` is `low | medium | high`. Cited ids are guaranteed by the server to belong to this incident; render each as a link to the complaint row.
`new_matching_complaints` > 0 on a resolved incident means new complaints arrived after resolution; show a warning banner with a Reopen button.

### Paged list
```json
{ "items": [ ... ], "total": 57, "page": 1, "size": 20 }
```

### Error (all non-2xx)
```json
{ "code": "invalid_transition", "message": "Incident cannot move from resolved to rejected." }
```
Codes: 401 `unauthorized`, 403 `forbidden`, 404 `not_found`, 409 `invalid_transition`, 422 `validation_error`, 429 `rate_limited` (header `Retry-After` seconds), 500 `server_error`.

## 6. Endpoints (all prefixed by the base URL)

| Method and path | Auth | Purpose | Body / query | Returns |
|---|---|---|---|---|
| `GET /health` | no | liveness | | `{ "status": "ok" }` |
| `POST /auth/login` | no | staff login | `{ "username", "password" }` | `{ "access_token", "user": { "username", "role" } }` |
| `GET /auth/me` | yes | current user | | `{ "username", "role" }` |
| `POST /complaints` | no (rate limited) | submit complaint | `{ "customer_name" (2-80), "customer_contact" (optional, max 120), "text" (10-2000) }` | `Complaint` (already analysed, may take up to ~10 s) |
| `POST /complaints/import` | yes | CSV import | multipart field `file` (columns: `customer_name,customer_contact,text`) | `{ "imported": 18, "failed": 2, "errors": [ { "row": 4, "message": "text too short" } ] }` |
| `GET /complaints` | yes | list | `page,size(max 100),status,category,sentiment,incident_id,q` | Paged `Complaint` |
| `GET /complaints/{id}` | yes | one | | `Complaint` |
| `GET /incidents` | yes | list | `page,size,status,priority` | Paged `IncidentSummary` |
| `GET /incidents/{id}` | yes | detail | | `IncidentDetail` |
| `POST /incidents/{id}/approve` | yes | confirm AI suggestion: `suggested` to `open` | `{ "assigned_team": "Payments Ops" (optional), "priority": "high" (optional) }` | `IncidentDetail` |
| `POST /incidents/{id}/reject` | yes | `suggested` to `rejected`, complaints unlink | `{ "reason": "..." (3-300) }` | `IncidentDetail` |
| `PATCH /incidents/{id}` | yes | change priority/team, or `open` to `investigating` | `{ "priority"?, "assigned_team"?, "status"?: "investigating" }` | `IncidentDetail` |
| `POST /incidents/{id}/resolve` | yes | resolve and update all linked complaints at once | `{ "resolution_note": "..." (3-500) }` | `IncidentDetail` |
| `POST /incidents/{id}/reopen` | yes | `resolved` to `open` (also folds in new matching complaints) | `{ "note": "..." }` | `IncidentDetail` |
| `POST /complaints/{id}/assign` | yes | assign a STANDALONE complaint (no incident) to a team | `{ "assigned_team": "Payments Ops" }` | `Complaint` |
| `POST /complaints/{id}/resolve` | yes | resolve a standalone complaint (status `resolved`, kept in history) | `{ "resolution_note": "..." (3-500) }` | `Complaint` |
| `POST /complaints/{id}/reopen` | yes | reopen a resolved standalone complaint (back to `new`) | `{ "note": "..." }` | `Complaint` |
| `GET /dashboard/stats` | yes | dashboard data | | see below |
| `GET /incidents/graph` | yes | correlation view (stretch) | | `{ "nodes": [ { "id": "i3", "type": "incident", "label": "Payments", "priority": "high" }, { "id": "c12", "type": "complaint", "label": "#12" } ], "edges": [ { "source": "c12", "target": "i3", "score": 0.82 } ] }` |

Allowed incident transitions (buttons must follow this):
- `suggested`: Approve, Reject
- `open`: Mark investigating, Resolve, change priority/team
- `investigating`: Resolve, change priority/team
- `resolved`: Reopen
- `rejected`: no actions

### `GET /dashboard/stats` response
```json
{
  "total_complaints": 57,
  "active_incidents": 4,
  "high_priority_incidents": 2,
  "pending_suggestions": 1,
  "sentiment": { "positive": 3, "neutral": 20, "negative": 22, "frustrated": 12 },
  "by_category": [ { "category": "payment", "count": 14 } ],
  "per_day": [ { "date": "2026-11-10", "count": 21 } ],
  "recent_complaints": [ /* 8 x Complaint */ ],
  "active_incident_list": [ /* up to 5 x IncidentSummary */ ]
}
```

## 7. Pages

### `/submit` (public, no login, no staff nav)
Simple branded form: name, contact (optional), complaint text with live character counter (10 to 2000). Validate before sending. On success show a confirmation card with the reference number and the AI result (category, sentiment, urgency chips). If `incident_id` is set, show "Your report has been linked to a known issue" (no staff details). On 429 show "Too many submissions, try again in N seconds".

### `/login`
Username and password. Errors in plain words. After login go to `/`.

### `/` Dashboard (staff)
Row of KPI cards: Total complaints, Active incidents, High-priority incidents, Pending AI suggestions (click goes to incidents filtered to `suggested`). Then: sentiment donut, complaints-by-category bar, complaints-per-day line (Recharts). Lists: Active incidents (click opens detail) and Recent complaints. Stretch: correlation view from `/incidents/graph` (simple SVG: incident nodes with complaint dots around them, edge opacity by score, click opens incident). If no time, skip it.

### `/complaints`
Table: id, customer, text (truncated, tooltip full), category, sentiment, urgency, status, incident link, created. Filters: status, category, sentiment, search. Pagination. Button "Import CSV" opens a modal with file picker, then shows imported/failed counts and the row errors. Row click opens a side panel with full text.

### `/incidents`
Cards or table: title, service, status badge, priority badge, complaint_count, team, updated. Filters by status and priority. Suggested incidents are visually highlighted and sorted first.

### `/incidents/:id` (most important page)
Header: title, service, status and priority badges, team, counts. Banner by state:
- `suggested`: "Suggested by AI, review and approve or reject."
- resolved with `new_matching_complaints` > 0: warning banner with Reopen.
Sections:
1. **Summary** (AI badge)
2. **Shared symptoms** as chips
3. **Why these complaints were grouped**: list of evidence rows (complaint #a and #b, similarity as a percent bar, reason text)
4. **Possible root causes**: each hypothesis with confidence badge and cited complaint links (scroll to the row). Wording must say "possible", never certain.
5. **Suggested investigation actions**: checklist (UI only, not saved)
6. **Linked complaints**: table
7. **Status history**: timeline (from, to, actor, note, time)
Action bar by status (see transitions). Reject and Resolve and Reopen open a modal with a required note and a confirm button. After any action, refresh from the returned `IncidentDetail`. Show a toast on success and an inline message on error (e.g. 409).

## 8. Demo seed
Backend seeds about 30 synthetic complaints and one staff user on startup. Staff credentials are in the backend `.env.example` and README (Hasnain will share). Use real endpoints as soon as the backend is up (target: first deployed backend around 11:30); until then use mock data that matches Section 5 exactly.

## 9. Acceptance checklist (before 2:30 PM freeze)
- [ ] Submit, list, incident detail, approve, reject, resolve, reopen all work against the live backend
- [ ] Buttons follow the allowed transitions; 401/403/404/409/422/429 all handled
- [ ] Hypothesis citations link to rows in the linked-complaints table
- [ ] Loading, empty, error states everywhere; no console errors
- [ ] Works on a phone-sized screen; `npm run build` passes; no secrets in git
- [ ] Each component you committed can be explained in Q&A


## Addendum: standalone complaints
Complaints that belong to no incident (`incident_id` null, status `new`) are handled directly: assign to a team, resolve with a note, reopen. Grouped complaints return 409 and must be handled through their incident. The three new fields on `Complaint` (`assigned_team`, `resolution_note`, `resolved_at`) are null until used. Resolved standalone complaints are never deleted and never join new incidents.

## Addendum: team deadlines and alerts
- `POST /incidents/{id}/approve` and `PATCH /incidents/{id}` accept optional `due_in_minutes` (1 to 43200). Approving starts the team's clock; the default allowance depends on priority (critical 120 min, high 480, medium 1440, low 4320). Changing the priority recalculates the deadline from the same start. Reopening restarts it.
- `POST /complaints/{id}/assign` also accepts `due_in_minutes` (default by urgency).
- `IncidentSummary`, `IncidentDetail` and `Complaint` gain `due_at` (ISO UTC, nullable).
- `GET /alerts` (staff): `{ items: [{ kind: "incident"|"complaint", id, title, priority, assigned_team, status, due_at, minutes_left, level: "overdue"|"due_soon" }], overdue, due_soon, window_minutes }`. Lists unresolved work that is overdue or due within 60 minutes, most urgent first. The panel shows a bell with the count, a banner, and a countdown chip.

## Addendum: safe delete and restore (lead / admin only)
- `POST /complaints/{id}/delete` `{ reason }` (3-300): standalone complaints in status `new` or `resolved` only. `POST /complaints/{id}/restore`.
- `POST /incidents/{id}/delete` `{ reason }`: incidents in status `resolved` or `rejected` only; their complaints are deleted with them. `POST /incidents/{id}/restore` brings them back.
- Deleted records are soft-deleted: hidden from every list, chart, alert and from grouping, but kept in the database with `deleted_at` and `deleted_reason`, plus an audit event (who and why). `GET /complaints?deleted=true` and `GET /incidents?deleted=true` list them.
- Only role `lead` may delete or restore (403 for `agent`, 401 without a login). Grouped complaints cannot be deleted one by one (409).

## Addendum: customer complaint tracking
- After submitting, the customer sees their complaint ID prominently (with a Copy button) and a link to `/track?id=<id>`. The public page `/track` (no login) has an ID box and a "Check status" button.
- `GET /track/{id}` (public, rate limited to 30 per minute per IP) returns only `{ id, stage: "received"|"in_progress"|"resolved", label, submitted_at, resolved_at, message }`. `message` is the team's closing message for the customer, present only when resolved. It never exposes the name, contact, complaint text, team, incident or internal note. Unknown or deleted IDs return 404.
- Resolving requires a customer message in the UI: `POST /incidents/{id}/resolve` and `POST /complaints/{id}/resolve` accept `customer_message` (3-500). If omitted, a default thank-you message is used. For an incident, the same message is stored on every linked complaint. Reopening clears it. `Complaint` gains `customer_message` (staff views only).
