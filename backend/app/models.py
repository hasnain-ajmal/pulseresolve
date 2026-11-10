from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    """Naive UTC timestamp (SQLite drops tzinfo; the API serialises with a trailing Z)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="agent")


class Complaint(Base):
    __tablename__ = "complaints"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(80))
    customer_contact: Mapped[str | None] = mapped_column(String(120), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    text_hash: Mapped[str] = mapped_column(String(64), index=True)
    category: Mapped[str] = mapped_column(String(20), default="other")
    sentiment: Mapped[str] = mapped_column(String(20), default="neutral")
    urgency: Mapped[str] = mapped_column(String(20), default="medium")
    symptoms: Mapped[list] = mapped_column(JSON, default=list)
    affected_service: Mapped[str] = mapped_column(String(60), default="General")
    language: Mapped[str] = mapped_column(String(12), default="en")
    analysis_source: Mapped[str] = mapped_column(String(12), default="fallback")
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="new", index=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    affected_service: Mapped[str] = mapped_column(String(60), default="General")
    status: Mapped[str] = mapped_column(String(20), default="suggested", index=True)
    priority: Mapped[str] = mapped_column(String(12), default="medium")
    assigned_team: Mapped[str | None] = mapped_column(String(80), nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    summary_stale: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_symptoms: Mapped[list] = mapped_column(JSON, default=list)
    hypotheses: Mapped[list] = mapped_column(JSON, default=list)
    suggested_actions: Mapped[list] = mapped_column(JSON, default=list)
    citations_stripped: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    complaint_a: Mapped[int] = mapped_column(ForeignKey("complaints.id"))
    complaint_b: Mapped[int] = mapped_column(ForeignKey("complaints.id"))
    similarity: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(String(300), default="")


class IncidentEvent(Base):
    """Append-only status history."""

    __tablename__ = "incident_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20))
    actor: Mapped[str] = mapped_column(String(50))
    note: Mapped[str] = mapped_column(String(500), default="")
    at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class MembershipLog(Base):
    """Append-only: every membership change is an explicit, logged event."""

    __tablename__ = "membership_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    action: Mapped[str] = mapped_column(String(24))  # attached, detached, recurrence_flagged, folded_in
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    actor: Mapped[str] = mapped_column(String(50), default="system")
    at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PairBlock(Base):
    """Pairs a human rejected together; never suggested again."""

    __tablename__ = "pair_blocks"
    complaint_a: Mapped[int] = mapped_column(ForeignKey("complaints.id"), primary_key=True)
    complaint_b: Mapped[int] = mapped_column(ForeignKey("complaints.id"), primary_key=True)
