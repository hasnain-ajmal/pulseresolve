import itertools
import random

from tests.conftest import PAYMENT, submit

OTP = [
    "I am not receiving the OTP code to log in since this morning.",
    "OTP sms nahi aa raha, login nahi ho raha kal se.",
    "Verification code never arrives, I cannot sign in to my account.",
]
DELIVERY = [
    "My parcel was supposed to arrive 5 days ago and the tracking has not updated.",
    "Delivery is very late and the rider is not responding to my calls.",
    "Courier delayed again, my order is still not delivered after a week.",
]
ONE_OFFS = [
    "Please add a dark mode option to the app, it hurts my eyes at night.",
    "Great service, thank you for the quick refund last week!",
    "The invoice shows the wrong company name, please correct it.",
]
NEAR_MISS = [
    "Card declined at checkout even though I have enough balance.",
    "I was charged twice for the same subscription this month.",
]


def run(client, db_texts):
    for i, t in enumerate(db_texts):
        assert submit(client, t, name=f"User {i}").status_code == 201
        client.app.state  # noqa: B018  (keep client alive)


def partition(client, auth):
    """Set of frozensets of complaint texts per incident, plus the set of unassigned texts."""
    cs = client.get("/api/complaints?size=100", headers=auth).json()["items"]
    groups: dict = {}
    loose = set()
    for c in cs:
        if c["incident_id"]:
            groups.setdefault(c["incident_id"], set()).add(c["text"])
        else:
            loose.add(c["text"])
    return {frozenset(g) for g in groups.values()}, loose


def reset(client):
    from app.db import Base, SessionLocal, engine
    from app.models import User
    from app.security import hash_password, limiter
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    limiter.reset()
    s = SessionLocal()
    s.add(User(username="lead", role="lead", password_hash=hash_password("lead-pass")))
    s.commit()
    s.close()


def test_related_complaints_form_one_suggested_incident(client, auth):
    run(client, PAYMENT[:3])
    items = client.get("/api/incidents", headers=auth).json()["items"]
    assert len(items) == 1 and items[0]["status"] == "suggested" and items[0]["complaint_count"] == 3


def test_fourth_related_complaint_attaches_without_duplicate_incident(client, auth):
    run(client, PAYMENT)
    items = client.get("/api/incidents", headers=auth).json()["items"]
    assert len(items) == 1 and items[0]["complaint_count"] == 4


def test_two_related_complaints_are_not_enough(client, auth):
    run(client, PAYMENT[:2])
    assert client.get("/api/incidents", headers=auth).json()["total"] == 0


def test_unrelated_complaint_stays_unassigned(client, auth):
    run(client, PAYMENT[:3] + [ONE_OFFS[0], ONE_OFFS[1], ONE_OFFS[2]])
    groups, loose = partition(client, auth)
    assert len(groups) == 1 and len(next(iter(groups))) == 3
    assert set(ONE_OFFS) <= loose


def test_near_miss_not_merged_into_payment_incident(client, auth):
    run(client, PAYMENT[:3] + NEAR_MISS)
    groups, loose = partition(client, auth)
    assert groups == {frozenset(PAYMENT[:3])}
    assert set(NEAR_MISS) <= loose


def test_different_topics_make_separate_incidents(client, auth):
    run(client, PAYMENT[:3] + OTP + DELIVERY)
    groups, loose = partition(client, auth)
    assert groups == {frozenset(PAYMENT[:3]), frozenset(OTP), frozenset(DELIVERY)} and not loose


def test_order_independence_on_clear_set(client, auth):
    texts = PAYMENT + OTP + DELIVERY + ONE_OFFS + NEAR_MISS
    expected = None
    rnd = random.Random(7)
    for _ in range(6):
        reset(client)
        order = texts[:]
        rnd.shuffle(order)
        run(client, order)
        result = partition(client, auth)
        expected = expected or result
        assert result == expected
    groups, _ = expected
    assert frozenset(PAYMENT) in groups and frozenset(OTP) in groups and frozenset(DELIVERY) in groups


def test_membership_is_logged_and_never_silently_changed(client, auth, db):
    from app.models import MembershipLog
    run(client, PAYMENT)
    logs = db.query(MembershipLog).all()
    assert len(logs) == 4 and {m.action for m in logs} == {"attached"}
    before = {c["id"]: c["incident_id"] for c in client.get("/api/complaints", headers=auth).json()["items"]}
    run(client, OTP + ONE_OFFS)
    after = {c["id"]: c["incident_id"] for c in client.get("/api/complaints", headers=auth).json()["items"]}
    assert all(after[k] == v for k, v in before.items())
