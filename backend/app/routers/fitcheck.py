"""
GymBud — Fitcheck Router

Handles daily physique photo uploads, AI analysis, and album retrieval.
Photos are stored in Supabase Storage bucket 'fitcheck-photos'.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import date
from io import BytesIO
import logging
import httpx
from PIL import Image

from app.utils.supabase_client import supabase_admin
from app.utils.storage import upload_photo_to_storage
from app.services.gemini_service import analyze_daily_fitcheck

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", status_code=201)
async def upload_fitcheck(
    user_id: str = Form(...),
    pose: str = Form("front_relaxed"),
    weight_kg: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    photo: UploadFile = File(...),
):
    """
    Upload a daily physique check-in photo.

    Flow:
    1. Upload photo to Supabase Storage
    2. Open as PIL Image for Gemini analysis
    3. Send to Gemini for AI fitcheck analysis
    4. Store metadata + analysis in fitcheck_photos table
    """
    try:
        today = date.today().isoformat()

        # 1. Upload to Supabase Storage
        storage_path = await upload_photo_to_storage(
            bucket="fitcheck-photos",
            user_id=user_id,
            file=photo,
            subfolder=today,
        )
        logger.info(f"Photo uploaded: {storage_path}")

        # 2. Read photo bytes for AI analysis
        await photo.seek(0)
        photo_bytes = await photo.read()
        current_image = Image.open(BytesIO(photo_bytes))

        # 3. Get user context for AI
        user_result = (
            supabase_admin.table("users")
            .select("fitness_goal, weak_points, experience_level")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        user_context = user_result.data[0] if user_result.data else {}

        # 4. Get previous fitcheck analysis for comparison
        prev_result = (
            supabase_admin.table("fitcheck_photos")
            .select("ai_analysis")
            .eq("user_id", user_id)
            .order("photo_date", desc=True)
            .limit(1)
            .execute()
        )
        previous_analysis = (
            prev_result.data[0].get("ai_analysis") if prev_result.data else None
        )

        # 5. Run AI analysis
        ai_analysis = await analyze_daily_fitcheck(
            current_image=current_image,
            user_context=user_context,
            previous_analysis=previous_analysis,
        )

        # 6. Store in database
        record = {
            "user_id": user_id,
            "photo_date": today,
            "photo_url": storage_path,
            "pose": pose,
            "ai_analysis": ai_analysis,
            "weight_kg": weight_kg,
            "notes": notes,
        }

        insert_result = (
            supabase_admin.table("fitcheck_photos")
            .insert(record)
            .execute()
        )

        logger.info(f"✅ Fitcheck saved for user {user_id} ({pose})")

        return {
            "success": True,
            "message": "Fitcheck photo uploaded and analyzed",
            "photo_id": insert_result.data[0]["id"],
            "photo_url": storage_path,
            "ai_analysis": ai_analysis,
        }

    except Exception as e:
        logger.error(f"Fitcheck upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fitcheck upload failed: {str(e)}")


@router.get("/album")
async def get_album(user_id: str, page: int = 1, page_size: int = 20):
    """Get paginated fitcheck photo album, newest first."""
    offset = (page - 1) * page_size

    result = (
        supabase_admin.table("fitcheck_photos")
        .select("*", count="exact")
        .eq("user_id", user_id)
        .order("photo_date", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    return {
        "success": True,
        "photos": result.data,
        "total_count": result.count,
        "page": page,
        "page_size": page_size,
    }


@router.get("/album/{photo_id}")
async def get_photo_detail(photo_id: str, user_id: str):
    """Get a specific fitcheck photo with its AI analysis."""
    try:
        result = (
            supabase_admin.table("fitcheck_photos")
            .select("*")
            .eq("id", photo_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Photo not found")
        return {"success": True, "data": result.data[0]}
    except Exception:
        raise HTTPException(status_code=404, detail="Photo not found")


@router.get("/progress")
async def get_progress_comparison(user_id: str):
    """
    Compare the most recent fitcheck against the first one.
    Returns both entries for client-side visual comparison.
    """
    # Get earliest fitcheck
    first = (
        supabase_admin.table("fitcheck_photos")
        .select("*")
        .eq("user_id", user_id)
        .order("photo_date", desc=False)
        .limit(1)
        .execute()
    )

    # Get latest fitcheck
    latest = (
        supabase_admin.table("fitcheck_photos")
        .select("*")
        .eq("user_id", user_id)
        .order("photo_date", desc=True)
        .limit(1)
        .execute()
    )

    return {
        "success": True,
        "first": first.data[0] if first.data else None,
        "latest": latest.data[0] if latest.data else None,
        "total_fitchecks": len(first.data) + len(latest.data),
    }


@router.get("/timelapse")
async def get_timelapse_photos(user_id: str, pose: str = "front_relaxed"):
    """
    Get all photos for a specific pose in chronological order
    for client-side timelapse animation rendering.
    """
    result = (
        supabase_admin.table("fitcheck_photos")
        .select("id, photo_date, photo_url, weight_kg")
        .eq("user_id", user_id)
        .eq("pose", pose)
        .order("photo_date", desc=False)
        .execute()
    )

    return {
        "success": True,
        "pose": pose,
        "photos": result.data,
        "count": len(result.data),
    }
