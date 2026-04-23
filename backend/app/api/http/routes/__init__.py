"""Stage 2 HTTP route placeholders.

Only 501 route skeletons are exposed in this stage.
"""

from __future__ import annotations

from typing import Any

from . import confirmations, requests, sessions


def mount_routes(app: Any) -> None:
    """Mount placeholder route modules on a FastAPI-compatible app."""

    app.include_router(sessions.router)
    app.include_router(requests.router)
    app.include_router(confirmations.router)


__all__ = ("confirmations", "mount_routes", "requests", "sessions")
