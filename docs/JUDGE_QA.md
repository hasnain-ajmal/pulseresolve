# Judge Q&A: Questions You May Be Asked, With Honest Answers

Short answers first. Details are in `SYSTEM_GUIDE.md`, `design.md`, `testing.md` and `judge-checks.md`.

## A. The product

**What problem does it solve and for whom?**
Support teams treat each complaint as a separate ticket, so one hidden fault produces dozens of duplicate investigations. PulseResolve groups related complaints into one incident so the team investigates once. The user is a support lead at a small or mid-size company (shop, delivery, fintech, ISP).

**Why would a company pay for it?**
It saves duplicate work, finds widespread problems earlier, keeps customers informed with one clear message, and keeps a full audit trail.

**What is original compared with a normal ticket system?**
The unit of work is the incident, not the ticket. The system proposes the grouping, explains why, and a human confirms.

## B. AI and grouping

**How do you decide two complaints are related?**
Step 1 finds candidates by meaning similarity (Gemini embeddings). Step 2 asks "would one single fault explain both?" (Gemini, or a rule-based check if Gemini is down). A new incident needs at least 3 related complaints.

**How do you stop unrelated or near-miss complaints being merged?**
Same category is never enough. "Card declined" and "payment deducted but no order" are both payments but different causes. The second check and the rule-based fallback both require a shared specific symptom. Tests: near-miss and one-off cases, and an evaluation with 43 labelled complaints (0 near-miss pairs merged).

**Does the result depend on the order complaints arrive?**
Each complaint is decided once at arrival and then frozen. For clear-cut cases the final groups are identical for any order (a test shuffles the order 6 times). Only borderline pairs can depend on order, which is documented in `design.md`.

**Can existing incident membership change silently?**
No. Membership changes only by a logged action (attach, reject, reopen). Every change is written to an append-only log.

**What if two incidents could both fit?**
The complaint joins the one with the best average similarity, if the same-cause check agrees. New incidents form only from complaints that are in no incident, so duplicates cannot be created.

**What if the AI invents a cause or cites a wrong complaint?**
Causes are shown as "possible" and need human confirmation. The server checks every cited complaint number exists and belongs to that incident. Invalid citations are stripped, and a cause with no valid citation is dropped.

**What if Gemini is down, slow, or out of quota?**
Calls have timeouts and retries; the system rotates across models and keys; a circuit breaker stops hammering a failing service; invalid output is rejected. Then a built-in rule-based reader takes over and the result is labelled "basic analysis". Tests cover down, rate-limited, invalid JSON and quota exhaustion.

**Can a customer trick the AI with text like "ignore all instructions"?**
Complaint text is wrapped as untrusted data, output must match a strict format, and the AI cannot trigger any action. Humans approve everything. There is a test and a live check.

**How accurate is it?**
On our 43-complaint labelled set the offline engine scores precision 0.95 and recall 1.00. With Gemini the single partial run scored 1.00 / 0.93 but part of it ran on the fallback because of quota, so we do not claim it as a clean Gemini result. The rules were tuned on that same set, so unseen text may do worse. This is in `testing.md`.

**What if one complaint describes several different problems?**
The analysis counts the distinct problems. If there are two or more clearly unrelated ones (for example a deducted payment and, separately, an app that will not open), the complaint keeps one ID, is never put into any incident and is never used to form one, so it cannot distort a group. It appears in the standalone list with a "Multiple problems" tag and staff handle it individually, resolving it with one message for the customer. The detector is deliberately conservative (only specific problem types count), tested on the labelled and sample data with no false flags. Splitting such a report into linked sub-complaints is future work.

## C. Edge cases (judge checks and more)

| Check | Answer |
|---|---|
| Unrelated complaint joins an incident? | No. It stays standalone. Tested. |
| Near-miss merged? | No. Tested and measured. |
| Order changes results? | Not for clear cases. Tested with shuffles. |
| Hypothesis cites an invalid ticket? | Server strips it. Tested. |
| Resolve updates all tickets or none? | One transaction with rollback; failure injection test. |
| Ticket arrives after resolution? | Flagged "possible recurrence"; staff can reopen and it folds in. |
| Resolve without access? | 401 without login. 13 protected routes tested. |
| Two people resolve at once? | Exactly one wins, the rest get 409. Tested on a real database file. |
| Huge number as an ID? | Clean 422, not a crash. Fixed during our edge-case pass. |
| Action on a deleted record? | Blocked with 409 until restored. |
| Broken, huge or non-English CSV? | Row-level error report, 50-row cap, 1 MB cap, 422 for bad files, never a crash. |
| Empty, tiny, huge, emoji, Urdu, HTML or SQL text? | Validated and stored as plain text; nothing executes. |
| Double click on submit? | Same complaint returned, no duplicate. |
| Fake or expired login token? | 401. A token cannot grant itself a higher role (role is read from the database). |

## D. Security and privacy

**How is access controlled?**
Staff log in; a signed token is checked on every state-changing request. Roles: agent and lead. Only the lead can delete or restore.

**Where are secrets?**
In server environment variables only. A scan of the repository and its history found none. The API key never reaches the browser.

**What stops spam and brute force?**
Rate limits on complaint submission, login and the public status lookup.

**What does the public status page reveal?**
Only status, dates and the team's closing message. No name, contact, complaint text, team or internal note. Weakness: IDs are short numbers, so a guess could show another customer's status and message. Mitigation: staff are told not to include personal data in messages. A secret tracking code is the natural next step.

**Is there real personal data?**
No. All demo data is synthetic.

## E. Data safety

**Why not permanently delete?**
A company must not lose records by accident. Delete hides the item everywhere but keeps it with who, when and why, and a lead can restore it. Every status change is in an append-only history.

**What happens to data on the free host?**
It resets on each redeploy; demo data is recreated automatically. In production we would use a hosted database.

## F. Testing

**How many tests and what do they cover?**
126 automated backend tests covering the grouping rule, lifecycle, deadlines, deletes, tracking, AI failure, security attacks, CSV and edge cases, plus a 42-check live test of the deployed system and a labelled evaluation script. CI runs the tests on every push.

**What did testing find?**
Real bugs, all fixed and logged in `testing.md`, for example: huge numbers caused a 500 error; deleted items still accepted actions; simultaneous clicks could both succeed; the offline reader merged near-misses; the AI free quota ran out. We list them openly.

**What is not tested?**
Load beyond a few simultaneous users, frontend automated tests, and a complete Gemini-only evaluation (the free quota is too small).

## G. Deployment and scale

**Why SQLite, and does it scale?**
It needs no setup, which fits a 6-hour build. For real use switch to PostgreSQL; the code uses a standard ORM, so the change is small.

**Why is the first page load slow?**
The free server sleeps when idle and takes up to a minute to wake. The website waits for it instead of showing fake data.

**Where are the rate limits stored?**
In memory, fine for one server. A real deployment would use a shared store such as Redis.

## H. Responsible AI

**What stops the AI causing harm?**
It only suggests. Humans approve, reject and resolve. Every AI statement is labelled "AI-generated, needs human confirmation", shows its evidence, and has a safe fallback. We keep an AI usage log (`ai-usage-log.md`).

## I. Next steps (what you would do with more time)

1. **Email or SMS notifications:** tell the customer when resolved; email the admin about overdue work (the alert logic exists; sending is missing).
2. A secret tracking code for the public status page.
3. PostgreSQL, shared rate limiting and user management.
4. A larger, independent labelled test set and a full Gemini evaluation.
5. Learning from past incidents.

## J. Tricky questions

**"Isn't this just a Gemini wrapper?"**
The AI is one part. The core is the grouping rule (stable, explained, human-approved), the safety design (validation, citations, atomic resolve, audit), the offline fallback, and the full workflow with deadlines, tracking and delete/restore.

**"What is the weakest part?"**
Grouping thresholds and the offline rules were tuned on a small synthetic set. The free hosting resets data and sleeps. The public status IDs are guessable. We state these limits ourselves.

**"What did you personally build versus the AI?"**
We chose the idea and scope, reviewed and approved the plan, set up accounts and keys, tested the live system and decided every product behaviour. The AI assistant wrote most of the code, and every piece was tested; the AI log lists the details. (Be honest and specific; explain at least one module in your own words.)
