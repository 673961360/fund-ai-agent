"""Core entity placeholders for confirmation data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


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


@dataclass(slots=True)
class ConfirmationEntity:
    """Domain confirmation entity placeholder."""

    id: str
    request_id: str
    session_id: str
    status: ConfirmationStatus
    title: str
    summary: str
    risk_level: ConfirmationRiskLevel
    approver_id: str | None
    reason: str | None
    created_at: datetime
    expires_at: datetime | None = None
    resolved_at: datetime | None = None

