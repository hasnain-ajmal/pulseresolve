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

## Reflection

### Where AI helped most

Scaffolding the whole backend quickly, writing many edge-case tests, and running the evaluation loop that exposed near-miss merges.

### Where AI was wrong or misleading

- The first offline similarity (character n-gram TF-IDF) was nearly useless between paraphrases; tests showed it.
- A shell edit silently corrupted regex word boundaries into backspace characters; failing tests caught it.
- The first grouping version re-formed a rejected group; a test caught it.
- It assumed Gemini free-tier limits were generous; they were not.

### What we did not delegate to AI

Choosing the product idea and scope, approving the plan, supplying and pasting the API key, deciding what to claim about results (the evaluation caveats are written honestly), and the demo.
