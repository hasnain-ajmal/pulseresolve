from datetime import timedelta

from app.models import Incident, utcnow
from tests.conftest import PAYMENT, submit


def make_incident(client, auth):
    for i, t in enumerate(PAYMENT[:3]):
        submit(client, t, name=f"User {i}")
    return client.get("/api/incidents", headers=auth).json()["items"][0]["id"]


def alerts(client, auth):
    return client.get("/api/alerts", headers=auth).json()


def test_approve_sets_deadline_by_priority(client, auth):
    a = make_incident(client, auth)
    assert client.get(f"/api/incidents/{a}", headers=auth).json()["due_at"] is None  # no clock before approval
    crit = client.post(f"/api/incidents/{a}/approve", json={"priority": "critical"}, headers=auth).json()
    assert crit["due_at"].endswith("Z")
    from app.services.incidents import sla_minutes
    assert sla_minutes("critical") < sla_minutes("high") < sla_minutes("medium") < sla_minutes("low")


def test_custom_deadline_and_alert_window(client, auth):
    iid = make_incident(client, auth)
    client.post(f"/api/incidents/{iid}/approve", json={"assigned_team": "Payments Ops", "priority": "low", "due_in_minutes": 30}, headers=auth)
    al = alerts(client, auth)
    assert al["due_soon"] == 1 and al["overdue"] == 0 and al["items"][0]["kind"] == "incident"
    assert al["items"][0]["assigned_team"] == "Payments Ops" and 0 <= al["items"][0]["minutes_left"] <= 30


def test_no_alert_when_far_from_deadline(client, auth):
    iid = make_incident(client, auth)
    client.post(f"/api/incidents/{iid}/approve", json={"priority": "low"}, headers=auth)  # default 3 days
    assert alerts(client, auth)["items"] == []


def test_overdue_then_resolved_clears_alert(client, auth, db):
    iid = make_incident(client, auth)
    client.post(f"/api/incidents/{iid}/approve", json={"priority": "high", "due_in_minutes": 60}, headers=auth)
    inc = db.get(Incident, iid)
    inc.due_at = utcnow() - timedelta(minutes=5)
    db.commit()
    al = alerts(client, auth)
    assert al["overdue"] == 1 and al["items"][0]["level"] == "overdue" and al["items"][0]["minutes_left"] < 0
    client.post(f"/api/incidents/{iid}/resolve", json={"resolution_note": "fixed"}, headers=auth)
    assert alerts(client, auth)["items"] == []


def test_priority_change_recalculates_deadline(client, auth):
    iid = make_incident(client, auth)
    client.post(f"/api/incidents/{iid}/approve", json={"priority": "low"}, headers=auth)
    before = client.get(f"/api/incidents/{iid}", headers=auth).json()["due_at"]
    after = client.patch(f"/api/incidents/{iid}", json={"priority": "critical"}, headers=auth).json()["due_at"]
    assert after < before  # critical gets less time


def test_standalone_assignment_sets_deadline_and_alert(client, auth):
    c = submit(client, "Please add a dark mode option to the mobile app, my eyes hurt at night.").json()
    r = client.post(f"/api/complaints/{c['id']}/assign", json={"assigned_team": "Product Team", "due_in_minutes": 20}, headers=auth).json()
    assert r["due_at"].endswith("Z")
    al = alerts(client, auth)
    assert al["items"][0]["kind"] == "complaint" and al["items"][0]["id"] == c["id"]
    client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "done"}, headers=auth)
    assert alerts(client, auth)["items"] == []


def test_invalid_deadline_rejected_and_login_required(client, auth):
    iid = make_incident(client, auth)
    assert client.post(f"/api/incidents/{iid}/approve", json={"due_in_minutes": 0}, headers=auth).status_code == 422
    assert client.post(f"/api/incidents/{iid}/approve", json={"due_in_minutes": 99999}, headers=auth).status_code == 422
    assert client.get("/api/alerts").status_code == 401
