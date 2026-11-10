"""Public complaint tracking: a customer enters the complaint ID they were given and sees its progress.

Deliberately minimal: only a status, the dates and the team's closing message. No name, contact, complaint text,
team, incident or any other customer's data. Rate limited per IP.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ApiError
from app.models import Complaint, Incident
from app.security import rate_limit

router = APIRouter(prefix="/track", tags=["track"])


@router.get("/{cid}")
def track(cid: int, db: Session = Depends(get_db), _: None = Depends(rate_limit("track", [(30, 60)]))):
    c = db.get(Complaint, cid) if cid > 0 else None
    if c is None or c.deleted_at is not None:
        raise ApiError(404, "not_found", "No complaint found with that ID.")
    if c.status == "resolved":
        stage, label = "resolved", "Resolved"
    else:
        under_review = c.assigned_team is not None
        if c.incident_id is not None:
            inc = db.get(Incident, c.incident_id)
            under_review = under_review or (inc is not None and inc.status in ("open", "investigating"))
        stage, label = ("in_progress", "Our team is working on it") if under_review else ("received", "Received, waiting for review")
    return {"id": c.id, "stage": stage, "label": label, "submitted_at": c.created_at.isoformat() + "Z",
            "resolved_at": (c.resolved_at.isoformat() + "Z") if c.resolved_at and stage == "resolved" else None,
            "message": c.customer_message if stage == "resolved" else None}
