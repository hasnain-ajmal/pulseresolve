import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["TESTING"] = "true"
os.environ["GEMINI_API_KEY"] = ""
os.environ["SECRET_KEY"] = "test-secret"
os.environ["SEED_DEMO_DATA"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402,F401
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password, limiter  # noqa: E402
from app.services import ai  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    limiter.reset()
    ai.reset_breaker()
    db = SessionLocal()
    db.add(User(username="lead", role="lead", password_hash=hash_password("lead-pass")))
    db.commit()
    db.close()
    yield


@pytest.fixture
def db():
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client):
    r = client.post("/api/auth/login", json={"username": "lead", "password": "lead-pass"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


PAYMENT = [
    "Payment deducted from my card but my order was not created.",
    "Checkout keeps failing and then my bank says the money was charged.",
    "Payment successful but I never got a confirmation and the order is stuck on pending.",
    "paisay kat gaye lekin order nahi bana, please check kijiye.",
]


def submit(client, text, name="Test User"):
    limiter.reset()  # rate limiting has its own test; other tests submit freely
    return client.post("/api/complaints", json={"customer_name": name, "text": text})
