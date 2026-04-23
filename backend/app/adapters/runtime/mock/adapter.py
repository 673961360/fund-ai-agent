"""Mock runtime adapter placeholder.

Stage 1 only reserves the adapter shape. No fake streaming or mock logic is implemented.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from ....ports.runtime_adapter import (
    RuntimeAccepted,
    RuntimeAdapter,
    RuntimeCapabilities,
    RuntimeRequest,
    RuntimeStreamEvent,
)


class MockRuntimeAdapter(RuntimeAdapter):
    """Placeholder adapter reserved for stage 3 integration tests."""

    adapter_name = "mock"

    async def submit(self, request: RuntimeRequest) -> RuntimeAccepted:
        raise NotImplementedError("TODO(stage-3): add minimal mock request acceptance only when allowed.")

    async def cancel(self, request_id: str) -> None:
        raise NotImplementedError("TODO(stage-3): add minimal mock cancel behavior only when allowed.")

    async def describe_capabilities(self) -> RuntimeCapabilities:
        raise NotImplementedError("TODO(stage-2): describe mock capabilities without adding runtime logic.")

    def stream(self, request: RuntimeRequest) -> AsyncIterator[RuntimeStreamEvent]:
        raise NotImplementedError("TODO(stage-3): add minimal mock streaming only when allowed.")
