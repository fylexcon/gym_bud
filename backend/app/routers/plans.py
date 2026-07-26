"""
GymBud — Plans Router

Handles AI-powered workout plan generation, retrieval, and adaptation.
POST /generate is the core endpoint that calls Gemini 1.5 Flash.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging
import httpx
from io import BytesIO
from PIL import Image

from app.utils.supabase_client import supabase_admin
from app.services.gemini_service import generate_workout_plan
from app.services.adaptation_engine import check_and_adapt
from app.models.plan import GenerateProgramRequest

logger = logging.getLogger(__name__)
router = APIRouter()


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

async def _download_photo_as_image(storage_path: str) -> Image.Image | None:
    """Download a photo from Supabase Storage and return as PIL Image."""
    try:
        signed = supabase_admin.storage.from_("onboarding-photos").create_signed_url(
            storage_path, expires_in=300
        )
        url = signed["signedURL"]
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return Image.open(BytesIO(resp.content))
    except Exception as e:
        logger.warning(f"Could not download photo {storage_path}: {e}")
        return None


async def _get_user_photos(user: dict) -> list[Image.Image]:
    """Download all onboarding photos for a user."""
    images = []
    for key in ("onboarding_photo_front", "onboarding_photo_back", "onboarding_photo_side"):
        path = user.get(key)
        if path:
            img = await _download_photo_as_image(path)
            if img:
                images.append(img)
    return images


async def _deactivate_old_plans(user_id: str):
    """Set is_active=False on all existing plans for this user."""
    supabase_admin.table("generated_programs").update(
        {"is_active": False}
    ).eq("user_id", user_id).eq("is_active", True).execute()


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.post("/generate", status_code=201)
async def generate_program(req: GenerateProgramRequest):
    """
    Core AI endpoint — generates a full training + nutrition plan.

    1. Fetches user profile & onboarding photos from Supabase
    2. Fetches recent performance history (if available)
    3. Sends everything to Gemini 1.5 Flash via `response_schema`
    4. Stores the structured JSON plan in `generated_programs`
    5. Returns the plan to the client
    """
    try:
        # 1. Fetch user profile (safe — no .single())
        user_result = (
            supabase_admin.table("users")
            .select("*")
            .eq("id", req.user_id)
            .limit(1)
            .execute()
        )
        if not user_result.data:
            raise HTTPException(
                status_code=404,
                detail="User profile not found. Please complete onboarding first."
            )
        user = user_result.data[0]

        # 2. Download physique photos
        images = await _get_user_photos(user)
        logger.info(f"Downloaded {len(images)} onboarding photos for plan generation")

        # 3. Fetch recent performance (last 7 daily logs)
        perf_result = (
            supabase_admin.table("daily_logs")
            .select("*")
            .eq("user_id", req.user_id)
            .order("log_date", desc=True)
            .limit(7)
            .execute()
        )
        performance_history = perf_result.data or None

        # 4. Build user profile for Gemini
        user_profile = {
            "gender": user.get("gender"),
            "age": _calculate_age(user.get("date_of_birth")),
            "height_cm": user.get("height_cm"),
            "weight_kg": user.get("weight_kg"),
            "body_fat_pct": user.get("body_fat_pct"),
            "experience_level": user.get("experience_level"),
            "fitness_goal": user.get("fitness_goal"),
            "equipment_access": user.get("equipment_access"),
            "injuries": user.get("injuries", []),
        }

        # 5. Call Gemini
        plan_data = await generate_workout_plan(
            user_profile=user_profile,
            weak_points=user.get("weak_points", []),
            images=images if images else None,
            performance_history=performance_history,
            adaptation_context=req.adaptation_context,
        )

        # 6. Deactivate old plans & store new one
        await _deactivate_old_plans(req.user_id)

        # Determine version number
        count_result = (
            supabase_admin.table("generated_programs")
            .select("version")
            .eq("user_id", req.user_id)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        next_version = (count_result.data[0]["version"] + 1) if count_result.data else 1

        # Extract sub-sections for separate JSONB columns
        program_record = {
            "user_id": req.user_id,
            "plan_json": {
                "split_type": plan_data.get("split_type"),
                "mesocycle_weeks": plan_data.get("mesocycle_weeks"),
                "rationale": plan_data.get("rationale"),
                "days": plan_data.get("days", []),
            },
            "macro_plan_json": {
                "daily_calories": plan_data.get("daily_calories"),
                "protein_g": plan_data.get("protein_g"),
                "carbs_g": plan_data.get("carbs_g"),
                "fat_g": plan_data.get("fat_g"),
                "fiber_g_target": plan_data.get("fiber_g_target"),
                "water_liters": plan_data.get("water_liters"),
                "caloric_strategy": plan_data.get("caloric_strategy"),
                "rationale": plan_data.get("nutrition_rationale"),
                "meal_template": plan_data.get("meal_template", []),
                "supplement_suggestions": plan_data.get("supplement_suggestions", []),
            },
            "analysis_json": {
                "visual_assessment": plan_data.get("analysis_summary"),
                "estimated_body_fat_pct": plan_data.get("estimated_body_fat_pct"),
                "identified_strengths": plan_data.get("identified_strengths", []),
                "identified_weaknesses": plan_data.get("identified_weaknesses", []),
                "agreement_with_user_weak_points": plan_data.get("agreement_with_weak_points"),
            },
            "coaching_notes": {
                "weekly_focus": plan_data.get("weekly_focus"),
                "progression_model": plan_data.get("progression_model"),
                "deload_recommendation": plan_data.get("deload_recommendation"),
                "cardio_recommendation": plan_data.get("cardio_recommendation"),
            },
            "version": next_version,
            "is_active": True,
            "trigger_reason": req.adaptation_context.get("trigger_reason", "initial_onboarding")
            if req.adaptation_context
            else "initial_onboarding",
        }

        insert_result = (
            supabase_admin.table("generated_programs")
            .insert(program_record)
            .execute()
        )

        logger.info(f"✅ Plan v{next_version} generated for user {req.user_id}")

        return {
            "success": True,
            "message": f"Program v{next_version} generated successfully",
            "program_id": insert_result.data[0]["id"],
            "version": next_version,
            "plan": plan_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Plan generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")


@router.get("/active")
async def get_active_plan(user_id: str):
    """Get the user's currently active workout + nutrition plan."""
    result = (
        supabase_admin.table("generated_programs")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return {"success": True, "data": None}
    return {"success": True, "data": result.data[0]}


@router.get("/history")
async def get_plan_history(user_id: str, limit: int = 10):
    """List all past plan versions for a user."""
    result = (
        supabase_admin.table("generated_programs")
        .select("id, version, is_active, trigger_reason, generated_at")
        .eq("user_id", user_id)
        .order("generated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"success": True, "data": result.data}


@router.post("/adapt")
async def trigger_adaptation(user_id: str):
    """
    Manually trigger the adaptation engine.
    Checks recent performance trends and re-generates the plan if needed.
    """
    adaptation = await check_and_adapt(user_id)

    if adaptation is None:
        return {
            "success": True,
            "adapted": False,
            "message": "All metrics within normal range — no adaptation needed",
        }

    # Trigger plan re-generation with adaptation context
    req = GenerateProgramRequest(
        user_id=user_id,
        adaptation_context=adaptation,
    )
    result = await generate_program(req)
    result["adapted"] = True
    return result


# ──────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────

def _calculate_age(dob_str: str | None) -> int | None:
    """Calculate age from date of birth string."""
    if not dob_str:
        return None
    from datetime import date
    dob = date.fromisoformat(str(dob_str))
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
