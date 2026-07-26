"""
GymBud — Daily Log Router

Handles daily meal, sleep, and workout performance logging.
After each workout log, the adaptation engine is triggered
to check if the plan needs adjusting.
"""

from fastapi import APIRouter, HTTPException
from datetime import date
import logging

from app.utils.supabase_client import supabase_admin
from app.services.adaptation_engine import check_and_adapt
from app.models.daily_log import DailyLogRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/log", status_code=201)
async def create_or_update_daily_log(user_id: str, req: DailyLogRequest):
    """
    Log daily metrics — nutrition, sleep, and workout performance.

    Uses UPSERT so multiple submissions on the same day merge into
    one record. After a workout log, the adaptation engine runs
    automatically to check for performance trends.
    """
    try:
        log_date = (req.log_date or date.today()).isoformat()

        # Calculate aggregated nutrition totals
        total_calories = 0
        total_protein = 0.0
        total_carbs = 0.0
        total_fat = 0.0
        meals_data = []

        if req.meals:
            for meal in req.meals:
                total_calories += meal.calories
                total_protein += meal.protein_g
                total_carbs += meal.carbs_g
                total_fat += meal.fat_g
                meals_data.append(meal.model_dump())

        # Build the record (only include non-None fields for upsert)
        record = {
            "user_id": user_id,
            "log_date": log_date,
        }

        if req.meals is not None:
            record["meals"] = meals_data
            record["total_calories"] = total_calories
            record["total_protein_g"] = total_protein
            record["total_carbs_g"] = total_carbs
            record["total_fat_g"] = total_fat

        if req.water_ml is not None:
            record["water_ml"] = req.water_ml
        if req.sleep_hours is not None:
            record["sleep_hours"] = req.sleep_hours
        if req.sleep_quality is not None:
            record["sleep_quality"] = req.sleep_quality
        if req.workout_completed is not None:
            record["workout_completed"] = req.workout_completed
        if req.workout_day_label is not None:
            record["workout_day_label"] = req.workout_day_label
        if req.exercises_logged is not None:
            record["exercises_logged"] = [ex.model_dump() for ex in req.exercises_logged]
        if req.session_duration_min is not None:
            record["session_duration_min"] = req.session_duration_min
        if req.overall_rpe is not None:
            record["overall_rpe"] = float(req.overall_rpe)
        if req.energy_level is not None:
            record["energy_level"] = req.energy_level
        if req.pump_rating is not None:
            record["pump_rating"] = req.pump_rating
        if req.mood is not None:
            record["mood"] = req.mood
        if req.soreness_level is not None:
            record["soreness_level"] = req.soreness_level
        if req.notes is not None:
            record["notes"] = req.notes

        # Upsert (one log per user per day)
        result = (
            supabase_admin.table("daily_logs")
            .upsert(record, on_conflict="user_id,log_date")
            .execute()
        )

        log_id = result.data[0]["id"]
        logger.info(f"✅ Daily log saved for user {user_id} on {log_date}")

        # If a workout was logged, run the adaptation engine
        adaptation_result = None
        if req.workout_completed:
            logger.info(f"Running adaptation engine for user {user_id}")
            try:
                adaptation_result = await check_and_adapt(user_id)
            except Exception as adapt_err:
                logger.warning(f"Adaptation engine error (non-fatal): {adapt_err}")

        response = {
            "success": True,
            "message": "Daily log saved successfully",
            "log_id": log_id,
            "log_date": log_date,
            "total_calories": record.get("total_calories", 0),
            "total_protein_g": record.get("total_protein_g", 0),
            "total_carbs_g": record.get("total_carbs_g", 0),
            "total_fat_g": record.get("total_fat_g", 0),
        }

        if adaptation_result:
            response["adaptation_triggered"] = True
            response["adaptation_reasons"] = adaptation_result.get("reasons", [])
            logger.info(f"⚡ Adaptation triggered: {adaptation_result['reasons']}")
        else:
            response["adaptation_triggered"] = False

        return response

    except Exception as e:
        logger.error(f"Daily log error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save daily log: {str(e)}")


@router.get("/logs")
async def get_daily_logs(user_id: str, days: int = 7):
    """Get recent daily logs for a user."""
    result = (
        supabase_admin.table("daily_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("log_date", desc=True)
        .limit(days)
        .execute()
    )

    return {"success": True, "data": result.data}


@router.get("/summary/{log_date}")
async def get_daily_summary(user_id: str, log_date: str):
    """
    Get an aggregated daily summary comparing actual intake vs. targets.
    """
    try:
        # Get the daily log (safe — no .single())
        log_result = (
            supabase_admin.table("daily_logs")
            .select("*")
            .eq("user_id", user_id)
            .eq("log_date", log_date)
            .limit(1)
            .execute()
        )
        if not log_result.data:
            raise HTTPException(status_code=404, detail=f"No log found for {log_date}")
        log = log_result.data[0]

        # Get the active plan for macro targets (safe — no .single())
        plan_result = (
            supabase_admin.table("generated_programs")
            .select("macro_plan_json")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        targets = plan_result.data[0].get("macro_plan_json", {}) if plan_result.data else {}

        # Calculate adherence
        target_cals = targets.get("daily_calories", 1)
        actual_cals = log.get("total_calories", 0)
        adherence = round((actual_cals / target_cals) * 100, 1) if target_cals > 0 else 0

        return {
            "success": True,
            "log_date": log_date,
            "nutrition": {
                "actual": {
                    "calories": log.get("total_calories", 0),
                    "protein_g": log.get("total_protein_g", 0),
                    "carbs_g": log.get("total_carbs_g", 0),
                    "fat_g": log.get("total_fat_g", 0),
                },
                "target": {
                    "calories": targets.get("daily_calories", 0),
                    "protein_g": targets.get("protein_g", 0),
                    "carbs_g": targets.get("carbs_g", 0),
                    "fat_g": targets.get("fat_g", 0),
                },
                "adherence_pct": adherence,
            },
            "workout": {
                "completed": log.get("workout_completed", False),
                "rpe": log.get("overall_rpe"),
                "energy": log.get("energy_level"),
                "day_label": log.get("workout_day_label"),
            },
            "sleep": {
                "hours": log.get("sleep_hours"),
                "quality": log.get("sleep_quality"),
            },
            "water_ml": log.get("water_ml", 0),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"No log found for {log_date}")
