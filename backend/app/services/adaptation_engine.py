import logging
from statistics import mean

# CHANGE THIS IMPORT
from app.utils.supabase_client import supabase_admin

logger = logging.getLogger(__name__)

async def get_recent_logs(user_id: str, days: int = 7) -> list[dict]:
    """Fetch the user's daily logs from the last N days."""
    
    # USE supabase_admin DIRECTLY
    result = (
        supabase_admin.table("daily_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("log_date", desc=True)
        .limit(days)
        .execute()
    )
    return result.data or []

async def get_active_plan(user_id: str) -> dict | None:
    """Fetch the user's currently active program."""
    
    result = (
        supabase_admin.table("generated_programs")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None

# ... (The rest of the file remains exactly the same)


def _analyze_rpe_trend(logs: list[dict]) -> tuple[float, str]:
    """Calculate average RPE and classify the trend."""
    rpe_values = [log["overall_rpe"] for log in logs if log.get("overall_rpe")]
    if not rpe_values:
        return 0.0, "insufficient_data"
    avg = mean(rpe_values)
    if avg > 8.5:
        return avg, "overreaching"
    elif avg > 7.5:
        return avg, "high"
    elif avg > 5.5:
        return avg, "moderate"
    else:
        return avg, "low"


def _analyze_energy_trend(logs: list[dict]) -> str:
    """Detect declining energy levels across recent sessions."""
    energy_map = {"very_low": 1, "low": 2, "moderate": 3, "high": 4, "very_high": 5}
    energy_values = [
        energy_map.get(log.get("energy_level", ""), 3)
        for log in logs
        if log.get("energy_level")
    ]
    if len(energy_values) < 3:
        return "insufficient_data"

    # Check if trend is declining (later entries are lower)
    first_half = mean(energy_values[: len(energy_values) // 2])
    second_half = mean(energy_values[len(energy_values) // 2 :])

    if second_half < first_half - 0.5:
        return "declining"
    elif second_half > first_half + 0.5:
        return "improving"
    return "stable"


def _analyze_sleep(logs: list[dict]) -> tuple[float, str]:
    """Calculate average sleep and assess quality."""
    sleep_values = [log["sleep_hours"] for log in logs if log.get("sleep_hours")]
    if not sleep_values:
        return 0.0, "insufficient_data"
    avg = mean(sleep_values)
    if avg < 5.5:
        return avg, "critical"
    elif avg < 6.5:
        return avg, "poor"
    elif avg < 7.5:
        return avg, "fair"
    return avg, "good"


def _detect_strength_plateau(logs: list[dict]) -> bool:
    """
    Check if any main compound lift has stalled for 2+ weeks.
    Looks at the top set weight×reps for each exercise across sessions.
    """
    compound_lifts = {}
    for log in logs:
        exercises = log.get("exercises_logged") or []
        for exercise in exercises:
            name = exercise.get("exercise_name", "")
            sets = exercise.get("sets", [])
            if sets:
                # Calculate top set volume (weight × reps)
                top_set = max(sets, key=lambda s: s.get("weight_kg", 0) * s.get("reps", 0))
                volume = top_set.get("weight_kg", 0) * top_set.get("reps", 0)
                if name not in compound_lifts:
                    compound_lifts[name] = []
                compound_lifts[name].append(volume)

    # Check for plateau: no increase across 4+ sessions of the same exercise
    for name, volumes in compound_lifts.items():
        if len(volumes) >= 4:
            recent = volumes[:4]  # Most recent first
            if max(recent) <= min(recent) * 1.02:  # Less than 2% variation
                logger.info(f"Plateau detected on {name}")
                return True
    return False


async def check_and_adapt(user_id: str) -> dict | None:
    """
    Main entry point — called after each workout log submission.

    Analyzes the last 7 days of data and determines if the user's
    plan needs to be adapted. Returns adaptation context if changes
    are needed, None otherwise.

    Returns:
        dict with adaptation reasons, or None if no changes needed.
        Example: {"reasons": ["reduce_volume_10pct"], "details": {...}}
    """
    logs = await get_recent_logs(user_id, days=7)

    if len(logs) < 3:
        logger.info(f"User {user_id}: Not enough data for adaptation ({len(logs)} logs)")
        return None

    # Run all trend analyses
    avg_rpe, rpe_status = _analyze_rpe_trend(logs)
    energy_trend = _analyze_energy_trend(logs)
    avg_sleep, sleep_status = _analyze_sleep(logs)
    plateau_detected = _detect_strength_plateau(logs)

    adjustments = []
    details = {
        "avg_rpe": avg_rpe,
        "rpe_status": rpe_status,
        "energy_trend": energy_trend,
        "avg_sleep": avg_sleep,
        "sleep_status": sleep_status,
        "plateau_detected": plateau_detected,
    }

    # ── Rule 1: Overreaching ──────────────────────
    if rpe_status == "overreaching" and energy_trend == "declining":
        adjustments.append("reduce_volume_10pct")
        adjustments.append("increase_rest_periods")
        logger.warning(f"User {user_id}: Overreaching detected (RPE={avg_rpe:.1f}, energy declining)")

    # ── Rule 2: Under-recovery ────────────────────
    if sleep_status in ("critical", "poor"):
        adjustments.append("reduce_intensity")
        if sleep_status == "critical":
            adjustments.append("add_rest_day")
        logger.warning(f"User {user_id}: Under-recovery (sleep avg={avg_sleep:.1f}h)")

    # ── Rule 3: Plateau ───────────────────────────
    if plateau_detected:
        adjustments.append("change_rep_scheme")
        adjustments.append("add_exercise_variation")
        logger.info(f"User {user_id}: Strength plateau detected")

    # ── Rule 4: Energy crash ──────────────────────
    if energy_trend == "declining" and rpe_status != "overreaching":
        adjustments.append("check_nutrition_adherence")
        adjustments.append("add_deload_day")
        logger.info(f"User {user_id}: Energy declining without overreaching — possible nutrition issue")

    if adjustments:
        trigger_reason = (
            "adaptation_performance_drop"
            if "reduce_volume_10pct" in adjustments
            else "adaptation_plateau"
            if plateau_detected
            else "adaptation_recovery_issue"
        )

        return {
            "reasons": adjustments,
            "trigger_reason": trigger_reason,
            "details": details,
        }

    logger.info(f"User {user_id}: All metrics within normal range — no adaptation needed")
    return None
