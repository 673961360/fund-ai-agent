"""Application DTO placeholders for message data."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

MessageRole = Literal["user", "assistant", "system", "tool"]


@dataclass(slots=True)
class AttachmentPlaceholderDTO:
    """Attachment DTO placeholder only."""

    attachment_id: str
    file_name: str
    media_type: str | None = None
    file_size_bytes: int | None = None


@dataclass(slots=True)
class MessageDTO:
    """Message DTO aligned with the Gateway contract."""

    id: str
    session_id: str
    request_id: str | None
    role: MessageRole
    content: str
    attachments: list[AttachmentPlaceholderDTO] = field(default_factory=list)
    created_at: datetime | None = None

