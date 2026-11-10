# PulseResolve

> AI-Powered SE-MAX · CUI Tech Fest FA'26 · Team: PulseResolve (Muhammad Hasnain Ajmal, Muhammad Sohail)

## What it does

PulseResolve turns many individual customer complaints into shared incidents. Each complaint is analysed with Gemini (category, sentiment, urgency, symptoms), compared with the others using embeddings and a same-cause check, and grouped into one suggested incident with an evidence-based summary and possible root causes. A staff member approves or rejects the suggestion, works the incident, and resolves it; resolving updates every linked complaint in one atomic step.

## Problem and user

Support teams in small and mid-size companies (e-commerce, delivery, fintech) treat each complaint as a separate ticket. When one hidden fault produces dozens of complaints, agents investigate each one separately and nobody sees the pattern early. The user is a **support lead** who needs to know quickly what is really breaking, and who must stay in control of what the AI suggests.

## Live deployment

- **URL:** _filled in at deployment_ (frontend on Vercel, API on Render)
- **Platform:** Vercel (React) + Render free plan (FastAPI). The free API sleeps when idle, so the first request can take 30 to 60 seconds.

## Judge quick start (under 5 minutes)

1. Open the live URL. The public page `/submit` needs no login: send a few related complaints, for example "Payment deducted but my order was not created", "Checkout keeps failing and my bank shows a charge", "Paid but no confirmation, order stuck on pending".
2. Log in as staff (test account below). Open **Incidents**: a *suggested* incident appears once three related complaints exist. Open it to see why the complaints were grouped, the AI summary, cited root-cause hypotheses and linked complaints.
3. Click **Approve**, then **Mark investigating**, then **Resolve**. Every linked complaint changes to resolved at once. Submit one more matching complaint to see it flagged as a possible recurrence, then **Reopen**.

## Test accounts

| Role | Username | Password |
|------|----------|----------|
| Lead | `lead` | `Lead-Demo-2026` |
| Agent | `agent` | `Agent-Demo-2026` |

Test accounts only. All data in the app is synthetic.

## Run locally

### Prerequisites

Python 3.12+ and Node 18+.

### Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # then edit values
```

### Environment variables

Names only (values go in `backend/.env`, see `backend/.env.example`): `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, `TRUST_PROXY`, `GEMINI_API_KEY` (one or several keys, comma separated), `GEMINI_MODEL` (comma separated list tried in order), `EMBEDDING_MODEL`, `EMBEDDING_DIMS`, `AI_ENABLED`, `SEED_ADMIN_PASSWORD`, `SEED_AGENT_PASSWORD`, `SEED_DEMO_DATA`. Frontend: `VITE_API_URL`.

### Run

```bash
cd backend && uvicorn app.main:app --reload        # API on http://localhost:8000 (docs at /docs)
cd frontend && npm install && npm run dev            # UI on http://localhost:5173
```

Without a Gemini key the app still works end to end using the deterministic offline analyser.

### Run tests

```bash
bash scripts/test.sh          # or: cd backend && python -m pytest
python scripts/eval_grouping.py          # grouping precision and recall on the labelled set (offline engine)
python scripts/eval_grouping.py --ai     # same with Gemini (needs a key and free quota)
```

## Known limitations

- Free Gemini quotas are small (the daily limit can be about 20 requests per model), so the app rotates across models and keys and falls back to the offline analyser; fallback results are labelled "basic analysis".
- SQLite on a free host resets on restart, so synthetic demo data is re-seeded at startup.
- Rate limiting is in memory (single instance).
- Grouping thresholds were tuned on a small synthetic set, see `docs/testing.md` for measured results and weaknesses.

## Documentation

- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Testing](docs/testing.md)
- [AI usage log](docs/ai-usage-log.md)
- [Judge checks](docs/judge-checks.md)
- [Frontend spec / API contract](docs/frontend-spec.md)

## Team

| Name | Role |
|------|------|
| Muhammad Hasnain Ajmal | Integration, deployment, demo, backend with AI assistance |
| Muhammad Sohail | Frontend |
