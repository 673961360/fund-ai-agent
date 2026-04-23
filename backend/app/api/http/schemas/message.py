"""HTTP schema placeholders for message resources."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from .common import AttachmentPlaceholderSchema


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class MessageSchema(BaseModel):
    """Gateway-facing message resource placeholder."""

    id: str = Field(description="Message identifier.")
    session_id: str = Field(description="Owning session identifier.")
    request_id: str | None = Field(default=None, description="Source request identifier.")
    role: MessageRole = Field(description="Message role.")
    content: str = Field(description="Plain text content placeholder.")
    attachments: list[AttachmentPlaceholderSchema] = Field(default_factory=list)
    created_at: datetime = Field(description="Creation timestamp.")


class MessageListSchema(BaseModel):
    """Placeholder list response for session messages."""

    items: list[MessageSchema] = Field(default_factory=list)

