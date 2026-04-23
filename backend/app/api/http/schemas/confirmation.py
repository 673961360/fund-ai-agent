"""HTTP schema placeholders for confirmation resources."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class ConfirmationStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ConfirmationRiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ConfirmationSchema(BaseModel):
    """Gateway-facing confirmation resource placeholder."""

    id: str = Field(description="Confirmation identifier.")
    request_id: str = Field(description="Source request identifier.")
    session_id: str = Field(description="Owning session identifier.")
    status: ConfirmationStatus = Field(description="Confirmation status.")
    title: str = Field(description="Confirmation title.")
    summary: str = Field(description="Confirmation summary.")
    risk_level: ConfirmationRiskLevel = Field(description="Risk level placeholder.")
    approver_id: str | None = Field(default=None, description="Approver placeholder.")
    reason: str | None = Field(default=None, description="Decision note.")
    created_at: datetime = Field(description="Creation timestamp.")
    expires_at: datetime | None = Field(default=None, description="Expiration timestamp placeholder.")
    resolved_at: datetime | None = Field(default=None, description="Resolution timestamp placeholder.")


class ApproveConfirmationSchema(BaseModel):
    """Input payload placeholder for approval action."""

    comment: str | None = Field(default=None, description="Approval comment placeholder.")


class RejectConfirmationSchema(BaseModel):
    """Input payload placeholder for rejection action."""

    reason: str = Field(description="Rejection reason.")

