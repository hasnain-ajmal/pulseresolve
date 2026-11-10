import csv
import io

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ApiError
from app.models import Complaint, User
from app.schemas import ComplaintCreate, ComplaintOut, Paged
from app.security import get_current_user, rate_limit
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
                    q: str | None = Query(None, max_length=100), db: Session = Depends(get_db),
                    _: User = Depends(get_current_user)):
    query = db.query(Complaint)
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


@router.get("/{cid}", response_model=ComplaintOut)
def get_complaint(cid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.get(Complaint, cid)
    if not c:
        raise ApiError(404, "not_found", "Complaint not found.")
    return c
