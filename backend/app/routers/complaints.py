import csv
import io
from datetime import timedelta

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ApiError
from app.models import Complaint, ComplaintEvent, User, utcnow
from app.schemas import (AssignComplaintIn, ComplaintCreate, ComplaintOut, DeleteIn, Paged, ReopenComplaintIn, ResolveComplaintIn)
from app.security import get_current_user, rate_limit, require_lead
from app.services import incidents as incidents_svc
from app.services import intake

router = APIRouter(prefix="/complaints", tags=["complaints"])
MAX_CSV_BYTES = 1_000_000
MAX_CSV_ROWS = 50


@router.post("", response_model=ComplaintOut, status_code=201)
def submit(body: ComplaintCreate, db: Session = Depends(get_db),
           _: None = Depends(rate_limit("complaints", [(6, 60), (60, 3600)]))):
    return intake.submit(db, body)


def _decode(raw: bytes) -> str:
    for enc in ("utf-8-sig", "utf-16", "cp1252"):
        try:
            return raw.decode(enc)
        except UnicodeError:
            continue
    return raw.decode("utf-8", errors="replace")


@router.post("/import")
def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    raw = file.file.read(MAX_CSV_BYTES + 1)
    if len(raw) > MAX_CSV_BYTES:
        raise ApiError(422, "validation_error", "File is too large (limit 1 MB).")
    try:
        reader = csv.DictReader(io.StringIO(_decode(raw)))
        fields = [f.strip().lower() for f in (reader.fieldnames or [])]
        if "text" not in fields:
            raise ApiError(422, "validation_error", "CSV must have a 'text' column (optional: customer_name, customer_contact).")
        reader.fieldnames = fields
        rows = list(reader)
    except csv.Error:
        raise ApiError(422, "validation_error", "Could not read the CSV file.")
    imported, errors = 0, []
    for i, row in enumerate(rows, start=2):
        if imported + len(errors) >= MAX_CSV_ROWS:
            errors.append({"row": i, "message": f"Row limit reached ({MAX_CSV_ROWS} rows per import)."})
            break
        try:
            data = ComplaintCreate(customer_name=(row.get("customer_name") or "Imported customer").strip() or "Imported customer",
                                   customer_contact=row.get("customer_contact"), text=row.get("text") or "")
        except ValidationError as e:
            loc = e.errors()[0]["loc"][0] if e.errors() else "row"
            errors.append({"row": i, "message": f"Invalid {loc}."})
            continue
        intake.submit(db, data, actor=user.username)
        imported += 1
    return {"imported": imported, "failed": len(errors), "errors": errors}


@router.get("", response_model=Paged[ComplaintOut])
def list_complaints(page: int = Query(1, ge=1, le=10000), size: int = Query(20, ge=1, le=100), status: str | None = None,
                    category: str | None = None, sentiment: str | None = None, incident_id: int | None = None,
                    q: str | None = Query(None, max_length=100), deleted: bool = False, db: Session = Depends(get_db),
                    _: User = Depends(get_current_user)):
    query = db.query(Complaint).filter(Complaint.deleted_at.isnot(None) if deleted else Complaint.deleted_at.is_(None))
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Complaint.category == category)
    if sentiment:
        query = query.filter(Complaint.sentiment == sentiment)
    if incident_id is not None:
        query = query.filter(Complaint.incident_id == incident_id)
    if q:
        like = f"%{q.replace('%', '').replace('_', '')}%"
        query = query.filter(or_(Complaint.text.ilike(like), Complaint.customer_name.ilike(like)))
    total = query.count()
    items = query.order_by(Complaint.id.desc()).offset((page - 1) * size).limit(size).all()
    return Paged[ComplaintOut](items=[ComplaintOut.model_validate(c) for c in items], total=total, page=page, size=size)


def _load(db: Session, cid: int) -> Complaint:
    c = db.get(Complaint, cid)
    if not c:
        raise ApiError(404, "not_found", "Complaint not found.")
    return c


def _standalone(c: Complaint, action: str) -> None:
    """Only complaints outside incidents are handled directly; grouped ones are managed through their incident."""
    if c.incident_id is not None:
        raise ApiError(409, "invalid_transition",
                       f"This complaint belongs to incident #{c.incident_id}. Manage it through the incident.")


@router.get("/{cid}", response_model=ComplaintOut)
def get_complaint(cid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _load(db, cid)


@router.post("/{cid}/assign", response_model=ComplaintOut)
def assign_complaint(cid: int, body: AssignComplaintIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _load(db, cid)
    _standalone(c, "assign")
    if c.status != "new":
        raise ApiError(409, "invalid_transition", f"Cannot assign a complaint that is {c.status}.")
    c.assigned_team = body.assigned_team
    c.due_at = utcnow() + timedelta(minutes=body.due_in_minutes or incidents_svc.sla_minutes(c.urgency))
    db.add(ComplaintEvent(complaint_id=c.id, action="assigned", actor=user.username, note=body.assigned_team))
    db.commit()
    return c


@router.post("/{cid}/resolve", response_model=ComplaintOut)
def resolve_complaint(cid: int, body: ResolveComplaintIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _load(db, cid)
    _standalone(c, "resolve")
    if c.status != "new":
        raise ApiError(409, "invalid_transition", f"Cannot resolve a complaint that is {c.status}.")
    try:
        c.status, c.resolution_note, c.resolved_at = "resolved", body.resolution_note, utcnow()
        c.customer_message = body.customer_message or incidents_svc.DEFAULT_CUSTOMER_MESSAGE
        db.add(ComplaintEvent(complaint_id=c.id, action="resolved", actor=user.username, note=body.resolution_note))
        db.commit()
    except Exception:
        db.rollback()
        raise ApiError(500, "server_error", "Could not resolve the complaint. Nothing was changed.")
    return c


@router.post("/{cid}/delete", response_model=ComplaintOut)
def delete_complaint(cid: int, body: DeleteIn, db: Session = Depends(get_db), user: User = Depends(require_lead)):
    """Soft delete: hidden everywhere, kept in the database with who and why. Restorable. Lead (admin) only."""
    c = _load(db, cid)
    if c.deleted_at is not None:
        raise ApiError(409, "invalid_transition", "This complaint is already deleted.")
    _standalone(c, "delete")
    if c.status not in ("new", "resolved"):
        raise ApiError(409, "invalid_transition", f"Cannot delete a complaint that is {c.status}.")
    try:
        c.deleted_at, c.deleted_reason = utcnow(), body.reason
        db.add(ComplaintEvent(complaint_id=c.id, action="deleted", actor=user.username, note=body.reason))
        db.commit()
    except Exception:
        db.rollback()
        raise ApiError(500, "server_error", "Could not delete the complaint. Nothing was changed.")
    return c


@router.post("/{cid}/restore", response_model=ComplaintOut)
def restore_complaint(cid: int, db: Session = Depends(get_db), user: User = Depends(require_lead)):
    c = _load(db, cid)
    if c.deleted_at is None:
        raise ApiError(409, "invalid_transition", "This complaint is not deleted.")
    if c.incident_id is not None:
        raise ApiError(409, "invalid_transition", f"Restore incident #{c.incident_id} instead; this complaint was deleted with it.")
    c.deleted_at, c.deleted_reason = None, None
    db.add(ComplaintEvent(complaint_id=c.id, action="restored", actor=user.username, note="Restored"))
    db.commit()
    return c


@router.post("/{cid}/reopen", response_model=ComplaintOut)
def reopen_complaint(cid: int, body: ReopenComplaintIn | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _load(db, cid)
    _standalone(c, "reopen")
    if c.status != "resolved":
        raise ApiError(409, "invalid_transition", f"Cannot reopen a complaint that is {c.status}.")
    c.status, c.resolved_at, c.resolution_note, c.customer_message = "new", None, None, None
    db.add(ComplaintEvent(complaint_id=c.id, action="reopened", actor=user.username, note=(body.note if body else "Reopened")))
    db.commit()
    return c
