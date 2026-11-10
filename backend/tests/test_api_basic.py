import pytest

from tests.conftest import PAYMENT, submit


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_submit_returns_analysed_complaint(client):
    r = submit(client, PAYMENT[0])
    assert r.status_code == 201
    j = r.json()
    assert j["category"] == "payment" and j["analysis_source"] == "fallback"
    assert j["status"] == "new" and j["incident_id"] is None
    assert j["created_at"].endswith("Z")


@pytest.mark.parametrize("payload", [
    {"customer_name": "A", "text": "Payment deducted but no order"},          # name too short
    {"customer_name": "Test User", "text": "short"},                          # text too short
    {"customer_name": "Test User", "text": "x" * 2001},                       # text too long
    {"customer_name": "Test User"},                                           # missing text
    {"customer_name": "Test User", "text": "Valid text here", "customer_contact": "c" * 121},
])
def test_submit_validation(client, payload):
    r = client.post("/api/complaints", json=payload)
    assert r.status_code == 422 and r.json()["code"] == "validation_error"


def test_duplicate_submission_is_idempotent(client, auth):
    a = submit(client, PAYMENT[0]).json()
    b = submit(client, PAYMENT[0]).json()
    assert a["id"] == b["id"]
    assert client.get("/api/complaints", headers=auth).json()["total"] == 1


def test_unicode_and_roman_urdu_accepted(client):
    r = submit(client, "ادائیگی ہو گئی مگر آرڈر نہیں بنا، براہ مہربانی مدد کریں")
    assert r.status_code == 201 and r.json()["category"] == "payment"


def test_intake_rate_limited(client):
    def raw(text, name):
        return client.post("/api/complaints", json={"customer_name": name, "text": text})

    codes = [raw(f"Payment problem number {i} with my order", f"User {i}").status_code for i in range(8)]
    assert codes[:6] == [201] * 6
    assert codes[6] == 429
    r = raw("Another complaint that is long enough", "Extra User")
    assert r.json()["code"] == "rate_limited" and "retry-after" in r.headers


def test_login_bad_password_and_rate_limit(client):
    r = client.post("/api/auth/login", json={"username": "lead", "password": "wrong"})
    assert r.status_code == 401 and r.json()["code"] == "unauthorized"
    for _ in range(12):
        r = client.post("/api/auth/login", json={"username": "lead", "password": "wrong"})
    assert r.status_code == 429


def test_error_body_is_generic(client):
    r = client.get("/api/incidents/999")
    assert r.status_code == 401 and set(r.json()) == {"code", "message"}


PROTECTED = [
    ("GET", "/api/complaints"), ("GET", "/api/complaints/1"), ("POST", "/api/complaints/import"),
    ("GET", "/api/incidents"), ("GET", "/api/incidents/1"), ("POST", "/api/incidents/1/approve"),
    ("POST", "/api/incidents/1/reject"), ("POST", "/api/incidents/1/resolve"), ("POST", "/api/incidents/1/reopen"),
    ("PATCH", "/api/incidents/1"), ("GET", "/api/dashboard/stats"), ("GET", "/api/incidents/graph"), ("GET", "/api/auth/me"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_need_token(client, method, path):
    r = client.request(method, path, json={})
    assert r.status_code == 401
    r2 = client.request(method, path, json={}, headers={"Authorization": "Bearer not-a-real-token"})
    assert r2.status_code == 401
