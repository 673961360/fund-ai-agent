"""Core entity placeholders for message data."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


@dataclass(slots=True)
class AttachmentPlaceholder:
    """Attachment placeholder entity.

    Real upload and storage protocol are deferred.
    """

    attachment_id: str
    file_name: str
    media_type: str | None = None
    file_size_bytes: int | None = None


@dataclass(slots=True)
class MessageEntity:
    """Domain message entity placeholder."""

    id: str
    session_id: str
    request_id: str | None
    role: MessageRole
    content: str
    attachments: list[AttachmentPlaceholder] = field(default_factory=list)
    created_at: datetime | None = None

