"""
GymBud — Data Validation and Sanitization Utilities

Helper functions for verifying workout logs, validating photo uploads,
and checking macro sanity.
"""

from typing import List, Dict, Any, Optional


def validate_macro_balance(calories: int, protein_g: float, carbs_g: float, fat_g: float) -> Dict[str, Any]:
    """
    Check if logged macros roughly match the total calories (within 15% tolerance).
    Returns sanity status and estimated calories from macros.
    """
    calc_cals = (protein_g * 4.0) + (carbs_g * 4.0) + (fat_g * 9.0)
    if calories <= 0:
        return {"valid": False, "reason": "Calories must be positive", "calculated_cals": round(calc_cals)}
    
    diff_pct = abs(calc_cals - calories) / calories
    is_valid = diff_pct <= 0.15  # 15% discrepancy allowance for alcohol, fiber, or rounding
    
    return {
        "valid": is_valid,
        "discrepancy_pct": round(diff_pct * 100, 1),
        "logged_calories": calories,
        "calculated_calories": round(calc_cals),
        "warning": None if is_valid else f"Logged macros (~{round(calc_cals)} kcal) diverge from total ({calories} kcal)"
    }


def sanitize_exercise_log(exercises: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sanitize and validate exercise entries before storing in JSONB.
    Removes empty exercise names and clamps impossible RPE/rep values.
    """
    cleaned = []
    for ex in exercises:
        name = str(ex.get("exercise_name", "")).strip()
        if not name:
            continue
            
        sets = max(1, min(20, int(ex.get("sets", 1))))
        reps = max(1, min(100, int(ex.get("reps", 1))))
        rpe = ex.get("rpe")
        
        if rpe is not None:
            try:
                rpe_val = float(rpe)
                rpe_clean = max(1.0, min(10.0, round(rpe_val, 1)))
            except (ValueError, TypeError):
                rpe_clean = None
        else:
            rpe_clean = None
            
        cleaned.append({
            "exercise_name": name,
            "sets": sets,
            "reps": reps,
            "weight_kg": float(ex.get("weight_kg", 0.0)) if ex.get("weight_kg") is not None else None,
            "rpe": rpe_clean,
            "completed": bool(ex.get("completed", True)),
            "notes": str(ex.get("notes", "")).strip()[:200] if ex.get("notes") else None
        })
        
    return cleaned


def check_overtraining_risk(recent_rpes: List[float], recent_sleep_hours: List[float]) -> Dict[str, Any]:
    """
    Analyze recent RPE and sleep trends to flag high overtraining risk.
    """
    if not recent_rpes or not recent_sleep_hours:
        return {"risk_level": "low", "flags": []}
        
    avg_rpe = sum(recent_rpes) / len(recent_rpes)
    avg_sleep = sum(recent_sleep_hours) / len(recent_sleep_hours)
    
    flags = []
    risk = "low"
    
    if avg_rpe >= 9.0 and len(recent_rpes) >= 3:
        flags.append("Consecutive near-max effort sessions (Avg RPE >= 9.0)")
        risk = "moderate"
        
    if avg_sleep <= 5.5 and len(recent_sleep_hours) >= 3:
        flags.append("Chronic sleep restriction (Avg Sleep <= 5.5 hours)")
        risk = "moderate"
        
    if avg_rpe >= 8.5 and avg_sleep <= 6.0:
        flags.append("High training strain combined with poor recovery")
        risk = "high"
        
    return {
        "risk_level": risk,
        "avg_rpe": round(avg_rpe, 1),
        "avg_sleep": round(avg_sleep, 1),
        "flags": flags
    }
