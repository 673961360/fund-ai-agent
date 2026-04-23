"""Shared HTTP schema placeholders aligned with the Gateway contract."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TraceMetadataSchema(BaseModel):
    """Trace metadata reserved for gateway-level observability."""

    request_id: str | None = Field(default=None, description="Gateway request identifier.")
    trace_id: str | None = Field(default=None, description="Trace identifier for the main chain.")


class AttachmentPlaceholderSchema(BaseModel):
    """Attachment placeholder only. Real upload protocol is intentionally absent."""

    attachment_id: str = Field(description="Attachment identifier.")
    file_name: str = Field(description="Original file name.")
    media_type: str | None = Field(default=None, description="Media type placeholder.")
    file_size_bytes: int | None = Field(default=None, description="File size placeholder.")


class TimestampFieldsSchema(BaseModel):
    """Common timestamp fields for resource models."""

    created_at: datetime = Field(description="Creation timestamp.")
    updated_at: datetime | None = Field(default=None, description="Last update timestamp.")


class ApiErrorSchema(BaseModel):
    """Placeholder API error shape for future alignment."""

    code: str = Field(description="Error code.")
    message: str = Field(description="Human-readable error message.")
    details: dict[str, Any] | None = Field(default=None, description="Optional structured details.")

