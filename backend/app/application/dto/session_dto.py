"""Application DTO placeholders for session data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

SessionStatus = Literal["active", "archived"]


@dataclass(slots=True)
class SessionDTO:
    """Session DTO aligned with the Gateway contract."""

    id: str
    title: str | None
    status: SessionStatus
    last_message_preview: str | None
    created_at: datetime
    updated_at: datetime | None

