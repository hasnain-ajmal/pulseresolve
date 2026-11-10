# PROGRESS (final status)

Event: AI-Powered SE-MAX, 10 Nov 2026. Team: Muhammad Hasnain Ajmal (integration, demo, deployment) and Muhammad Sohail (frontend). Backend and AI built with Claude Code (see `docs/ai-usage-log.md`).

## State
- Backend (FastAPI) live on Render, frontend (React) live on Vercel. Links are in `README.md`.
- 149 backend tests pass; CI runs them on every push. Live end-to-end check: `scripts/live_test.py`. Grouping evaluation: `scripts/eval_grouping.py`.
- Everything in `docs/` is written: requirements, design, testing, judge checks, AI usage log, frontend spec, system guide, judge Q&A.

## Built
Complaint intake and AI analysis, grouping into incidents with explanations, human approval, team and deadline management, overdue alerts, standalone complaint handling, safe delete and restore (lead only), customer complaint ID and public status page, CSV import, dashboard and correlation graph, multi-problem reports kept out of groups, offline fallback when Gemini is unavailable.

## Known limits (also in `docs/JUDGE_QA.md`)
Free hosting sleeps and resets data on redeploy; small Gemini free quota; contact details are not encrypted at field level; complaint text is sent to Gemini; public status IDs are short numbers; reports with several problems are not split; no email or SMS yet; grouping thresholds were tuned on a small synthetic set.

## To resume
`cd backend`, install `requirements.txt`, copy `.env.example` to `.env`, run `uvicorn app.main:app --reload`; tests: `python -m pytest`. Frontend: `cd frontend`, `npm install`, `npm run dev`.
