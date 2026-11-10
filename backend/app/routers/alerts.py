from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Complaint, Incident, User, utcnow
from app.security import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _item(kind: str, id_: int, title: str, priority: str, team: str | None, due: datetime, status: str) -> dict:
    left = int((due - utcnow()).total_seconds() // 60)
    return {"kind": kind, "id": id_, "title": title[:120], "priority": priority, "assigned_team": team,
            "status": status, "due_at": due.isoformat() + "Z", "minutes_left": left,
            "level": "overdue" if left < 0 else "due_soon"}


@router.get("")
def alerts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Unresolved work that is overdue or due within the alert window (default 60 minutes), most urgent first."""
    items = []
    for i in db.query(Incident).filter(Incident.status.in_(("open", "investigating")), Incident.due_at.isnot(None), Incident.deleted_at.is_(None)).all():
        items.append(_item("incident", i.id, i.title, i.priority, i.assigned_team, i.due_at, i.status))
    for c in db.query(Complaint).filter(Complaint.status == "new", Complaint.incident_id.is_(None), Complaint.due_at.isnot(None), Complaint.deleted_at.is_(None)).all():
        items.append(_item("complaint", c.id, c.text, c.urgency, c.assigned_team, c.due_at, c.status))
    items = [x for x in items if x["minutes_left"] <= settings.ALERT_WINDOW_MINUTES]
    items.sort(key=lambda x: x["minutes_left"])
    return {"items": items, "overdue": sum(1 for x in items if x["level"] == "overdue"),
            "due_soon": sum(1 for x in items if x["level"] == "due_soon"), "window_minutes": settings.ALERT_WINDOW_MINUTES}
