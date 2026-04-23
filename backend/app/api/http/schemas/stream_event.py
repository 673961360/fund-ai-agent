"""HTTP schema placeholders for SSE stream events."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class StreamEventType(StrEnum):
    MESSAGE_DELTA = "message.delta"
    MESSAGE_COMPLETED = "message.completed"
    CONFIRMATION_CREATED = "confirmation.created"
    REQUEST_COMPLETED = "request.completed"
    REQUEST_FAILED = "request.failed"
    TRACE_NOTICE = "trace.notice"


class StreamEventSchema(BaseModel):
    """Gateway stream event placeholder.

    Stage 1 only fixes the event fields and naming. No real SSE handler exists.
    """

    request_id: str = Field(description="Owning request identifier.")
    event_id: str = Field(description="Event identifier.")
    event_type: StreamEventType | str = Field(description="Event type.")
    timestamp: datetime = Field(description="Event timestamp.")
    payload: dict[str, Any] = Field(default_factory=dict, description="Event payload placeholder.")
    trace_id: str = Field(description="Trace identifier.")

