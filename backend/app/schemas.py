from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator


def _iso(d: datetime) -> str:
    if d.tzinfo is None:
        return d.isoformat() + "Z"
    return d.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


UTCDatetime = Annotated[datetime, PlainSerializer(_iso, return_type=str)]

Category = Literal["billing", "payment", "login", "delivery", "performance", "bug", "account", "other"]
Sentiment = Literal["positive", "neutral", "negative", "frustrated"]
Urgency = Literal["low", "medium", "high", "critical"]
IncidentStatus = Literal["suggested", "open", "investigating", "resolved", "rejected"]
Confidence = Literal["low", "medium", "high"]

CATEGORIES = ["billing", "payment", "login", "delivery", "performance", "bug", "account", "other"]
SENTIMENTS = ["positive", "neutral", "negative", "frustrated"]
URGENCIES = ["low", "medium", "high", "critical"]


def clean_text(v: str) -> str:
    v = v.replace("\x00", "")
    return " ".join(v.split()) if "\n" not in v else "\n".join(" ".join(line.split()) for line in v.strip().splitlines())


class ComplaintCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=80)
    customer_contact: str | None = Field(default=None, max_length=120)
    text: str = Field(min_length=10, max_length=2000)

    @field_validator("customer_name", "text", mode="before")
    @classmethod
    def _strip_required(cls, v):
        return clean_text(v) if isinstance(v, str) else v

    @field_validator("customer_contact", mode="before")
    @classmethod
    def _strip_contact(cls, v):
        if isinstance(v, str):
            v = clean_text(v)
            return v or None
        return v


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_name: str
    customer_contact: str | None
    text: str
    category: str
    sentiment: str
    urgency: str
    analysis_source: str
    status: str
    incident_id: int | None
    created_at: UTCDatetime
    assigned_team: str | None = None
    resolution_note: str | None = None
    resolved_at: UTCDatetime | None = None
    due_at: UTCDatetime | None = None
    deleted_at: UTCDatetime | None = None
    deleted_reason: str | None = None
    customer_message: str | None = None


class DeleteIn(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class AssignComplaintIn(BaseModel):
    assigned_team: str = Field(min_length=1, max_length=80)
    due_in_minutes: int | None = Field(default=None, ge=1, le=43200)

    @field_validator("assigned_team", mode="before")
    @classmethod
    def _t(cls, v):
        return clean_text(v) if isinstance(v, str) else v


class ResolveComplaintIn(BaseModel):
    resolution_note: str = Field(min_length=3, max_length=500)
    customer_message: str | None = Field(default=None, min_length=3, max_length=500)


class ReopenComplaintIn(BaseModel):
    note: str = Field(default="Reopened", max_length=300)


class Paged[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int


class IncidentSummary(BaseModel):
    id: int
    title: str
    affected_service: str
    status: str
    priority: str
    assigned_team: str | None
    complaint_count: int
    created_at: UTCDatetime
    updated_at: UTCDatetime
    due_at: UTCDatetime | None = None
    deleted_at: UTCDatetime | None = None
    deleted_reason: str | None = None


class EvidenceOut(BaseModel):
    complaint_a: int
    complaint_b: int
    similarity: float
    reason: str


class HypothesisOut(BaseModel):
    text: str
    confidence: Confidence
    cited_complaint_ids: list[int]


class HistoryOut(BaseModel):
    from_status: str | None
    to_status: str
    actor: str
    note: str
    at: UTCDatetime


class IncidentDetail(IncidentSummary):
    summary: str
    shared_symptoms: list[str]
    evidence: list[EvidenceOut]
    hypotheses: list[HypothesisOut]
    suggested_actions: list[str]
    complaints: list[ComplaintOut]
    history: list[HistoryOut]
    new_matching_complaints: int
    resolved_at: UTCDatetime | None


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    username: str
    role: str


class LoginOut(BaseModel):
    access_token: str
    user: UserOut


class ApproveIn(BaseModel):
    assigned_team: str | None = Field(default=None, max_length=80)
    priority: Urgency | None = None
    due_in_minutes: int | None = Field(default=None, ge=1, le=43200)


class RejectIn(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class PatchIn(BaseModel):
    priority: Urgency | None = None
    assigned_team: str | None = Field(default=None, max_length=80)
    status: Literal["investigating"] | None = None
    due_in_minutes: int | None = Field(default=None, ge=1, le=43200)


class ResolveIn(BaseModel):
    resolution_note: str = Field(min_length=3, max_length=500)
    customer_message: str | None = Field(default=None, min_length=3, max_length=500)


class ReopenIn(BaseModel):
    note: str = Field(default="Reopened", max_length=300)
