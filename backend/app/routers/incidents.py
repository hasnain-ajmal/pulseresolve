from fastapi import APIRouter, Depends, Query
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ApiError
from app.models import Complaint, Incident, IncidentEvidence, User
from app.schemas import (ApproveIn, IncidentDetail, IncidentSummary, Paged, PatchIn, RejectIn, ReopenIn, ResolveIn)
from app.security import get_current_user
from app.services import incidents as svc

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _get(db: Session, iid: int) -> Incident:
    inc = db.get(Incident, iid)
    if not inc:
        raise ApiError(404, "not_found", "Incident not found.")
    return inc


@router.get("", response_model=Paged[IncidentSummary])
def list_incidents(page: int = Query(1, ge=1, le=10000), size: int = Query(20, ge=1, le=100), status: str | None = None,
                   priority: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.status == status)
    if priority:
        q = q.filter(Incident.priority == priority)
    total = q.count()
    order = case((Incident.status == "suggested", 0), else_=1)
    items = q.order_by(order, Incident.updated_at.desc(), Incident.id.desc()).offset((page - 1) * size).limit(size).all()
    return Paged[IncidentSummary](items=[svc.to_summary(db, i) for i in items], total=total, page=page, size=size)


@router.get("/graph")
def graph(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    incs = db.query(Incident).filter(Incident.status.in_(("suggested", "open", "investigating"))).all()
    nodes, edges = [], []
    for inc in incs:
        nodes.append({"id": f"i{inc.id}", "type": "incident", "label": inc.affected_service, "priority": inc.priority})
        for c in svc.members(db, inc.id):
            nodes.append({"id": f"c{c.id}", "type": "complaint", "label": f"#{c.id}"})
            ev = (db.query(IncidentEvidence).filter(IncidentEvidence.incident_id == inc.id,
                                                    (IncidentEvidence.complaint_a == c.id) | (IncidentEvidence.complaint_b == c.id))
                  .order_by(IncidentEvidence.similarity.desc()).first())
            edges.append({"source": f"c{c.id}", "target": f"i{inc.id}", "score": ev.similarity if ev else 0.5})
    return {"nodes": nodes, "edges": edges}


@router.get("/{iid}", response_model=IncidentDetail)
def detail(iid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return svc.to_detail(db, _get(db, iid))


@router.post("/{iid}/approve", response_model=IncidentDetail)
def approve(iid: int, body: ApproveIn | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inc = _get(db, iid)
    body = body or ApproveIn()
    svc.approve(db, inc, user.username, body.assigned_team, body.priority, body.due_in_minutes)
    return svc.to_detail(db, inc)


@router.post("/{iid}/reject", response_model=IncidentDetail)
def reject(iid: int, body: RejectIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inc = _get(db, iid)
    svc.reject(db, inc, user.username, body.reason)
    return svc.to_detail(db, inc)


@router.patch("/{iid}", response_model=IncidentDetail)
def patch(iid: int, body: PatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inc = _get(db, iid)
    svc.update(db, inc, user.username, body.priority, body.assigned_team, body.status, body.due_in_minutes)
    return svc.to_detail(db, inc)


@router.post("/{iid}/resolve", response_model=IncidentDetail)
def resolve(iid: int, body: ResolveIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inc = _get(db, iid)
    svc.resolve(db, inc, user.username, body.resolution_note)
    return svc.to_detail(db, inc)


@router.post("/{iid}/reopen", response_model=IncidentDetail)
def reopen(iid: int, body: ReopenIn | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    inc = _get(db, iid)
    svc.reopen(db, inc, user.username, (body or ReopenIn()).note)
    return svc.to_detail(db, inc)
