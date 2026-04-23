"""Mock workflow adapter placeholder.

Stage 2 only reserves the adapter shape. No workflow execution logic is implemented.
"""

from __future__ import annotations

from typing import Any

from ...ports.workflow_adapter import WorkflowAdapter, WorkflowStatusSnapshot, WorkflowTicket


class MockWorkflowAdapter(WorkflowAdapter):
    """Placeholder workflow adapter reserved for later mock integration."""

    async def start(self, ticket: WorkflowTicket) -> WorkflowStatusSnapshot:
        raise NotImplementedError("TODO(stage-3): add minimal mock workflow start only when allowed.")

    async def resume(
        self,
        workflow_id: str,
        payload: dict[str, Any] | None = None,
    ) -> WorkflowStatusSnapshot:
        raise NotImplementedError("TODO(stage-3): add minimal mock workflow resume only when allowed.")

    async def cancel(
        self,
        workflow_id: str,
        reason: str | None = None,
    ) -> WorkflowStatusSnapshot:
        raise NotImplementedError("TODO(stage-3): add minimal mock workflow cancel only when allowed.")

    async def get_status(self, workflow_id: str) -> WorkflowStatusSnapshot:
        raise NotImplementedError("TODO(stage-3): add minimal mock workflow status only when allowed.")
