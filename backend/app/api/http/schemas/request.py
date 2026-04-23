"""HTTP schema placeholders for request resources."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from .common import AttachmentPlaceholderSchema


class RequestStatus(StrEnum):
    ACCEPTED = "accepted"
    STREAMING = "streaming"
    WAITING_CONFIRMATION = "waiting_confirmation"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CreateRequestSchema(BaseModel):
    """Input payload placeholder for POST /requests."""

    session_id: str | None = Field(default=None, description="Nullable for new session creation.")
    content: str = Field(description="User input content.")
    attachments: list[AttachmentPlaceholderSchema] = Field(default_factory=list)
    client_context: dict[str, Any] | None = Field(default=None, description="Frontend context placeholder.")


class RequestSchema(BaseModel):
    """Gateway-facing request resource placeholder."""

    id: str = Field(description="Request identifier.")
    session_id: str = Field(description="Owning session identifier.")
    user_message_id: str = Field(description="Identifier of the user message.")
    status: RequestStatus = Field(description="Request status.")
    confirmation_id: str | None = Field(default=None, description="Linked confirmation identifier.")
    trace_id: str = Field(description="Trace identifier.")
    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime | None = Field(default=None, description="Last update timestamp.")

