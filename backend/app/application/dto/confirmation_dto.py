"""Application DTO placeholders for confirmation data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

ConfirmationStatus = Literal["pending", "approved", "rejected", "expired", "cancelled"]
ConfirmationRiskLevel = Literal["low", "medium", "high"]


@dataclass(slots=True)
class ConfirmationDTO:
    """Confirmation resource DTO."""

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

