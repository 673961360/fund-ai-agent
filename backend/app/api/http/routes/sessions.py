"""Session route skeletons.

Stage 2 only exposes HTTP path placeholders. No real handlers are implemented.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter(tags=["sessions"])


def _not_implemented() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="TODO(stage-3): implement session route behavior.",
    )


@router.get("/sessions")
async def list_sessions() -> None:
    raise _not_implemented()


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> None:
    raise _not_implemented()


@router.get("/sessions/{session_id}/messages")
async def list_session_messages(session_id: str) -> None:
    raise _not_implemented()
