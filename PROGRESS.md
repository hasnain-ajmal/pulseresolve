# PROGRESS (live handoff file)

Purpose: if the AI session runs out, any other AI tool or person can read this file, `docs/design.md` and `docs/frontend-spec.md`, and continue.
Event: AI-Powered SE-MAX, build window 9:00 AM to 3:00 PM, 10 Nov 2026. Submit final commit hash via organizers' form before 3:00 PM (see SUBMISSION.md).
Team: Muhammad Hasnain Ajmal (integration, demo), Muhammad Sohail (frontend). Backend and AI built with Claude Code.
Repo: https://github.com/hasnain-ajmal/pulseresolve (fork of the organizers' template). Local: `C:\Users\hasna\hackathon\pulseresolve`.

## How to resume
- Backend: `cd backend`, venv at `backend/.venv` (Windows: `.venv\Scripts\activate`), `pip install -r requirements.txt`, copy `.env.example` to `.env`, run `uvicorn app.main:app --reload`, tests `python -m pytest`.
- Read `docs/design.md` (architecture, grouping rule) and `docs/frontend-spec.md` (API contract). Do not change response shapes without updating the spec.
- Rules: no hard deletes, no secrets in git, mock Gemini in tests, log AI usage in `docs/ai-usage-log.md`, no force-push.
- Gemini key lives only in `backend/.env` (gitignored) and in the host's environment variables.

## Code map (backend/app)
- `config.py` settings from env; `db.py` SQLAlchemy engine (FK pragma); `models.py` tables; `schemas.py` API shapes
- `security.py` bcrypt, JWT, rate limiter; `errors.py` `{code,message}` error bodies
- `services/ai.py` Gemini REST client (retries, breaker, schema validation); `services/fallback.py` offline analysis and templates
- `services/grouping.py` THE grouping rule; `services/incidents.py` lifecycle, atomic resolve, citation validation; `services/intake.py` submit pipeline
- `routers/` auth, complaints (+CSV import), incidents, dashboard; `seed.py` users and synthetic demo data (`backend/data/seed_complaints.json`)
- tests: `backend/tests` (test_api_basic, test_grouping, test_incidents, test_ai)

## Status legend
[x] done and tested, [~] written, not yet verified, [ ] not started

## Backend checklist
- [x] Backend code (config, db, models, schemas, security, errors, routers, services) and seed data
- [x] 50 tests pass (`cd backend && python -m pytest`; use anaconda python, the venv install was too slow)
- [x] Offline grouping eval on 43 labelled complaints: precision 0.949, recall 1.0, 0 near-miss merges (analyser tuned on this set, say so in docs/testing.md)
- [x] Gemini smoke test: key works; free tier is tiny (gemini-2.5-flash allows 20 generate requests/day). Fixed by rotating models (`GEMINI_MODEL` list) and keys (`GEMINI_API_KEY` comma list) and remembering exhausted combos. Gemini eval run: precision 1.0, recall 0.93 but part of that run fell back after quota loss
- [x] Pushed to GitHub (commits e1926e5 and earlier)
- [x] render.yaml and README written
- [ ] Deploy backend on Render (user must log in and paste GEMINI_API_KEY into Render env; never in git)
- [ ] Frontend (Sohail) integration against the live API, deploy on Vercel, set CORS_ORIGINS on Render
- [ ] docs/testing.md, docs/ai-usage-log.md, judge-checks test names, README live URL
- [ ] Final secret scan, SUBMISSION.md, final commit hash before 3:00 PM

Gotcha: in this environment, double backslashes typed into shell commands become single ones (regex `\\b` turned into a backspace char). Edit files with the Edit/Write tools, not shell python, when regexes are involved.
- [ ] Final: secret scan, SUBMISSION.md, final commit hash

## Frontend (Sohail)
Built from `docs/frontend-spec.md`. Status: unknown, ask Sohail. Needs GitHub collaborator access (username pending).

## Log (newest last)
- 10:20 Plan approved. Docs written (requirements, design, judge-checks, frontend-spec).
- 10:50 Backend code and tests written. Waiting on pip install (scikit-learn is large) to run tests.
