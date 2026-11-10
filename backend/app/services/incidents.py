"""Incident lifecycle: creation, attach, approve/reject, resolve (atomic), reopen, citation validation."""
import logging
from datetime import timedelta
from itertools import combinations

from sqlalchemy.orm import Session

from app.config import settings
from app.errors import ApiError
from app.models import (Complaint, Incident, IncidentEvent, IncidentEvidence, MembershipLog, PairBlock, utcnow)
from app.schemas import (ComplaintOut, EvidenceOut, HistoryOut, HypothesisOut, IncidentDetail, IncidentSummary)
from app.services import ai, fallback

log = logging.getLogger("pulseresolve.incidents")
MEMBER_STATUSES = ("linked", "resolved")
DEFAULT_CUSTOMER_MESSAGE = "Your issue has been resolved. Thank you for your patience."
_URG = {"low": 1, "medium": 2, "high": 3, "critical": 4}
_PRIO = ["low", "medium", "high", "critical"]


# ---- helpers ----------------------------------------------------------------------
def members(db: Session, inc_id: int) -> list[Complaint]:
    return (db.query(Complaint).filter(Complaint.incident_id == inc_id, Complaint.status.in_(MEMBER_STATUSES),
                                       Complaint.deleted_at.is_(None)).order_by(Complaint.id).all())


def compute_priority(ms: list[Complaint]) -> str:
    if not ms:
        return "medium"
    avg = sum(_URG.get(m.urgency, 2) for m in ms) / len(ms)
    frustrated = sum(1 for m in ms if m.sentiment == "frustrated") / len(ms)
    score = avg + (0.5 if frustrated >= 0.5 else 0) + (0.5 if len(ms) >= 5 else 0) + (0.5 if len(ms) >= 8 else 0)
    if score >= 3.6:
        return "critical"
    if score >= 2.8:
        return "high"
    if score >= 1.8:
        return "medium"
    return "low"


def sla_minutes(priority: str) -> int:
    return {"critical": settings.SLA_CRITICAL_MIN, "high": settings.SLA_HIGH_MIN,
            "medium": settings.SLA_MEDIUM_MIN, "low": settings.SLA_LOW_MIN}.get(priority, settings.SLA_MEDIUM_MIN)


def set_deadline(inc: Incident, minutes: int | None = None) -> None:
    """Start the team's clock now. Default length depends on priority (critical gets the least time)."""
    inc.sla_started_at = utcnow()
    inc.due_at = inc.sla_started_at + timedelta(minutes=minutes or sla_minutes(inc.priority))


def _event(db: Session, inc: Incident, frm: str | None, to: str, actor: str, note: str = "") -> None:
    db.add(IncidentEvent(incident_id=inc.id, from_status=frm, to_status=to, actor=actor, note=note[:500]))


def validate_citations(hypotheses: list[dict], member_ids: set[int]) -> tuple[list[dict], int]:
    """Keep only cited ids that exist in this incident; drop hypotheses left with no valid citation."""
    clean, stripped = [], 0
    for h in hypotheses:
        cited = [i for i in h.get("cited_complaint_ids", []) if isinstance(i, int) and i in member_ids]
        stripped += len(h.get("cited_complaint_ids", [])) - len(cited)
        if cited:
            clean.append({"text": h["text"], "confidence": h.get("confidence", "low"), "cited_complaint_ids": sorted(set(cited))})
        else:
            stripped += 1
    return clean, stripped


def build_content(ms: list[Complaint]) -> tuple[dict, int]:
    """AI content when available (validated), else deterministic fallback. Returns (content, citations_stripped)."""
    mdicts = [{"id": m.id, "text": m.text, "category": m.category, "symptoms": m.symptoms or [],
               "affected_service": m.affected_service} for m in ms]
    ids = {m.id for m in ms}
    content = None
    if ai.available():
        try:
            out = ai.summarize_incident(mdicts)
            content = out.model_dump()
        except Exception:
            log.info("AI summary unavailable, using the template", exc_info=True)
            content = None
    if content is None:
        content = fallback.fallback_incident(mdicts)
    hyps, stripped = validate_citations(content.get("hypotheses", []), ids)
    if not hyps:
        hyps = fallback.fallback_incident(mdicts)["hypotheses"]
    content["hypotheses"] = hyps
    return content, stripped


def _apply_content(inc: Incident, content: dict, stripped: int) -> None:
    inc.title = content["title"][:160]
    inc.affected_service = content["affected_service"][:60]
    inc.summary = content["summary"]
    inc.shared_symptoms = content.get("shared_symptoms", [])
    inc.hypotheses = content["hypotheses"]
    inc.suggested_actions = content.get("suggested_actions", [])
    inc.citations_stripped = (inc.citations_stripped or 0) + stripped
    inc.summary_stale = False
    inc.updated_at = utcnow()


def refresh_summary(db: Session, inc: Incident) -> None:
    ms = members(db, inc.id)
    if not ms:
        return
    content, stripped = build_content(ms)
    _apply_content(inc, content, stripped)
    db.flush()


# ---- creation / membership ------------------------------------------------------------
def _evidence(db: Session, inc: Incident, ev: list[tuple]) -> None:
    for a, b, sim, reason in ev:
        db.add(IncidentEvidence(incident_id=inc.id, complaint_a=a, complaint_b=b, similarity=round(float(sim), 3), reason=reason[:300]))


def create_incident(db: Session, ms: list[Complaint], ev: list[tuple], actor: str = "system") -> Incident:
    content, stripped = build_content(ms)
    inc = Incident(title="pending", status="suggested", priority=compute_priority(ms))
    db.add(inc)
    db.flush()
    _apply_content(inc, content, stripped)
    for m in ms:
        m.incident_id, m.status = inc.id, "linked"
        db.add(MembershipLog(complaint_id=m.id, incident_id=inc.id, action="attached", actor=actor))
    _evidence(db, inc, ev)
    _event(db, inc, None, "suggested", actor, f"Created from {len(ms)} related complaints")
    db.flush()
    return inc


def attach_complaint(db: Session, inc: Incident, c: Complaint, score: float, ev: list[tuple], actor: str = "system") -> None:
    c.incident_id, c.status = inc.id, "linked"
    db.add(MembershipLog(complaint_id=c.id, incident_id=inc.id, action="attached", score=round(score, 3), actor=actor))
    _evidence(db, inc, ev)
    if inc.status == "suggested":
        inc.priority = compute_priority(members(db, inc.id) + [c])
    inc.summary_stale = True
    inc.updated_at = utcnow()
    db.flush()


def flag_recurrence(db: Session, inc: Incident, c: Complaint, score: float, ev: list[tuple]) -> None:
    c.incident_id, c.status = inc.id, "possible_recurrence"
    db.add(MembershipLog(complaint_id=c.id, incident_id=inc.id, action="recurrence_flagged", score=round(score, 3), actor="system"))
    _evidence(db, inc, ev)
    inc.updated_at = utcnow()
    db.flush()


# ---- lifecycle -------------------------------------------------------------------------
def _need(inc: Incident, allowed: tuple[str, ...], action: str) -> None:
    if inc.status not in allowed:
        raise ApiError(409, "invalid_transition", f"Cannot {action} an incident that is {inc.status}.")


def approve(db: Session, inc: Incident, actor: str, team: str | None, priority: str | None, due_in_minutes: int | None = None) -> None:
    _need(inc, ("suggested",), "approve")
    frm = inc.status
    inc.status = "open"
    if team:
        inc.assigned_team = team
    if priority:
        inc.priority = priority
    set_deadline(inc, due_in_minutes)
    inc.updated_at = utcnow()
    _event(db, inc, frm, "open", actor, "Approved by staff")
    db.commit()


def reject(db: Session, inc: Incident, actor: str, reason: str) -> None:
    _need(inc, ("suggested",), "reject")
    ms = members(db, inc.id)
    ids = sorted(m.id for m in ms)
    for a, b in combinations(ids, 2):
        if not db.get(PairBlock, (a, b)):
            db.add(PairBlock(complaint_a=a, complaint_b=b))
    for m in ms:
        m.incident_id, m.status = None, "new"
        db.add(MembershipLog(complaint_id=m.id, incident_id=inc.id, action="detached", actor=actor))
    inc.status = "rejected"
    inc.updated_at = utcnow()
    _event(db, inc, "suggested", "rejected", actor, reason)
    db.commit()


def update(db: Session, inc: Incident, actor: str, priority: str | None, team: str | None, status: str | None,
           due_in_minutes: int | None = None) -> None:
    _need(inc, ("suggested", "open", "investigating"), "edit")
    if status == "investigating":
        _need(inc, ("open",), "mark investigating")
        inc.status = "investigating"
        _event(db, inc, "open", "investigating", actor, "Investigation started")
    if priority and priority != inc.priority:
        inc.priority = priority
        if inc.sla_started_at and not due_in_minutes:  # same start, new allowance for the new priority
            inc.due_at = inc.sla_started_at + timedelta(minutes=sla_minutes(priority))
    if due_in_minutes and inc.status in ("open", "investigating"):
        set_deadline(inc, due_in_minutes)
    if team is not None:
        inc.assigned_team = team or None
    inc.updated_at = utcnow()
    db.commit()


def resolve(db: Session, inc: Incident, actor: str, note: str, customer_message: str | None = None) -> None:
    """Atomic: the incident and every linked complaint change together, or nothing changes."""
    _need(inc, ("open", "investigating"), "resolve")
    try:
        frm = inc.status
        linked = db.query(Complaint).filter(Complaint.incident_id == inc.id, Complaint.status == "linked").all()
        stamp = utcnow()
        for c in linked:
            c.status = "resolved"
            c.customer_message = customer_message or DEFAULT_CUSTOMER_MESSAGE
            c.resolved_at = stamp
        inc.status = "resolved"
        inc.resolved_at = inc.updated_at = utcnow()
        _event(db, inc, frm, "resolved", actor, f"{note} ({len(linked)} complaints updated)")
        db.commit()
    except Exception:
        db.rollback()
        log.exception("resolve failed, rolled back")
        raise ApiError(500, "server_error", "Could not resolve the incident. Nothing was changed.")


def reopen(db: Session, inc: Incident, actor: str, note: str) -> None:
    _need(inc, ("resolved",), "reopen")
    try:
        for c in db.query(Complaint).filter(Complaint.incident_id == inc.id, Complaint.status == "resolved").all():
            c.status = "linked"
            c.customer_message, c.resolved_at = None, None
        for c in db.query(Complaint).filter(Complaint.incident_id == inc.id, Complaint.status == "possible_recurrence").all():
            c.status = "linked"
            db.add(MembershipLog(complaint_id=c.id, incident_id=inc.id, action="folded_in", actor=actor))
        inc.status = "open"
        inc.resolved_at = None
        set_deadline(inc)
        inc.summary_stale = True
        inc.updated_at = utcnow()
        _event(db, inc, "resolved", "open", actor, note)
        db.commit()
    except Exception:
        db.rollback()
        log.exception("reopen failed, rolled back")
        raise ApiError(500, "server_error", "Could not reopen the incident. Nothing was changed.")


def delete(db: Session, inc: Incident, actor: str, reason: str) -> None:
    """Soft delete a finished incident and the complaints that belong to it. Nothing is removed from the database."""
    if inc.deleted_at is not None:
        raise ApiError(409, "invalid_transition", "This incident is already deleted.")
    _need(inc, ("resolved", "rejected"), "delete")
    try:
        stamp = utcnow()
        inc.deleted_at, inc.deleted_reason, inc.updated_at = stamp, reason, stamp
        for c in db.query(Complaint).filter(Complaint.incident_id == inc.id, Complaint.deleted_at.is_(None)).all():
            c.deleted_at, c.deleted_reason = stamp, f"Deleted with incident #{inc.id}: {reason}"[:300]
        _event(db, inc, inc.status, "deleted", actor, reason)
        db.commit()
    except Exception:
        db.rollback()
        log.exception("delete failed, rolled back")
        raise ApiError(500, "server_error", "Could not delete the incident. Nothing was changed.")


def restore(db: Session, inc: Incident, actor: str) -> None:
    if inc.deleted_at is None:
        raise ApiError(409, "invalid_transition", "This incident is not deleted.")
    try:
        stamp = inc.deleted_at
        for c in db.query(Complaint).filter(Complaint.incident_id == inc.id, Complaint.deleted_at == stamp).all():
            c.deleted_at, c.deleted_reason = None, None
        inc.deleted_at, inc.deleted_reason, inc.updated_at = None, None, utcnow()
        _event(db, inc, "deleted", inc.status, actor, "Restored")
        db.commit()
    except Exception:
        db.rollback()
        log.exception("restore failed, rolled back")
        raise ApiError(500, "server_error", "Could not restore the incident. Nothing was changed.")


# ---- views ---------------------------------------------------------------------------------
def to_summary(db: Session, inc: Incident) -> IncidentSummary:
    n = db.query(Complaint).filter(Complaint.incident_id == inc.id, Complaint.status.in_(MEMBER_STATUSES),
                                   Complaint.deleted_at.is_(None)).count()
    return IncidentSummary(id=inc.id, title=inc.title, affected_service=inc.affected_service, status=inc.status,
                           priority=inc.priority, assigned_team=inc.assigned_team, complaint_count=n,
                           created_at=inc.created_at, updated_at=inc.updated_at, due_at=inc.due_at,
                           deleted_at=inc.deleted_at, deleted_reason=inc.deleted_reason)


def to_detail(db: Session, inc: Incident) -> IncidentDetail:
    if inc.summary_stale and inc.status in ("suggested", "open", "investigating"):
        refresh_summary(db, inc)
        db.commit()
    base = to_summary(db, inc)
    cs = db.query(Complaint).filter(Complaint.incident_id == inc.id).order_by(Complaint.id).all()
    ev = db.query(IncidentEvidence).filter(IncidentEvidence.incident_id == inc.id).order_by(IncidentEvidence.id).all()
    hist = db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc.id).order_by(IncidentEvent.id).all()
    return IncidentDetail(
        **base.model_dump(),
        summary=inc.summary,
        shared_symptoms=inc.shared_symptoms or [],
        evidence=[EvidenceOut(complaint_a=e.complaint_a, complaint_b=e.complaint_b, similarity=e.similarity, reason=e.reason) for e in ev],
        hypotheses=[HypothesisOut(**h) for h in (inc.hypotheses or [])],
        suggested_actions=inc.suggested_actions or [],
        complaints=[ComplaintOut.model_validate(c) for c in cs],
        history=[HistoryOut(from_status=h.from_status, to_status=h.to_status, actor=h.actor, note=h.note, at=h.at) for h in hist],
        new_matching_complaints=sum(1 for c in cs if c.status == "possible_recurrence"),
        resolved_at=inc.resolved_at,
    )
