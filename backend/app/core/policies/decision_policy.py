"""Decision policy placeholders.

Business decisions must not be embedded in the runtime adapter or frontend.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(slots=True)
class DecisionContext:
    """Input context for future business decision evaluation."""

    request_id: str
    session_id: str
    user_message: str
    trace_id: str


@dataclass(slots=True)
class DecisionOutcome:
    """Decision result placeholder."""

    allow_execution: bool
    requires_confirmation: bool
    should_start_workflow: bool
    notes: tuple[str, ...] = field(default_factory=tuple)


class DecisionPolicy(Protocol):
    """Policy protocol reserved for future rule implementations."""

    async def evaluate(self, context: DecisionContext) -> DecisionOutcome:
        """Evaluate a request context and return a decision outcome."""


class UnimplementedDecisionPolicy:
    """Stage 1 placeholder implementation."""

    async def evaluate(self, context: DecisionContext) -> DecisionOutcome:
        raise NotImplementedError("TODO(stage-2): implement decision rules without leaking into runtime.")

