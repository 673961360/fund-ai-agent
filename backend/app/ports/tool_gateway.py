"""Tool gateway port placeholders."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol


@dataclass(slots=True)
class ToolCallRequest:
    """Normalized tool call request placeholder."""

    tool_call_id: str
    tool_name: str
    arguments: dict[str, Any] = field(default_factory=dict)
    caller: str = "runtime"
    request_id: str | None = None
    trace_id: str | None = None
    confirmation_id: str | None = None
    workflow_id: str | None = None
    timeout_ms: int | None = None
    idempotency_key: str | None = None


@dataclass(slots=True)
class ToolError:
    """Normalized tool error placeholder."""

    code: str
    message: str
    retryable: bool = False
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ToolCallResult:
    """Normalized tool call result placeholder."""

    tool_call_id: str
    tool_name: str
    success: bool
    output: dict[str, Any] = field(default_factory=dict)
    error: ToolError | None = None
    trace_id: str | None = None
    finished_at: datetime | None = None


class ToolGateway(Protocol):
    """Uniform tool gateway contract."""

    async def validate(self, request: ToolCallRequest) -> None:
        """Validate a tool request placeholder."""

    async def authorize(self, request: ToolCallRequest) -> None:
        """Authorize a tool request placeholder."""

    async def execute(self, request: ToolCallRequest) -> ToolCallResult:
        """Execute a tool request placeholder."""

    async def describe_tool(self, tool_name: str) -> dict[str, Any]:
        """Describe a tool placeholder."""
