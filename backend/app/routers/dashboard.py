from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Complaint, Incident, User
from app.schemas import ComplaintOut, SENTIMENTS
from app.security import get_current_user
from app.services import incidents as svc

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
ACTIVE = ("suggested", "open", "investigating")


@router.get("/stats")
def stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total = db.query(Complaint).count()
    active = db.query(Incident).filter(Incident.status.in_(ACTIVE)).count()
    high = db.query(Incident).filter(Incident.status.in_(ACTIVE), Incident.priority.in_(("high", "critical"))).count()
    pending = db.query(Incident).filter(Incident.status == "suggested").count()
    sent = dict(db.query(Complaint.sentiment, func.count()).group_by(Complaint.sentiment).all())
    cats = db.query(Complaint.category, func.count()).group_by(Complaint.category).order_by(func.count().desc()).all()
    days = db.query(func.date(Complaint.created_at), func.count()).group_by(func.date(Complaint.created_at)).order_by(func.date(Complaint.created_at)).all()
    recent = db.query(Complaint).order_by(Complaint.id.desc()).limit(8).all()
    act = db.query(Incident).filter(Incident.status.in_(ACTIVE)).order_by(Incident.updated_at.desc()).limit(5).all()
    return {
        "total_complaints": total,
        "active_incidents": active,
        "high_priority_incidents": high,
        "pending_suggestions": pending,
        "sentiment": {s: sent.get(s, 0) for s in SENTIMENTS},
        "by_category": [{"category": c, "count": n} for c, n in cats],
        "per_day": [{"date": str(d), "count": n} for d, n in days],
        "recent_complaints": [ComplaintOut.model_validate(c).model_dump() for c in recent],
        "active_incident_list": [svc.to_summary(db, i).model_dump() for i in act],
    }
