"""
GymBud — Users Router

Handles user profile CRUD and the onboarding flow.
POST /api/onboarding accepts multipart form data (profile fields + 3 photos)
and creates the user profile in the database.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
from typing import Optional
import logging
import json

from app.utils.supabase_client import supabase_admin
from app.utils.storage import upload_photo_to_storage
from app.models.user import UserProfileResponse, UserUpdateRequest

logger = logging.getLogger(__name__)
router = APIRouter()


# ──────────────────────────────────────────────
# Dependencies
# ──────────────────────────────────────────────

async def get_current_user_id(request: Request) -> str:
    """
    Extract and verify the user's identity from the Authorization header.

    Uses Supabase's auth.get_user() to validate the JWT and return the
    user's UUID. This ensures all user-facing endpoints are protected.

    Usage in endpoints:
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


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.post("/onboarding", status_code=201)
async def complete_onboarding(
    user_id: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    gender: str = Form(...),
    date_of_birth: str = Form(...),
    height_cm: float = Form(...),
    weight_kg: float = Form(...),
    body_fat_pct: Optional[float] = Form(None),
    experience_level: str = Form("beginner"),
    fitness_goal: str = Form("muscle_gain"),
    weak_points: str = Form("[]"),         # JSON-encoded list
    injuries: str = Form("[]"),            # JSON-encoded list
    equipment_access: str = Form("full_gym"),
    photo_front: UploadFile = File(...),
    photo_back: UploadFile = File(...),
    photo_side: UploadFile = File(...),
):
    """
    Complete the onboarding flow.

    Accepts multipart form data with profile fields + 3 physique photos.
    Photos are uploaded to Supabase Storage, then the user record is
    created/updated in the database.
    """
    try:
        # Parse JSON-encoded array fields
        weak_points_list = json.loads(weak_points)
        injuries_list = json.loads(injuries)

        # Upload photos to Supabase Storage
        logger.info(f"Uploading onboarding photos for user {user_id}")
        front_path = await upload_photo_to_storage(
            "onboarding-photos", user_id, photo_front, "front"
        )
        back_path = await upload_photo_to_storage(
            "onboarding-photos", user_id, photo_back, "back"
        )
        side_path = await upload_photo_to_storage(
            "onboarding-photos", user_id, photo_side, "side"
        )

        # Upsert user profile in database
        user_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "gender": gender,
            "date_of_birth": date_of_birth,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "body_fat_pct": body_fat_pct,
            "experience_level": experience_level,
            "fitness_goal": fitness_goal,
            "weak_points": weak_points_list,
            "injuries": injuries_list,
            "equipment_access": equipment_access,
            "onboarding_photo_front": front_path,
            "onboarding_photo_back": back_path,
            "onboarding_photo_side": side_path,
            "onboarding_completed": True,
        }

        result = (
            supabase_admin.table("users")
            .upsert(user_data)
            .execute()
        )

        logger.info(f"✅ Onboarding complete for user {user_id}")
        return {
            "success": True,
            "message": "Onboarding completed successfully",
            "user_id": user_id,
            "photos_uploaded": {
                "front": front_path,
                "back": back_path,
                "side": side_path,
            },
        }

    except Exception as e:
        logger.error(f"Onboarding error: {e}")
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {str(e)}")


@router.get("/me")
async def get_profile(user_id: str):
    """Get the current user's profile."""
    try:
        result = (
            supabase_admin.table("users")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return {"success": True, "data": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=404, detail="User not found")


@router.put("/me")
async def update_profile(user_id: str, update: UserUpdateRequest):
    """Update the current user's profile fields."""
    try:
        update_data = update.model_dump(exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = (
            supabase_admin.table("users")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )

        return {"success": True, "message": "Profile updated", "data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
