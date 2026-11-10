import json

import pytest

from app.config import settings
from app.services import ai, fallback
from tests.conftest import PAYMENT, submit

MULTI = ("I was placing an order and the payment was deducted but the order is not confirmed. Yesterday my credit card was "
         "declined at checkout too, and 3 days ago my app was not opening at all.")


def test_offline_reader_counts_distinct_problems():
    assert fallback.count_problems(MULTI) >= 2
    assert fallback.count_problems("My payment was deducted and my app will not open at all.") == 2
    assert fallback.count_problems("ایپ نہیں کھل رہی اور ادائیگی کٹ گئی مگر آرڈر نہیں بنا") >= 1


@pytest.mark.parametrize("text", PAYMENT + [
    "I am not receiving the OTP code to log in since this morning.",
    "OTP sms nahi aa raha, login nahi ho raha kal se.",
    "The app became very slow after the latest update, every screen takes forever to load.",
    "Courier delayed again, my order is still not delivered after a week.",
    "My debit card keeps getting declined at checkout even though my balance is fine.",
    "Payment deducted but order not created. Checkout keeps failing too.",
])
def test_single_problem_complaints_are_not_flagged(text):
    assert fallback.count_problems(text) == 1


def test_multi_problem_report_gets_one_id_and_stays_standalone(client, auth):
    r = submit(client, MULTI, name="Multi Customer")
    j = r.json()
    assert r.status_code == 201 and j["multi_issue"] is True and j["problem_count"] >= 2
    assert j["status"] == "new" and j["incident_id"] is None
    assert client.get(f"/api/track/{j['id']}").json()["stage"] == "received"   # one ID, one status page


def test_multi_problem_report_never_joins_or_forms_an_incident(client, auth):
    multi = submit(client, MULTI, name="Multi Customer").json()
    for i, t in enumerate(PAYMENT[:3]):                      # three clean related complaints form their own incident
        submit(client, t, name=f"User {i}")
    incidents = client.get("/api/incidents", headers=auth).json()["items"]
    assert len(incidents) == 1 and incidents[0]["complaint_count"] == 3
    detail = client.get(f"/api/incidents/{incidents[0]['id']}", headers=auth).json()
    assert multi["id"] not in {c["id"] for c in detail["complaints"]}
    late = submit(client, "Payment was deducted but my order was never created, please check it.", name="Late").json()
    assert late["incident_id"] == incidents[0]["id"]          # normal complaints still attach as before
    again = client.get(f"/api/complaints/{multi['id']}", headers=auth).json()
    assert again["incident_id"] is None and again["status"] == "new"


def test_multi_problem_report_is_handled_individually_by_staff(client, auth):
    c = submit(client, MULTI, name="Multi Customer").json()
    a = client.post(f"/api/complaints/{c['id']}/assign", json={"assigned_team": "Support Team", "due_in_minutes": 60}, headers=auth)
    assert a.status_code == 200 and a.json()["multi_issue"] is True
    r = client.post(f"/api/complaints/{c['id']}/resolve", headers=auth, json={
        "resolution_note": "Checked all three problems with the customer",
        "customer_message": "We fixed the payment, replaced your card issue and the app problem. Sorry for the trouble."})
    assert r.status_code == 200
    t = client.get(f"/api/track/{c['id']}").json()
    assert t["stage"] == "resolved" and "payment" in t["message"]


def test_gemini_problem_count_is_validated_and_used(client, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")

    def post(path, body):
        if "batchEmbedContents" in path:
            return {"embeddings": [{"values": [1.0, 0.0]} for _ in body["requests"]]}
        return {"candidates": [{"content": {"parts": [{"text": json.dumps({
            "category": "payment", "sentiment": "negative", "urgency": "high", "symptoms": ["payment deducted"],
            "affected_service": "Payments", "language": "en", "problem_count": 99})}]}}]}

    monkeypatch.setattr(ai, "_post", post)
    j = submit(client, MULTI, name="Multi Customer").json()
    assert j["analysis_source"] == "ai" and j["multi_issue"] is True and j["problem_count"] == 5   # clamped to 5, never trusted blindly
