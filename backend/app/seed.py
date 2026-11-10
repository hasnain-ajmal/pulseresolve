import json
import logging
import secrets
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Complaint, User
from app.schemas import ComplaintCreate
from app.security import hash_password
from app.services import ai, intake

log = logging.getLogger("pulseresolve.seed")
DATA = Path(__file__).resolve().parent.parent / "data"


def seed_users(db: Session) -> None:
    if db.query(User).count():
        return
    for username, role, pw in (("lead", "lead", settings.SEED_ADMIN_PASSWORD), ("agent", "agent", settings.SEED_AGENT_PASSWORD)):
        if not pw:
            pw = secrets.token_urlsafe(9)
            log.warning("No password configured for seeded user '%s'. Generated one: %s", username, pw)
        db.add(User(username=username, role=role, password_hash=hash_password(pw)))
    db.commit()


def seed_demo_complaints(db: Session) -> None:
    """Synthetic complaints only. Runs through the real pipeline with AI off, so startup is fast and offline-safe."""
    if db.query(Complaint).count():
        return
    rows = json.loads((DATA / "seed_complaints.json").read_text(encoding="utf-8"))
    with ai.disabled():
        for r in rows:
            intake.submit(db, ComplaintCreate(**r), actor="seed")
    log.info("Seeded %s demo complaints", len(rows))
