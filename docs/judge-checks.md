# Judge Checks

Each check from the organizers' review, where it is enforced, and the test or evidence for it. Run the tests with `cd backend && python -m pytest`.

| # | Check | Enforced in | Test / evidence |
|---|-------|-------------|-----------------|
| 1 | An unrelated complaint does not join an incident | `services/grouping.py` (verifier, `MIN_GROUP`) | `tests/test_grouping.py::test_unrelated_complaint_stays_unassigned`, `test_two_related_complaints_are_not_enough` |
| 2 | Near-miss complaints (same category, different cause) are not merged | Verifier requires the same cause, not the same category; generic symptoms never prove a shared cause | `tests/test_grouping.py::test_near_miss_not_merged_into_payment_incident`; evaluation shows 0 near-miss pairs merged (`scripts/eval_grouping.py`, see `docs/testing.md`) |
| 3 | Results do not change with ticket order beyond the documented rule | Incremental rule in `docs/design.md` (decided at arrival, frozen afterwards) | `tests/test_grouping.py::test_order_independence_on_clear_set` (6 random orders, identical groups) |
| 4 | Hypotheses cite only valid tickets from that incident | `services/incidents.py::validate_citations` (server-side, strips invalid ids, drops empty hypotheses) | `tests/test_incidents.py::test_validate_citations_strips_invalid_ids`, `tests/test_ai.py::test_ai_path_labels_groups_and_validates_citations` |
| 5 | Resolving updates every linked ticket, or none | One transaction in `services/incidents.py::resolve` with rollback | `tests/test_incidents.py::test_resolve_is_atomic`, `test_full_lifecycle`; late matching complaint: `test_late_matching_complaint_flags_recurrence_and_reopen_folds_it_in` |
| 6 | The app keeps working when Gemini fails or rate-limits | `services/ai.py` (retry with backoff, circuit breaker, model and key rotation) and `services/fallback.py` | `tests/test_ai.py::test_gemini_down_rate_limited_and_breaker`, `test_invalid_ai_json_falls_back`, `test_quota_exhausted_model_rotates_and_is_remembered` |
| 7 | Incidents cannot be resolved without access | JWT dependency on every state-changing route (`security.get_current_user`) | `tests/test_api_basic.py::test_protected_routes_need_token` (13 routes, with no token and a bad token) |
