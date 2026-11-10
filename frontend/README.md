# PulseResolve frontend

React + Vite + Tailwind CSS + Recharts + Lucide. Talks to the FastAPI backend (contract: `../docs/frontend-spec.md`).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```
Set `VITE_API_URL` (see `.env.example`). Production builds always use the real API. A built-in mock engine exists for offline development only and is enabled by `VITE_ALLOW_MOCK=true`.

## Pages
- Public: `/submit` (send a complaint, get an ID), `/track` (check status with the ID).
- Staff (login): dashboard, incidents (suggestions, standalone complaints, deleted), incident detail, complaints with CSV import, correlation graph.

## Notes
Complaint and AI text is rendered as plain text only. Staff actions need a login token; deleting needs the `lead` role. A bell and banner show overdue or due-soon work.
