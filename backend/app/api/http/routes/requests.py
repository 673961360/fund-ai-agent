"""Request route skeletons.

Stage 2 only exposes HTTP path placeholders. No real handlers are implemented.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..schemas.request import CreateRequestSchema

router = APIRouter(tags=["requests"])


def _not_implemented() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="TODO(stage-3): implement request route behavior.",
    )


@router.post("/requests")
async def create_request(payload: CreateRequestSchema) -> None:
    raise _not_implemented()


@router.get("/requests/{request_id}")
async def get_request(request_id: str) -> None:
    raise _not_implemented()


@router.get("/requests/{request_id}/events")
async def list_request_events(request_id: str) -> None:
    raise _not_implemented()
