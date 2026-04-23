"""Workflow adapter port placeholders."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any, Protocol


class WorkflowStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_INPUT = "waiting_input"
    WAITING_CONFIRMATION = "waiting_confirmation"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass(slots=True)
class WorkflowTicket:
    """Placeholder ticket used to start a workflow."""

    workflow_id: str
    request_id: str
    session_id: str
    workflow_type: str
    status: WorkflowStatus
    trace_id: str
    created_at: datetime
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class WorkflowStatusSnapshot:
    """Placeholder workflow status snapshot."""

    workflow_id: str
    status: WorkflowStatus
    trace_id: str
    updated_at: datetime | None = None


class WorkflowAdapter(Protocol):
    """Uniform workflow adapter contract."""

    async def start(self, ticket: WorkflowTicket) -> WorkflowStatusSnapshot:
        """Start a workflow placeholder."""

    async def resume(self, workflow_id: str, payload: dict[str, Any] | None = None) -> WorkflowStatusSnapshot:
        """Resume a workflow placeholder."""

    async def cancel(self, workflow_id: str, reason: str | None = None) -> WorkflowStatusSnapshot:
        """Cancel a workflow placeholder."""

    async def get_status(self, workflow_id: str) -> WorkflowStatusSnapshot:
        """Get workflow status placeholder."""

