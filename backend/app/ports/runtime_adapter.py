"""Runtime adapter port placeholders."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, AsyncIterator, Protocol


@dataclass(slots=True)
class RuntimeMessage:
    """Normalized message placeholder for runtime input."""

    role: str
    content: str


@dataclass(slots=True)
class RuntimeRequest:
    """Normalized runtime request placeholder."""

    request_id: str
    session_id: str
    trace_id: str
    messages: list[RuntimeMessage] = field(default_factory=list)
    attachments: list[dict[str, Any]] = field(default_factory=list)
    runtime_hints: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class RuntimeAccepted:
    """Placeholder acceptance result returned by submit()."""

    request_id: str
    trace_id: str
    adapter_name: str
    accepted_at: datetime


@dataclass(slots=True)
class RuntimeStreamEvent:
    """Placeholder runtime stream event before mapping to Gateway events."""

    request_id: str
    event_type: str
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime | None = None
    trace_id: str | None = None


@dataclass(slots=True)
class RuntimeCapabilities:
    """Capability descriptor for a runtime adapter."""

    adapter_name: str
    supports_streaming: bool
    supports_interrupt: bool
    supports_tools: bool
    notes: tuple[str, ...] = field(default_factory=tuple)


class RuntimeAdapter(Protocol):
    """Uniform runtime adapter contract."""

    adapter_name: str

    async def submit(self, request: RuntimeRequest) -> RuntimeAccepted:
        """Accept a normalized runtime request."""

    def stream(self, request: RuntimeRequest) -> AsyncIterator[RuntimeStreamEvent]:
        """Return a stream placeholder for a normalized runtime request."""

    async def cancel(self, request_id: str) -> None:
        """Cancel a request by identifier."""

    async def describe_capabilities(self) -> RuntimeCapabilities:
        """Describe normalized adapter capabilities."""

