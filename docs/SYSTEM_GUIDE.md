# PulseResolve: How the System Works (plain-language guide)

Written for someone who does not need to know programming. Read this first, then `JUDGE_QA.md`.

## 1. The idea in one minute

A company gets many customer complaints. Usually each complaint becomes its own ticket, and a support person handles them one by one. But often **many complaints are really one problem**. Example: "payment deducted but no order", "checkout failing", "paid but no confirmation" are probably all one broken payment system.

PulseResolve notices this automatically. It reads each complaint, understands it with AI, and when several complaints share the same cause it groups them into **one incident**. The team investigates once, fixes it once, and all the customers are told together.

Think of it like a hospital triage desk: patients arrive one by one, but the desk notices "five people with the same symptoms, maybe a food poisoning outbreak" and raises one alarm instead of five separate cases.

## 2. Who uses it (the three roles)

| Who | How they log in | What they can do |
|---|---|---|
| **Customer** | Nobody logs in. They use the public page. | Send a complaint, get an ID, check status with the ID |
| **Agent** (staff) | Username `agent` | Review AI suggestions, approve or reject, assign teams, set deadlines, investigate, resolve, reopen, handle single complaints. **Cannot delete.** |
| **Lead** (admin) | Username `lead` | Everything an agent can do, **plus** delete and restore records |

**What is "the agent"?** It is only the name of a normal staff login with fewer powers than the lead. It is not the AI and it does nothing by itself. The AI (Google Gemini) works behind the scenes only to read and group complaints and to suggest summaries. People make every decision. We made two roles so that the most dangerous action (deleting) is limited to an admin, which is a basic security idea called "least privilege".

## 3. The journey of a complaint

1. **Customer submits** on the public page (`/submit`): name, optional contact, the problem. They immediately see their **Complaint ID** (for example #33) and should save it.
2. **AI reads it.** Gemini decides the category (payment, login, delivery...), the mood (frustrated, neutral...), the urgency, and the key symptoms. If Gemini is unavailable, a built-in rule-based reader does the same job (the label "basic analysis" appears).
3. **The system looks for friends.** It compares the new complaint with existing incidents and with other single complaints. First by meaning (embeddings: numbers that capture meaning, so "paisay kat gaye" and "money was deducted" look close). Then a second check asks "would one single fault explain both?". Same category alone is never enough, so a declined card is not mixed with a payment-deducted problem.
4. **Three outcomes:**
   - It joins an existing open incident.
   - Three or more related complaints form a **new suggested incident** (the "AI suggestion").
   - It matches nothing and stays a **standalone complaint**.
5. **A person decides.** On the Incidents page, staff open a suggestion, read why the complaints were grouped, the AI summary and possible causes (each cites the complaints that support it). Then they click **Approve** (and choose a team, priority and deadline) or **Reject**.
6. **The team works.** Status moves: Suggested, Open, Investigating, Resolved. Staff can edit the team and the deadline at any time while it is open.
7. **Resolve.** Staff write an internal note and a **message for the customers**. All linked complaints become Resolved at the same instant, or none do (all-or-nothing).
8. **Customers check.** On `/track` they enter their ID and see Received, In progress or Resolved, and the team's message.
9. **If it comes back:** a new matching complaint after resolution is flagged "possible recurrence". Staff can **Reopen**.

## 4. Single (standalone) complaints

Complaints that match nothing stay in the "Standalone complaints" list. Staff can **Assign** them to a team (with a deadline), **Resolve** them (with a message for the customer), reopen them, and the lead can delete them (for example a positive review).

**Reports with several problems.** If one report describes several different problems (for example a deducted payment and, separately, an app that will not open), it keeps one ID and is **not put in any incident**. It shows in the standalone list with a "Multiple problems" tag, and staff deal with it individually and write one message to the customer when finished. This stops one mixed report from distorting a group.

## 5. Deadlines and alerts

When work is assigned, a deadline starts. Default time depends on priority: critical 2 hours, high 8 hours, medium 24 hours, low 3 days (staff can pick 30 min, 1 h, 4 h or 24 h instead). If unresolved work is **overdue or due within 1 hour**, a **bell** shows a count in the top right of every staff page, plus a banner and a countdown chip. Resolving the work clears the alert.

## 6. Delete and restore (lead only)

"Delete" is a **safe delete**: the item disappears from every list, chart, alert and from the AI grouping, but stays in the database with who deleted it and why. The lead can restore it. We chose this because a company must not lose records by accident.

## 7. What the AI does and does not do

| The AI does | The AI never does |
|---|---|
| Labels each complaint | Approve, reject or resolve anything |
| Checks "same cause?" for similar complaints | Send messages to customers |
| Writes an incident summary and possible causes | Delete or change data on its own |
| Gives reasons ("why grouped") | Get trusted blindly: its output is checked against a strict format, and any cited complaint number is verified to belong to that incident |

If Gemini fails, runs out of free quota or returns nonsense, the system switches automatically to the built-in rule-based reader, so the product keeps working.

## 8. The pieces (architecture in plain words)

- **Website** (what people see): built with React, hosted on Vercel at https://pulseresolve.vercel.app
- **Server** (the brain): built with Python and FastAPI, hosted on Render at https://pulseresolve-api.onrender.com
- **Database**: SQLite, a single file next to the server. It holds complaints, incidents, history and users.
- **AI**: Google Gemini over the internet. The key is kept only on the server, never in the website or in GitHub.
- The website talks to the server through a list of addresses (the API). The full list is in `docs/frontend-spec.md`.

## 9. Safety features (why it is hard to break)

- Only logged-in staff can change anything. Customers can only submit and check status.
- Passwords are stored scrambled (bcrypt). Login attempts and complaint submissions are rate limited.
- Text from customers is treated as untrusted: shown as plain text only, and kept away from the AI's instructions so it cannot "command" the AI.
- Nothing is ever hard-deleted. Every status change and every membership change is written to a history table.
- Two people clicking the same button at the same time: exactly one wins, the other gets a clear message.
- Huge numbers, broken files, odd characters, fake login tokens and similar attacks are rejected with a clean error, never a crash.

## 10. Important limits to know

- The free hosting **sleeps** when idle, so the first visit can take up to a minute. Open the site 5 minutes before showing it.
- The free hosting **forgets its data** on every redeploy. Demo data is recreated automatically (16 synthetic complaints, 3 suggested incidents).
- The free Gemini quota is small. When it runs out the app still works in "basic analysis" mode.
- There are no emails or SMS yet (see section 12).

## 11. Where things are in the code

| Need to find | Look at |
|---|---|
| Grouping rule | `backend/app/services/grouping.py` |
| Incident lifecycle (approve, resolve, delete) | `backend/app/services/incidents.py` |
| AI calls and fallback | `backend/app/services/ai.py`, `fallback.py` |
| Web addresses (endpoints) | `backend/app/routers/` |
| Staff pages | `frontend/src/pages/` |
| Tests | `backend/tests/` (126 tests) |
| Seed demo data | `backend/data/seed_complaints.json` |
| Sample CSVs to import | `backend/data/sample_import.csv`, `sample_evaluation.csv` |

## 12. Email and other notifications (not built, possible next step)

Customer contact is optional and is stored but not used yet. Options for the future:
1. **Email the customer** when their complaint is resolved, with the team's message. Needs an email service (free tiers exist, for example Resend or Gmail SMTP with an app password) and the customer's email.
2. **Email the admin** when work is overdue or due within 1 hour (the alert logic already exists; the missing part is the sending).
3. **SMS or WhatsApp** is possible but usually paid.
Things to handle: keep sending keys secret, avoid spam (send once), get consent for contacting customers, and use a verified sender so messages do not land in spam. A background job is needed to check deadlines regularly. This was left out on purpose to keep the hackathon scope reliable.

## 13. Glossary

- **Incident**: one shared problem that groups several complaints.
- **Standalone complaint**: a complaint that is not part of any incident.
- **Embedding**: a list of numbers that captures the meaning of a text, so similar meanings are close together.
- **Fallback**: the backup rule-based reader used when the AI is unavailable.
- **Soft delete**: hide something but keep the record.
- **API / endpoint**: an address the website calls to ask the server to do something.
- **JWT / token**: a signed digital pass the server gives after login.
- **Rate limit**: a cap on how often someone can call something, to stop abuse.
- **Atomic**: all-or-nothing; it fully happens or does not happen at all.
