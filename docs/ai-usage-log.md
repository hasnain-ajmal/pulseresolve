# AI Usage Log

Required by the event rules. Log every meaningful use of AI tools during the build.

## Tools used

| Tool | Used for |
|------|----------|
| Claude Code (Claude Sonnet 5.5) | Planning documents, backend code, tests, evaluation script, deployment configuration, debugging |
| Google Gemini API (inside the product) | Complaint classification and sentiment, same-cause verification, embeddings, incident summaries and hypotheses |
| Claude Code (partner's own AI tool) | Frontend pages, built from `docs/frontend-spec.md` |

## Log

| Time | Member | Tool | What it was asked | What was accepted / changed / rejected | How it was verified |
|------|--------|------|-------------------|----------------------------------------|---------------------|
| 09:50 | Hasnain | Claude Code | Write frontend specification and API contract | Accepted; later made the repo copy `docs/frontend-spec.md` the contract | Read by the partner, used to build against |
| 10:10 | Hasnain | Claude Code | Write requirements, design, judge-checks map from the organizers' review | Accepted with one correction (an over-claim about embedding results was reworded) | Hasnain reviewed the plan before approving |
| 10:25 to 10:50 | Hasnain | Claude Code | Build backend: models, auth, intake, grouping rule, incident lifecycle, Gemini client, offline fallback, seed data | Accepted, then changed substantially after tests failed (similarity signal, near-miss rules) | 50 automated tests, labelled evaluation script |
| 10:50 | Hasnain | Claude Code | Run Gemini smoke test with the real key | Found the free quota is about 20 requests per day per model; added model and key rotation | Live test calls, new rotation test |
| 10:55 | Hasnain | Claude Code | Create Render blueprint and README, deploy backend through the Render dashboard | Accepted; the Gemini key was pasted by Hasnain, never committed | Secret scan before every push, health check on the live URL |
| 11:00 to 12:20 | Hasnain | Claude Code | Deploy the API and review the partner's frontend | The frontend silently switched to fake in-browser data when the API took longer than 2 seconds and accepted any password. Changed so production always uses the real API; accepted the rest | Read the code, live login and submit test |
| 12:30 to 13:00 | Hasnain | Claude Code | Standalone complaints list, assign / resolve / reopen, team drop-down | Accepted; reworked the team picker into a drop-down with an "Other" option after Hasnain tested it | Backend tests, live API checks, Hasnain clicked through it |
| 13:10 to 13:40 | Hasnain | Claude Code | Team deadlines by priority and overdue alerts (bell, banner, countdown) | Accepted | 7 new tests, live API verification |
| 13:50 to 14:10 | Hasnain | Claude Code | Safe delete and restore for admins; customer complaint ID and public status page; resolve message for the customer | Accepted; chose soft delete over permanent delete to keep records | 15 new tests, live end-to-end check |
| 14:20 to 14:50 | Hasnain | Claude Code | Act as a tester: attack the system with edge cases | Found 4 real bugs (huge IDs returned 500, deleted records accepted actions, simultaneous clicks, parallel submissions); fixed all; added 47 edge-case tests | Attack script on a real database file, then permanent tests |
| 15:00 to 15:20 | Hasnain | Claude Code | A report with several problems must stay out of groups | First detector wrongly flagged normal complaints; made it conservative; accepted the final version | 15 new tests; checked on all sample data: no false flags |
| 15:30 to 15:50 | Hasnain | Claude Code | Gemini fell back to the offline reader after a second key was added | Read the server log; found Gemini answers were rejected as too strict; made parsing tolerant and logged reasons | 8 new tests, live test complaint analysed by Gemini |
| 16:00 to 16:20 | Hasnain | Claude Code | System guide, judge Q&A, measured NFR results, design update, submission file | Accepted after checking the numbers against real measurements | Re-ran measurements; read every figure against the code and tests |

## Reflection

### Where AI helped most

Scaffolding the whole backend quickly, writing many edge-case tests, and running the evaluation loop that exposed near-miss merges.

### Where AI was wrong or misleading

- The first offline similarity (character n-gram TF-IDF) was nearly useless between paraphrases; tests showed it.
- A shell edit silently corrupted regex word boundaries into backspace characters; failing tests caught it.
- The first grouping version re-formed a rejected group; a test caught it.
- It assumed Gemini free-tier limits were generous; they were not.
- It reported "Gemini is working" before the live check had finished; the check then showed the offline reader, so the status was corrected.
- The first multi-problem detector flagged normal complaints (password reset email, refunds); only checking it against all sample data exposed this.
- The first AI answer parser was too strict and threw away usable answers; real model output is messier than the test fakes.

### What we did not delegate to AI

Choosing the product idea and scope, approving the plan, supplying and pasting the API key, deciding what to claim about results (the evaluation caveats are written honestly), and the demo.
