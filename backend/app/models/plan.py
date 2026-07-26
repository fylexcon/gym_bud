"""
GymBud — Plan Generation Pydantic Models

Schemas for the GenerateProgram request/response.
These enforce the exact JSON shape that Gemini must return.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ──────────────────────────────────────────────
# Gemini Output Sub-Models
# ──────────────────────────────────────────────

class ExercisePlan(BaseModel):
    """A single exercise within a training day."""

    order: int
    exercise_name: str
    muscle_group: str
    sets: int = Field(..., ge=1, le=10)
    rep_range: str = Field(..., examples=["8-10", "12-15", "6-8"])
    rest_seconds: int = Field(..., ge=30, le=300)
    rpe_target: float = Field(..., ge=5, le=10)
    technique: str = Field(
        default="straight_sets",
        pattern=r"^(straight_sets|superset|pre_exhaustion|drop_set|myo_reps|pause_reps)$",
    )
    superset_with: Optional[str] = None
    notes: str = ""
    weak_point_priority: bool = False


class TrainingDay(BaseModel):
    """A single day in the weekly training split."""

    day_number: int
    day_label: str = Field(..., examples=["Push A (Chest Focus)"])
    muscle_groups: list[str]
    estimated_duration_min: int
    exercises: list[ExercisePlan]


class TrainingPlan(BaseModel):
    """The complete weekly training program."""

    split_type: str = Field(..., examples=["Push/Pull/Legs (6-day)"])
    mesocycle_weeks: int = Field(..., ge=1, le=12)
    rationale: str
    days: list[TrainingDay]


class MealTemplate(BaseModel):
    """A single meal in the daily nutrition template."""

    meal_number: int
    meal_name: str
    timing: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    example_foods: list[str]


class SupplementSuggestion(BaseModel):
    """An optional supplement recommendation."""

    name: str
    dosage: str
    timing: str
    rationale: str


class NutritionPlan(BaseModel):
    """The complete daily nutrition plan."""

    daily_calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g_target: float
    water_liters: float
    caloric_strategy: str = Field(
        ..., pattern=r"^(surplus|deficit|maintenance)$"
    )
    rationale: str
    meal_template: list[MealTemplate]
    supplement_suggestions: list[SupplementSuggestion] = []


class VisualAnalysis(BaseModel):
    """Gemini's assessment of the user's physique photos."""

    visual_assessment: str
    estimated_body_fat_pct: Optional[float] = None
    identified_strengths: list[str]
    identified_weaknesses: list[str]
    agreement_with_user_weak_points: str


class CoachingNotes(BaseModel):
    """Additional coaching guidance from Gemini."""

    weekly_focus: str
    progression_model: str
    deload_recommendation: str
    cardio_recommendation: str


# ──────────────────────────────────────────────
# Top-Level Request / Response
# ──────────────────────────────────────────────

class GenerateProgramRequest(BaseModel):
    """
    Request payload for POST /api/generate-program.

    The frontend sends the user's profile context and optionally
    specifies adaptation adjustments (for re-generations).
    """

    user_id: str
    # Optional: if this is a re-generation, specify what changed
    adaptation_context: Optional[dict] = None
    # e.g. {"reasons": ["reduce_volume_10pct", "plateau_detected"]}


class WorkoutProgramResponse(BaseModel):
    """
    The structured response from Gemini, validated by Pydantic.
    This is exactly the JSON shape we expect Gemini to return.
    """

    analysis: VisualAnalysis
    training_plan: TrainingPlan
    nutrition_plan: NutritionPlan
    coaching_notes: CoachingNotes


class ProgramResponse(BaseModel):
    """API response wrapping the generated program with metadata."""

    program_id: str
    version: int
    is_active: bool
    generated_at: str
    program: WorkoutProgramResponse
