"""
GymBud — Auth Router

Handles user registration and login via Supabase Auth.
On signup, a matching row is created in public.users so that
foreign-key-dependent tables (daily_logs, generated_programs, etc.) work.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.utils.supabase_client import supabase_client, supabase_admin
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ──────────────────────────────────────────────
# Request / Response Schemas
# ──────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str
    full_name: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest):
    """
    Create a new account via Supabase Auth AND insert a row into public.users.

    This two-step process ensures:
    1. Supabase Auth handles password hashing, JWT issuance, email verification
    2. public.users has the profile row needed by all FK-dependent tables
    """
    try:
        # Step 1: Create auth user
        result = supabase_client.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {
                "data": {"full_name": req.full_name},
            },
        })

        if not result.user:
            raise HTTPException(status_code=400, detail="Signup failed — user may already exist")

        # Step 2: Create matching row in public.users (bypasses RLS with admin client)
        try:
            supabase_admin.table("users").upsert({
                "id": result.user.id,
                "email": req.email,
                "full_name": req.full_name,
            }).execute()
            logger.info(f"✅ Created public.users row for {result.user.id}")
        except Exception as db_err:
            logger.error(f"Failed to create public.users row: {db_err}")
            # Don't fail the signup — the auth user exists, profile can be created later

        # Step 3: Return tokens (or empty strings if email confirmation is on)
        if not result.session:
            return TokenResponse(
                access_token="",
                refresh_token="",
                user_id=result.user.id,
                email=result.user.email or req.email,
                full_name=req.full_name,
            )

        return TokenResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token,
            user_id=result.user.id,
            email=result.user.email or req.email,
            full_name=req.full_name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """
    Login with email/password and receive JWT tokens.
    Also fetches the user's full_name from public.users.
    """
    try:
        result = supabase_client.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        # Fetch profile from public.users for display name
        full_name = req.email.split("@")[0]  # fallback
        try:
            profile = (
                supabase_admin.table("users")
                .select("full_name")
                .eq("id", result.user.id)
                .limit(1)
                .execute()
            )
            if profile.data:
                full_name = profile.data[0].get("full_name", full_name)
        except Exception:
            pass  # Non-critical — use fallback

        return TokenResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token,
            user_id=result.user.id,
            email=result.user.email or req.email,
            full_name=full_name,
        )

    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest):
    """Refresh an expired access token."""
    try:
        result = supabase_client.auth.refresh_session(req.refresh_token)

        return TokenResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token,
            user_id=result.user.id,
            email=result.user.email,
        )

    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    """Sign out and invalidate the current session."""
    try:
        supabase_client.auth.sign_out()
    except Exception as e:
        logger.warning(f"Logout error (non-critical): {e}")
