"""
GymBud Backend — Shared Dependencies

Provides reusable FastAPI dependencies used across all routers.
The primary dependency is `get_current_user_id` which extracts
and validates the user's identity from the Authorization JWT.
"""

from fastapi import HTTPException, Request
import logging

from app.utils.supabase_client import supabase_admin

logger = logging.getLogger(__name__)


async def get_current_user_id(request: Request) -> str:
    """
    Extract and verify the user's identity from the Authorization header.

    Uses Supabase's auth.get_user() to validate the JWT and return the
    user's UUID. This ensures all user-facing endpoints are protected.

    Usage in any router:
        from app.dependencies import get_current_user_id

        @router.get("/me")
        async def get_profile(user_id: str = Depends(get_current_user_id)):
            ...
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Expected: Bearer <token>",
        )

    token = auth_header.replace("Bearer ", "")

    try:
        # Verify the JWT with Supabase Auth and extract the user
        user_response = supabase_admin.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user_response.user.id

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
