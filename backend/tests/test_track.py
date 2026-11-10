from tests.conftest import PAYMENT, submit


def track(client, cid):
    return client.get(f"/api/track/{cid}")


def one_off(client):
    return submit(client, "Please add a dark mode option to the mobile app, my eyes hurt at night.").json()


def test_new_complaint_is_received_and_public(client):
    c = one_off(client)
    r = track(client, c["id"])      # no login needed
    j = r.json()
    assert r.status_code == 200 and j["stage"] == "received" and j["message"] is None and j["resolved_at"] is None
    # only a minimal, safe set of fields is exposed
    assert set(j) == {"id", "stage", "label", "submitted_at", "resolved_at", "message"}
    assert "dark mode" not in r.text and "Test User" not in r.text


def test_assigned_complaint_is_in_progress_then_resolved_with_customer_message(client, auth):
    c = one_off(client)
    client.post(f"/api/complaints/{c['id']}/assign", json={"assigned_team": "Product Team"}, headers=auth)
    assert track(client, c["id"]).json()["stage"] == "in_progress"
    r = client.post(f"/api/complaints/{c['id']}/resolve", headers=auth,
                    json={"resolution_note": "internal: roadmap item 42", "customer_message": "Thanks! Dark mode ships next month."})
    assert r.status_code == 200 and r.json()["customer_message"] == "Thanks! Dark mode ships next month."
    j = track(client, c["id"]).json()
    assert j["stage"] == "resolved" and j["message"] == "Thanks! Dark mode ships next month." and j["resolved_at"].endswith("Z")
    assert "internal" not in str(j)      # the internal note is never shown to the customer


def test_default_message_when_none_given_and_reopen_clears_it(client, auth):
    c = one_off(client)
    client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "handled"}, headers=auth)
    assert "resolved" in track(client, c["id"]).json()["message"].lower()
    client.post(f"/api/complaints/{c['id']}/reopen", json={}, headers=auth)
    j = track(client, c["id"]).json()
    assert j["stage"] == "received" and j["message"] is None


def test_incident_resolution_message_reaches_every_linked_customer(client, auth):
    ids = [submit(client, t, name=f"User {i}").json()["id"] for i, t in enumerate(PAYMENT[:3])]
    iid = client.get("/api/incidents", headers=auth).json()["items"][0]["id"]
    assert all(track(client, i).json()["stage"] == "received" for i in ids)          # suggested only
    client.post(f"/api/incidents/{iid}/approve", json={"assigned_team": "Payments Ops"}, headers=auth)
    assert all(track(client, i).json()["stage"] == "in_progress" for i in ids)       # team is on it
    client.post(f"/api/incidents/{iid}/resolve", headers=auth,
                json={"resolution_note": "gateway callback fixed", "customer_message": "Payments are fixed. Any charge will be refunded."})
    for i in ids:
        j = track(client, i).json()
        assert j["stage"] == "resolved" and j["message"] == "Payments are fixed. Any charge will be refunded."
    assert "gateway" not in track(client, ids[0]).text


def test_unknown_and_deleted_ids_return_404(client, auth):
    assert track(client, 9999).status_code == 404 and track(client, 0).status_code == 404
    assert client.get("/api/track/abc").status_code == 422
    c = one_off(client)
    client.post(f"/api/complaints/{c['id']}/delete", json={"reason": "clean up the list"}, headers=auth)
    assert track(client, c["id"]).status_code == 404


def test_message_validation(client, auth):
    c = one_off(client)
    r = client.post(f"/api/complaints/{c['id']}/resolve", json={"resolution_note": "done", "customer_message": "x"}, headers=auth)
    assert r.status_code == 422


def test_tracking_is_rate_limited(client):
    c = one_off(client)
    codes = [track(client, c["id"]).status_code for _ in range(32)]
    assert codes[:30] == [200] * 30 and codes[30] == 429
