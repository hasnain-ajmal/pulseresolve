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
- [~] Scaffold, models, schemas, security, errors, routers, services written (10:50)
- [~] Tests written (api, grouping, incidents, ai). First run pending (dependency install was slow)
- [ ] Tune thresholds so grouping tests pass in fallback and AI mode
- [ ] Real Gemini smoke test with the key in `backend/.env`
- [ ] Eval set `backend/data/eval_set.json` and `scripts/eval_grouping.py` (precision and recall)
- [ ] `requirements.txt`, README, docs/testing.md, ai-usage-log, judge-checks test names
- [ ] Commit and push to GitHub (small commits)
- [ ] Deploy backend (Render) and frontend (Vercel), live URL in README, test accounts in README
- [ ] Final: secret scan, SUBMISSION.md, final commit hash

## Frontend (Sohail)
Built from `docs/frontend-spec.md`. Status: unknown, ask Sohail. Needs GitHub collaborator access (username pending).

## Log (newest last)
- 10:20 Plan approved. Docs written (requirements, design, judge-checks, frontend-spec).
- 10:50 Backend code and tests written. Waiting on pip install (scikit-learn is large) to run tests.
