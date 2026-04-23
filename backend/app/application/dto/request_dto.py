"""Application DTO placeholders for request data."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

RequestStatus = Literal[
    "accepted",
    "streaming",
    "waiting_confirmation",
    "completed",
    "failed",
    "cancelled",
]


@dataclass(slots=True)
class CreateRequestDTO:
    """DTO for creating a gateway request."""

    session_id: str | None
    content: str
    attachments: list[dict[str, Any]] = field(default_factory=list)
    client_context: dict[str, Any] | None = None


@dataclass(slots=True)
class RequestDTO:
    """Request resource DTO."""

    id: str
    session_id: str
    user_message_id: str
    status: RequestStatus
    confirmation_id: str | None
    trace_id: str
    created_at: datetime
    updated_at: datetime | None = None

