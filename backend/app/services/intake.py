"""Complaint intake: analyse (AI or fallback), embed, store, then run the grouping rule."""
import hashlib
import logging
from datetime import timedelta

from sqlalchemy.orm import Session

from app.models import Complaint, utcnow
from app.schemas import ComplaintCreate
from app.services import ai, fallback, grouping

log = logging.getLogger("pulseresolve.intake")


def _hash(text: str) -> str:
    return hashlib.sha256(" ".join(text.lower().split()).encode()).hexdigest()


def analyse(text: str) -> tuple[dict, str]:
    """Returns (analysis dict, source). AI output is schema-validated; any failure falls back to the deterministic analyser."""
    if ai.available():
        try:
            a = ai.analyze_complaint(text)
            return a.model_dump(), "ai"
        except Exception:  # any AI-side failure must never break intake
            log.info("AI analysis unavailable, using fallback", exc_info=True)
    return fallback.analyze(text), "fallback"


def submit(db: Session, data: ComplaintCreate, actor: str = "system") -> Complaint:
    h = _hash(data.text)
    recent = utcnow() - timedelta(minutes=10)
    dup = (db.query(Complaint).filter(Complaint.text_hash == h, Complaint.customer_name == data.customer_name,
                                      Complaint.created_at >= recent).first())
    if dup:  # idempotent: a double click or retry does not create a second complaint
        return dup

    analysis, source = analyse(data.text)
    c = Complaint(customer_name=data.customer_name, customer_contact=data.customer_contact, text=data.text, text_hash=h,
                  category=analysis["category"], sentiment=analysis["sentiment"], urgency=analysis["urgency"],
                  symptoms=analysis.get("symptoms", []), affected_service=analysis["affected_service"],
                  language=analysis.get("language", "en"), analysis_source=source, status="new")
    db.add(c)
    db.flush()
    if ai.available():
        try:
            c.embedding = ai.embed_texts([c.text])[0]
        except Exception:
            log.info("embedding unavailable", exc_info=True)
    db.commit()

    with grouping.GROUP_LOCK:
        try:
            grouping.assign(db, c, actor)
            db.commit()
        except Exception:
            db.rollback()
            log.exception("grouping failed; complaint kept unassigned")
    db.refresh(c)
    return c
