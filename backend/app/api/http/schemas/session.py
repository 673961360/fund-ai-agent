"""HTTP schema placeholders for session resources."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class SessionStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class SessionSchema(BaseModel):
    """Gateway-facing session resource placeholder."""

    id: str = Field(description="Session identifier.")
    title: str | None = Field(default=None, description="Session title placeholder.")
    status: SessionStatus = Field(default=SessionStatus.ACTIVE, description="Session status.")
    last_message_preview: str | None = Field(default=None, description="Last message preview.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime | None = Field(default=None, description="Last update timestamp.")


class SessionListSchema(BaseModel):
    """Placeholder list response for sessions."""

    items: list[SessionSchema] = Field(default_factory=list)

