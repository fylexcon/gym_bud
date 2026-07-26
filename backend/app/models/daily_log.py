"""
GymBud — Daily Log Pydantic Models

Schemas for daily meal, sleep, and workout performance logging.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class MealEntry(BaseModel):
    """A single meal within the daily log."""

    meal_type: str = Field(
        ...,
        pattern=r"^(breakfast|lunch|dinner|snack|pre_workout|post_workout)$",
    )
    description: str = Field(..., min_length=2, max_length=500)
    calories: int = Field(..., ge=0, le=5000)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(..., ge=0)
    fat_g: float = Field(..., ge=0)
    photo_url: Optional[str] = None


class ExerciseSetLog(BaseModel):
    """A single set within an exercise log."""

    set_number: int
    reps: int = Field(..., ge=0, le=100)
    weight_kg: float = Field(..., ge=0)
    rpe: Optional[float] = Field(None, ge=1, le=10)


class ExerciseLog(BaseModel):
    """Performance log for a single exercise."""

    exercise_name: str
    sets: list[ExerciseSetLog]
    technique: str = "straight_sets"
    notes: Optional[str] = None


class DailyLogRequest(BaseModel):
    """
    Request payload for POST /api/daily-log.
    Users submit their full day's data in one payload.
    Partial updates are supported — only include fields being logged.
    """

    log_date: Optional[date] = None  # Defaults to today

    # Nutrition
    meals: Optional[list[MealEntry]] = None
    water_ml: Optional[int] = Field(None, ge=0, le=10000)

    # Sleep
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    sleep_quality: Optional[str] = Field(
        None, pattern=r"^(poor|fair|good|excellent)$"
    )

    # Workout performance
    workout_completed: Optional[bool] = None
    workout_day_label: Optional[str] = None
    exercises_logged: Optional[list[ExerciseLog]] = None
    session_duration_min: Optional[int] = Field(None, ge=0, le=480)
    overall_rpe: Optional[float] = Field(None, ge=1, le=10)
    energy_level: Optional[str] = Field(
        None,
        pattern=r"^(very_low|low|moderate|high|very_high)$",
    )
    pump_rating: Optional[int] = Field(None, ge=1, le=5)
    mood: Optional[str] = Field(
        None, pattern=r"^(poor|average|good|great)$"
    )
    soreness_level: Optional[str] = Field(
        None, pattern=r"^(none|mild|moderate|severe)$"
    )

    notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "log_date": "2026-07-24",
                "meals": [
                    {
                        "meal_type": "breakfast",
                        "description": "Oatmeal with whey protein and banana",
                        "calories": 520,
                        "protein_g": 35,
                        "carbs_g": 72,
                        "fat_g": 8,
                    }
                ],
                "water_ml": 2500,
                "sleep_hours": 7.5,
                "sleep_quality": "good",
                "workout_completed": True,
                "workout_day_label": "Push A (Chest Focus)",
                "exercises_logged": [
                    {
                        "exercise_name": "Barbell Bench Press",
                        "sets": [
                            {"set_number": 1, "reps": 10, "weight_kg": 80, "rpe": 7},
                            {"set_number": 2, "reps": 8, "weight_kg": 85, "rpe": 8.5},
                        ],
                        "technique": "straight_sets",
                    }
                ],
                "session_duration_min": 65,
                "overall_rpe": 7.5,
                "energy_level": "high",
                "pump_rating": 4,
                "mood": "great",
            }
        }


class DailyLogResponse(BaseModel):
    """Response after creating/updating a daily log."""

    log_id: str
    user_id: str
    log_date: str
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    water_ml: int
    workout_completed: bool
    message: str = "Daily log saved successfully"


class DailySummaryResponse(BaseModel):
    """Aggregated daily summary comparing actuals vs. targets."""

    log_date: str
    nutrition: dict  # { actual: {...}, target: {...}, adherence_pct: 85 }
    workout: dict    # { completed: true, rpe: 7.5, energy: "high" }
    sleep: dict      # { hours: 7.5, quality: "good" }
    overall_score: float  # 0-100 composite score for the day
