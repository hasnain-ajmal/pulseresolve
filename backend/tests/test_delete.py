import pytest

from app.models import Complaint, ComplaintEvent, Incident, IncidentEvent, User
from app.security import hash_password
from tests.conftest import PAYMENT, submit

POSITIVE = "Great service, thank you for the quick refund last week, very happy with the team!"


@pytest.fixture
def agent_auth(client, db):
    db.add(User(username="agent", role="agent", password_hash=hash_password("agent-pass")))
    db.commit()
    r = client.post("/api/auth/login", json={"username": "agent", "password": "agent-pass"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def resolved_incident(client, auth):
    for i, t in enumerate(PAYMENT[:3]):
        submit(client, t, name=f"User {i}")
    iid = client.get("/api/incidents", headers=auth).json()["items"][0]["id"]
    client.post(f"/api/incidents/{iid}/approve", json={"priority": "high", "due_in_minutes": 30}, headers=auth)
    client.post(f"/api/incidents/{iid}/resolve", json={"resolution_note": "fixed"}, headers=auth)
    return iid


def test_delete_standalone_positive_review_hidden_but_kept_and_restorable(client, auth, db):
    c = submit(client, POSITIVE).json()
    assert client.get("/api/dashboard/stats", headers=auth).json()["total_complaints"] == 1
    r = client.post(f"/api/complaints/{c['id']}/delete", json={"reason": "Positive review, nothing to act on"}, headers=auth)
    assert r.status_code == 200 and r.json()["deleted_at"].endswith("Z")
    assert client.get("/api/complaints", headers=auth).json()["total"] == 0               # hidden from the list
    assert client.get("/api/dashboard/stats", headers=auth).json()["total_complaints"] == 0  # and from the stats
    bin_ = client.get("/api/complaints?deleted=true", headers=auth).json()
    assert bin_["total"] == 1 and bin_["items"][0]["deleted_reason"].startswith("Positive review")
    assert db.get(Complaint, c["id"]) is not None                                          # never removed from the database
    assert [e.action for e in db.query(ComplaintEvent)] == ["deleted"]                     # audit trail
    back = client.post(f"/api/complaints/{c['id']}/restore", headers=auth)
    assert back.status_code == 200 and back.json()["deleted_at"] is None
    assert client.get("/api/complaints", headers=auth).json()["total"] == 1


def test_delete_resolved_standalone_and_rules(client, auth):
    c = submit(client, "Please add a dark mode option to the mobile app, my eyes hurt at night.").json()
    client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "roadmap"}, headers=auth)
    assert client.post(f"/api/complaints/{c['id']}/delete", json={"reason": "Handled, clean up"}, headers=auth).status_code == 200
    assert client.post(f"/api/complaints/{c['id']}/delete", json={"reason": "again please"}, headers=auth).status_code == 409
    assert client.post(f"/api/complaints/{c['id']}/delete", json={"reason": "x"}, headers=auth).status_code == 422
    assert client.post("/api/complaints/9999/delete", json={"reason": "not there"}, headers=auth).status_code == 404
    assert client.post(f"/api/complaints/{c['id']}/restore", headers=auth).status_code == 200
    assert client.post(f"/api/complaints/{c['id']}/restore", headers=auth).status_code == 409


def test_grouped_complaint_cannot_be_deleted_individually(client, auth):
    for i, t in enumerate(PAYMENT[:3]):
        submit(client, t, name=f"User {i}")
    iid = client.get("/api/incidents", headers=auth).json()["items"][0]["id"]
    cid = client.get(f"/api/incidents/{iid}", headers=auth).json()["complaints"][0]["id"]
    r = client.post(f"/api/complaints/{cid}/delete", json={"reason": "should be refused"}, headers=auth)
    assert r.status_code == 409 and "incident" in r.json()["message"].lower()


def test_only_lead_can_delete_or_restore(client, auth, agent_auth):
    c = submit(client, POSITIVE).json()
    assert client.post(f"/api/complaints/{c['id']}/delete", json={"reason": "agent tries"}, headers=agent_auth).status_code == 403
    client.post(f"/api/complaints/{c['id']}/delete", json={"reason": "lead deletes it"}, headers=auth)
    assert client.post(f"/api/complaints/{c['id']}/restore", headers=agent_auth).status_code == 403
    iid = resolved_incident(client, auth)
    assert client.post(f"/api/incidents/{iid}/delete", json={"reason": "agent tries"}, headers=agent_auth).status_code == 403
    for path in ("/api/complaints/1/delete", "/api/complaints/1/restore", "/api/incidents/1/delete", "/api/incidents/1/restore"):
        assert client.post(path, json={"reason": "no login at all"}).status_code == 401


def test_delete_resolved_incident_cascades_and_is_restorable(client, auth, db):
    iid = resolved_incident(client, auth)
    assert client.post(f"/api/incidents/{iid}/delete", json={"reason": "Clean up finished work"}, headers=auth).status_code == 200
    assert client.get("/api/incidents", headers=auth).json()["total"] == 0
    assert client.get("/api/complaints", headers=auth).json()["total"] == 0
    stats = client.get("/api/dashboard/stats", headers=auth).json()
    assert stats["total_complaints"] == 0 and stats["active_incidents"] == 0
    assert client.get("/api/incidents?deleted=true", headers=auth).json()["total"] == 1
    assert client.get("/api/complaints?deleted=true", headers=auth).json()["total"] == 3
    assert db.query(Incident).count() == 1 and db.query(Complaint).count() == 3                   # still in the database
    assert "deleted" in [e.to_status for e in db.query(IncidentEvent)]
    assert client.post(f"/api/incidents/{iid}/delete", json={"reason": "again please"}, headers=auth).status_code == 409
    r = client.post(f"/api/incidents/{iid}/restore", headers=auth)
    assert r.status_code == 200 and r.json()["deleted_at"] is None and r.json()["complaint_count"] == 3
    assert client.get("/api/complaints", headers=auth).json()["total"] == 3
    assert client.post(f"/api/incidents/{iid}/restore", headers=auth).status_code == 409


def test_incident_can_only_be_deleted_when_finished(client, auth):
    for i, t in enumerate(PAYMENT[:3]):
        submit(client, t, name=f"User {i}")
    iid = client.get("/api/incidents", headers=auth).json()["items"][0]["id"]
    assert client.post(f"/api/incidents/{iid}/delete", json={"reason": "still suggested"}, headers=auth).status_code == 409
    client.post(f"/api/incidents/{iid}/approve", headers=auth)
    assert client.post(f"/api/incidents/{iid}/delete", json={"reason": "still open here"}, headers=auth).status_code == 409


def test_rejected_incident_can_be_deleted(client, auth):
    for i, t in enumerate(PAYMENT[:3]):
        submit(client, t, name=f"User {i}")
    iid = client.get("/api/incidents", headers=auth).json()["items"][0]["id"]
    client.post(f"/api/incidents/{iid}/reject", json={"reason": "Not related"}, headers=auth)
    assert client.post(f"/api/incidents/{iid}/delete", json={"reason": "Clean up rejected"}, headers=auth).status_code == 200
    assert client.get("/api/complaints", headers=auth).json()["total"] == 3   # released complaints stay visible


def test_deleted_items_do_not_alert_or_join_groups(client, auth):
    iid = resolved_incident(client, auth)
    client.post(f"/api/incidents/{iid}/reopen", json={"note": "again"}, headers=auth)
    client.post(f"/api/incidents/{iid}/resolve", json={"resolution_note": "fixed again"}, headers=auth)
    client.post(f"/api/incidents/{iid}/delete", json={"reason": "Clean up finished work"}, headers=auth)
    assert client.get("/api/alerts", headers=auth).json()["items"] == []
    late = submit(client, PAYMENT[3], name="Late User").json()      # matches the deleted incident, must not attach to it
    assert late["status"] == "new" and late["incident_id"] is None
