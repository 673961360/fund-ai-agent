"""Core entity placeholders for request data."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any


class RequestStatus(StrEnum):
    ACCEPTED = "accepted"
    STREAMING = "streaming"
    WAITING_CONFIRMATION = "waiting_confirmation"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


@dataclass(slots=True)
class RequestInputEntity:
    """Request input placeholder before gateway execution begins."""

    session_id: str | None
    content: str
    attachments: list[dict[str, Any]] = field(default_factory=list)
    client_context: dict[str, Any] | None = None


@dataclass(slots=True)
class RequestEntity:
    """Domain request entity placeholder."""

    id: str
    session_id: str
    user_message_id: str
    status: RequestStatus
    confirmation_id: str | None
    trace_id: str
    created_at: datetime
    updated_at: datetime | None = None
