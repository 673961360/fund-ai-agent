"""Confirmation policy placeholders."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class ConfirmationContext:
    """Input required to construct a future confirmation object."""

    request_id: str
    session_id: str
    trace_id: str
    summary: str


@dataclass(slots=True)
class ConfirmationDraft:
    """Confirmation draft placeholder before persistence or exposure."""

    title: str
    summary: str
    risk_level: str
    approver_id: str | None


class ConfirmationPolicy(Protocol):
    """Protocol for building confirmation placeholders."""

    async def build(self, context: ConfirmationContext) -> ConfirmationDraft:
        """Create a confirmation draft from decision context."""


class UnimplementedConfirmationPolicy:
    """Stage 1 placeholder implementation."""

    async def build(self, context: ConfirmationContext) -> ConfirmationDraft:
        raise NotImplementedError("TODO(stage-2): implement confirmation drafting rules.")

