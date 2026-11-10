# Judge Checks

Each check from the organizers' review, with where it is enforced and where it is tested. Test names are filled in as they are written.

| # | Check | Enforced in | Test / evidence |
|---|-------|-------------|-----------------|
| 1 | An unrelated complaint does not join an incident | `services/grouping.py` verifier, `MIN_GROUP` | `tests/test_grouping.py::test_unrelated_stays_new` |
| 2 | Near-miss complaints (same category, different cause) are not merged | Verifier and fallback verifier require same cause, not just category | `tests/test_grouping.py::test_near_miss_not_merged`, eval set |
| 3 | Results do not change with ticket order beyond the documented rule | Incremental rule in `docs/design.md` | `tests/test_grouping.py::test_order_independence` |
| 4 | Hypotheses cite only valid tickets from that incident | `services/incidents.py::validate_citations` | `tests/test_citations.py` |
| 5 | Resolving updates every linked ticket, or none | Single transaction in `services/incidents.py::resolve` | `tests/test_resolve.py::test_atomic_rollback` |
| 6 | App keeps working when Gemini fails or rate-limits | `services/ai.py` retry, breaker, fallback | `tests/test_ai_failure.py` |
| 7 | Incidents cannot be resolved without access | JWT dependency on all mutating routes | `tests/test_auth.py::test_protected_routes` |
