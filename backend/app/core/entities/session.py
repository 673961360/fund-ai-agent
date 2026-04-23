"""Core entity placeholders for session data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class SessionStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


@dataclass(slots=True)
class SessionEntity:
    """Domain session entity placeholder."""

    id: str
    title: str | None
    status: SessionStatus
    last_message_preview: str | None
    created_at: datetime
    updated_at: datetime | None = None

