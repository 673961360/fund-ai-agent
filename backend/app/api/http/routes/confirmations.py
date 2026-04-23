"""Confirmation route skeletons.

Stage 2 only exposes HTTP path placeholders. No real handlers are implemented.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..schemas.confirmation import ApproveConfirmationSchema, RejectConfirmationSchema

router = APIRouter(tags=["confirmations"])


def _not_implemented() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="TODO(stage-3): implement confirmation route behavior.",
    )


@router.get("/confirmations/{confirmation_id}")
async def get_confirmation(confirmation_id: str) -> None:
    raise _not_implemented()


@router.post("/confirmations/{confirmation_id}/approve")
async def approve_confirmation(
    confirmation_id: str,
    payload: ApproveConfirmationSchema,
) -> None:
    raise _not_implemented()


@router.post("/confirmations/{confirmation_id}/reject")
async def reject_confirmation(
    confirmation_id: str,
    payload: RejectConfirmationSchema,
) -> None:
    raise _not_implemented()


@router.post("/confirmations")
async def create_confirmation_placeholder() -> None:
    raise _not_implemented()
