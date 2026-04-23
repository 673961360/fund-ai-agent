"""Mock tool gateway placeholder.

Stage 2 only reserves the gateway shape. No tool execution logic is implemented.
"""

from __future__ import annotations

from typing import Any

from ...ports.tool_gateway import ToolCallRequest, ToolCallResult, ToolGateway


class MockToolGateway(ToolGateway):
    """Placeholder tool gateway reserved for later mock integration."""

    async def validate(self, request: ToolCallRequest) -> None:
        raise NotImplementedError("TODO(stage-3): add minimal mock tool validation only when allowed.")

    async def authorize(self, request: ToolCallRequest) -> None:
        raise NotImplementedError("TODO(stage-3): add minimal mock tool authorization only when allowed.")

    async def execute(self, request: ToolCallRequest) -> ToolCallResult:
        raise NotImplementedError("TODO(stage-3): add minimal mock tool execution only when allowed.")

    async def describe_tool(self, tool_name: str) -> dict[str, Any]:
        raise NotImplementedError("TODO(stage-3): add minimal mock tool description only when allowed.")
