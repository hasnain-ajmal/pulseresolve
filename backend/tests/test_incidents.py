import pytest

from app.models import Complaint, Incident, IncidentEvent
from app.services import incidents as svc
from tests.conftest import PAYMENT, submit


def make_incident(client, auth, texts=PAYMENT[:3]):
    for i, t in enumerate(texts):
        submit(client, t, name=f"User {i}")
    return client.get("/api/incidents", headers=auth).json()["items"][0]["id"]


def act(client, auth, iid, action, body=None):
    return client.post(f"/api/incidents/{iid}/{action}", json=body or {}, headers=auth)


def test_detail_shape_and_evidence(client, auth):
    iid = make_incident(client, auth)
    d = client.get(f"/api/incidents/{iid}", headers=auth).json()
    for k in ("title", "summary", "shared_symptoms", "evidence", "hypotheses", "suggested_actions", "complaints", "history",
              "new_matching_complaints", "resolved_at", "complaint_count", "status", "priority"):
        assert k in d
    assert d["status"] == "suggested" and len(d["complaints"]) == 3 and d["evidence"]
    ids = {c["id"] for c in d["complaints"]}
    for h in d["hypotheses"]:
        assert set(h["cited_complaint_ids"]) <= ids


def test_full_lifecycle(client, auth):
    iid = make_incident(client, auth)
    assert act(client, auth, iid, "approve", {"assigned_team": "Payments Ops"}).json()["status"] == "open"
    r = client.patch(f"/api/incidents/{iid}", json={"status": "investigating", "priority": "critical"}, headers=auth)
    assert r.json()["status"] == "investigating" and r.json()["priority"] == "critical"
    r = act(client, auth, iid, "resolve", {"resolution_note": "Gateway callback fixed"})
    d = r.json()
    assert d["status"] == "resolved" and d["resolved_at"]
    assert {c["status"] for c in d["complaints"]} == {"resolved"}
    assert [h["to_status"] for h in d["history"]] == ["suggested", "open", "investigating", "resolved"]


def test_invalid_transitions_return_409(client, auth):
    iid = make_incident(client, auth)
    assert act(client, auth, iid, "resolve", {"resolution_note": "too early"}).status_code == 409
    assert act(client, auth, iid, "reopen").status_code == 409
    act(client, auth, iid, "approve")
    assert act(client, auth, iid, "approve").status_code == 409
    assert act(client, auth, iid, "reject", {"reason": "nope"}).status_code == 409
    assert act(client, auth, 9999, "approve").status_code == 404


def test_reject_releases_complaints_and_blocks_regrouping(client, auth):
    iid = make_incident(client, auth)
    d = act(client, auth, iid, "reject", {"reason": "Not related"}).json()
    assert d["status"] == "rejected"
    cs = client.get("/api/complaints", headers=auth).json()["items"]
    assert {c["status"] for c in cs} == {"new"} and all(c["incident_id"] is None for c in cs)
    submit(client, PAYMENT[3], name="Late User")  # related to the blocked group, must not re-form the same incident
    assert client.get("/api/incidents?status=suggested", headers=auth).json()["total"] == 0


def test_resolve_is_atomic(client, auth, db, monkeypatch):
    iid = make_incident(client, auth)
    act(client, auth, iid, "approve")

    def boom(*a, **k):
        raise RuntimeError("disk error")

    monkeypatch.setattr(svc, "_event", boom)
    r = act(client, auth, iid, "resolve", {"resolution_note": "will fail"})
    assert r.status_code == 500 and r.json()["code"] == "server_error"
    monkeypatch.undo()
    db.expire_all()
    assert db.get(Incident, iid).status == "open"
    assert {c.status for c in db.query(Complaint).filter(Complaint.incident_id == iid)} == {"linked"}
    assert db.query(IncidentEvent).filter(IncidentEvent.to_status == "resolved").count() == 0


def test_late_matching_complaint_flags_recurrence_and_reopen_folds_it_in(client, auth):
    iid = make_incident(client, auth)
    act(client, auth, iid, "approve")
    act(client, auth, iid, "resolve", {"resolution_note": "fixed"})
    late = submit(client, PAYMENT[3], name="Late User").json()
    assert late["status"] == "possible_recurrence" and late["incident_id"] == iid
    d = client.get(f"/api/incidents/{iid}", headers=auth).json()
    assert d["status"] == "resolved" and d["new_matching_complaints"] == 1 and d["complaint_count"] == 3
    d = act(client, auth, iid, "reopen", {"note": "Back again"}).json()
    assert d["status"] == "open" and d["new_matching_complaints"] == 0 and d["complaint_count"] == 4
    assert {c["status"] for c in d["complaints"]} == {"linked"}


def test_priority_and_team_editable_only_when_active(client, auth):
    iid = make_incident(client, auth)
    assert client.patch(f"/api/incidents/{iid}", json={"priority": "low", "assigned_team": "Ops"}, headers=auth).status_code == 200
    act(client, auth, iid, "approve")
    act(client, auth, iid, "resolve", {"resolution_note": "done"})
    assert client.patch(f"/api/incidents/{iid}", json={"priority": "high"}, headers=auth).status_code == 409
    assert client.patch(f"/api/incidents/{iid}", json={"priority": "urgent!"}, headers=auth).status_code == 422


def test_validate_citations_strips_invalid_ids():
    hyps = [
        {"text": "valid", "confidence": "high", "cited_complaint_ids": [1, 2, 99]},
        {"text": "all bad", "confidence": "low", "cited_complaint_ids": [98, 99]},
        {"text": "none", "confidence": "low", "cited_complaint_ids": []},
    ]
    clean, stripped = svc.validate_citations(hyps, {1, 2, 3})
    assert clean == [{"text": "valid", "confidence": "high", "cited_complaint_ids": [1, 2]}]
    assert stripped == 5  # 1 bad id + (2 bad ids + 1 dropped hypothesis) + 1 dropped hypothesis


def test_dashboard_stats_and_graph(client, auth):
    make_incident(client, auth)
    s = client.get("/api/dashboard/stats", headers=auth).json()
    assert s["total_complaints"] == 3 and s["active_incidents"] == 1 and s["pending_suggestions"] == 1
    assert set(s["sentiment"]) == {"positive", "neutral", "negative", "frustrated"}
    assert len(s["recent_complaints"]) == 3 and s["active_incident_list"][0]["complaint_count"] == 3
    g = client.get("/api/incidents/graph", headers=auth).json()
    assert len([n for n in g["nodes"] if n["type"] == "incident"]) == 1 and len(g["edges"]) == 3


def test_csv_import_handles_bad_rows(client, auth):
    csv_data = ("customer_name,customer_contact,text\n"
                "Ali Raza,ali@example.com,Payment deducted but order was not created\n"
                "X,,short\n"
                "Sara Khan,,ادائیگی ہو گئی مگر آرڈر نہیں بنا براہ مہربانی\n").encode("utf-8")
    r = client.post("/api/complaints/import", headers=auth, files={"file": ("c.csv", csv_data, "text/csv")})
    j = r.json()
    assert r.status_code == 200 and j["imported"] == 2 and j["failed"] == 1 and j["errors"][0]["row"] == 3
    bad = client.post("/api/complaints/import", headers=auth, files={"file": ("c.csv", b"a,b\n1,2\n", "text/csv")})
    assert bad.status_code == 422
    big = client.post("/api/complaints/import", headers=auth, files={"file": ("c.csv", b"text\n" + b"x" * 1_100_000, "text/csv")})
    assert big.status_code == 422


# ---- standalone complaints: assign, resolve, reopen ---------------------------------------------------------
def _one_off(client):
    return submit(client, "Please add a dark mode option to the mobile app, my eyes hurt at night.").json()


def test_standalone_assign_resolve_reopen_flow(client, auth, db):
    from app.models import ComplaintEvent
    c = _one_off(client)
    assert c["status"] == "new" and c["incident_id"] is None and c["assigned_team"] is None
    r = client.post(f"/api/complaints/{c['id']}/assign", json={"assigned_team": "Product Team"}, headers=auth)
    assert r.status_code == 200 and r.json()["assigned_team"] == "Product Team"
    r = client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "Added to the roadmap"}, headers=auth)
    j = r.json()
    assert r.status_code == 200 and j["status"] == "resolved" and j["resolved_at"].endswith("Z") and j["resolution_note"] == "Added to the roadmap"
    # leaves the standalone list, but is never deleted
    assert client.get("/api/complaints?status=new", headers=auth).json()["total"] == 0
    assert client.get(f"/api/complaints/{c['id']}", headers=auth).status_code == 200
    r = client.post(f"/api/complaints/{c['id']}/reopen", json={"note": "Customer wrote again"}, headers=auth)
    assert r.json()["status"] == "new" and r.json()["resolved_at"] is None
    assert [e.action for e in db.query(ComplaintEvent).order_by(ComplaintEvent.id)] == ["assigned", "resolved", "reopened"]


def test_standalone_actions_rejected_in_wrong_state(client, auth):
    c = _one_off(client)
    assert client.post(f"/api/complaints/{c['id']}/reopen", json={}, headers=auth).status_code == 409   # not resolved yet
    client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "done"}, headers=auth)
    assert client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "again"}, headers=auth).status_code == 409
    assert client.post(f"/api/complaints/{c['id']}/assign", json={"assigned_team": "X Team"}, headers=auth).status_code == 409
    assert client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "x"}, headers=auth).status_code == 422
    assert client.post("/api/complaints/9999/resolve", json={"resolution_note": "done"}, headers=auth).status_code == 404


def test_grouped_complaint_cannot_be_handled_individually(client, auth):
    iid = make_incident(client, auth)
    c = client.get(f"/api/incidents/{iid}", headers=auth).json()["complaints"][0]
    for action, body in (("assign", {"assigned_team": "Ops"}), ("resolve", {"resolution_note": "done"}), ("reopen", {})):
        r = client.post(f"/api/complaints/{c['id']}/{action}", json=body, headers=auth)
        assert r.status_code == 409 and "incident" in r.json()["message"].lower()


def test_resolved_standalone_does_not_join_new_incidents(client, auth):
    c = submit(client, PAYMENT[0], name="User A").json()
    client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "handled directly"}, headers=auth)
    submit(client, PAYMENT[1], name="User B")
    submit(client, PAYMENT[2], name="User C")
    assert client.get("/api/incidents", headers=auth).json()["total"] == 0  # the resolved one is out of the pool


@pytest.mark.parametrize("action,body", [("assign", {"assigned_team": "Ops"}), ("resolve", {"resolution_note": "done"}), ("reopen", {})])
def test_standalone_actions_need_login(client, action, body):
    assert client.post(f"/api/complaints/1/{action}", json=body).status_code == 401
