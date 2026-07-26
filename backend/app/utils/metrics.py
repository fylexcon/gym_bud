"""
GymBud — Fitness & Physiology Metric Utilities

Provides standardized calculations for BMR, TDEE, 1-Rep Max (Epley & Brzycki formulas),
macro ratios, and body composition estimation.
"""

from typing import Literal, Dict, Tuple


def calculate_bmr_mifflin(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: Literal["male", "female", "other"] = "male"
) -> float:
    """
    Calculate Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
    Recognized as the most accurate standard formula in sports nutrition.
    """
    base = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age)
    if gender.lower() == "female":
        return round(base - 161.0, 1)
    # Default / Male / Other
    return round(base + 5.0, 1)


def calculate_tdee(
    bmr: float,
    activity_level: Literal["sedentary", "light", "moderate", "active", "very_active"] = "moderate"
) -> float:
    """
    Calculate Total Daily Energy Expenditure (TDEE) from BMR and activity multiplier.
    """
    multipliers = {
        "sedentary": 1.2,      # Little or no exercise, desk job
        "light": 1.375,        # Light exercise/sports 1-3 days/week
        "moderate": 1.55,      # Moderate exercise/sports 3-5 days/week
        "active": 1.725,       # Hard exercise/sports 6-7 days/week
        "very_active": 1.9,    # Very hard daily exercise + physical job
    }
    multiplier = multipliers.get(activity_level.lower(), 1.55)
    return round(bmr * multiplier, 1)


def estimate_1rm(weight_kg: float, reps: int) -> Dict[str, float]:
    """
    Estimate One-Rep Max (1RM) using both Epley and Brzycki formulas.
    Useful for calculating RPE load percentages and tracking progressive overload.
    """
    if reps <= 1:
        return {"epley": weight_kg, "brzycki": weight_kg, "average": weight_kg}
    
    # Epley: 1RM = w * (1 + r / 30)
    epley = weight_kg * (1.0 + (reps / 30.0))
    
    # Brzycki: 1RM = w * (36 / (37 - r))
    if reps >= 37:
        brzycki = epley  # avoid division by zero / negative estimates
    else:
        brzycki = weight_kg * (36.0 / (37.0 - reps))
        
    avg = (epley + brzycki) / 2.0
    return {
        "epley": round(epley, 1),
        "brzycki": round(brzycki, 1),
        "average": round(avg, 1)
    }


def calculate_macro_targets(
    tdee: float,
    goal: Literal["muscle_gain", "fat_loss", "recomp", "strength", "endurance"],
    weight_kg: float
) -> Dict[str, float | int]:
    """
    Calculate daily macro breakdown in grams based on training goal and body weight.
    """
    # 1. Adjust caloric intake based on goal
    if goal in ("muscle_gain", "strength"):
        daily_cals = tdee + 350.0  # Moderate lean surplus
        protein_per_kg = 2.2
        fat_pct = 0.25
    elif goal == "fat_loss":
        daily_cals = max(1200.0, tdee - 500.0)  # Safe deficit
        protein_per_kg = 2.4  # Higher protein to preserve muscle in deficit
        fat_pct = 0.25
    elif goal == "endurance":
        daily_cals = tdee + 200.0
        protein_per_kg = 1.6
        fat_pct = 0.20  # High carb focus
    else:  # recomp
        daily_cals = tdee
        protein_per_kg = 2.3
        fat_pct = 0.25

    # 2. Calculate grams
    protein_g = round(weight_kg * protein_per_kg)
    protein_cals = protein_g * 4.0

    fat_cals = daily_cals * fat_pct
    fat_g = round(fat_cals / 9.0)

    remaining_cals = max(0.0, daily_cals - (protein_cals + fat_cals))
    carbs_g = round(remaining_cals / 4.0)

    # Fiber guideline: ~14g per 1000 kcal
    fiber_g = round((daily_cals / 1000.0) * 14.0)

    return {
        "daily_calories": int(round(daily_cals)),
        "protein_g": int(protein_g),
        "carbs_g": int(carbs_g),
        "fat_g": int(fat_g),
        "fiber_g_target": int(fiber_g),
        "water_liters": round(weight_kg * 0.04, 1)  # ~40ml per kg
    }
