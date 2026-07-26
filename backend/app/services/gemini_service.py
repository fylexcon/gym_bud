"""
GymBud — Gemini 1.5 Flash Service

Uses Google's `google-generativeai` SDK with `response_schema` to force
Gemini to return perfectly typed JSON matching our Pydantic models.
This eliminates the need for regex or manual string parsing.

Two core functions:
  - generate_workout_plan()  → full training + nutrition program
  - analyze_daily_fitcheck() → physique photo analysis
"""

import json
import logging
from typing import Optional

import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from pydantic import BaseModel, Field
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Initialize the Gemini client ────────────────────────
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")


# =====================================================================
# PYDANTIC MODELS FOR GEMINI STRUCTURED JSON OUTPUT
# =====================================================================
# These models are passed directly into Gemini's `response_schema`
# parameter, which forces the API to return JSON matching this shape.
# =====================================================================

class ExerciseInstruction(BaseModel):
    order: int
    exercise_name: str
    muscle_group: str
    sets: int
    rep_range: str = Field(description="e.g., '8-10', '12-15'")
    rest_seconds: int
    rpe_target: int
    technique: str = Field(
        description="e.g., straight_sets, superset, pre_exhaustion, drop_set, myo_reps"
    )
    superset_with: Optional[str] = None
    notes: str = ""
    weak_point_priority: bool = False


class WorkoutDay(BaseModel):
    day_number: int
    day_label: str = Field(description="e.g., 'Push A (Chest Focus)'")
    muscle_groups: list[str]
    estimated_duration_min: int
    exercises: list[ExerciseInstruction]


class NutritionMeal(BaseModel):
    meal_number: int
    meal_name: str
    timing: str = Field(description="e.g., '90 min before training'")
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    example_foods: list[str]


class SupplementSuggestion(BaseModel):
    name: str
    dosage: str
    timing: str
    rationale: str


class GeneratedPlanResponse(BaseModel):
    """The complete structured output Gemini must return for plan generation."""

    # Analysis
    analysis_summary: str = Field(description="2-3 sentence visual assessment of physique")
    estimated_body_fat_pct: Optional[float] = None
    identified_strengths: list[str] = []
    identified_weaknesses: list[str] = []
    agreement_with_weak_points: str = Field(
        description="Does the AI agree with the user's stated weak points?"
    )

    # Training plan
    split_type: str = Field(description="e.g., 'Push/Pull/Legs (6-day)'")
    mesocycle_weeks: int
    rationale: str
    days: list[WorkoutDay]

    # Nutrition plan
    daily_calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g_target: float = 30.0
    water_liters: float = 3.0
    caloric_strategy: str = Field(description="surplus | deficit | maintenance")
    nutrition_rationale: str = ""
    meal_template: list[NutritionMeal]
    supplement_suggestions: list[SupplementSuggestion] = []

    # Coaching
    weekly_focus: str
    progression_model: str
    deload_recommendation: str = ""
    cardio_recommendation: str = ""


class FitcheckAnalysisResponse(BaseModel):
    """Structured output for daily physique photo analysis."""

    estimated_body_fat_pct: Optional[float] = None
    muscle_symmetry_score: Optional[float] = Field(None, description="1-10 scale")
    notable_changes: list[str] = []
    areas_to_improve: list[str] = []
    comparison_to_previous: str = ""
    posing_feedback: str = ""
    motivation: str = ""
    recommended_focus: str = ""


# =====================================================================
# SYSTEM PROMPTS
# =====================================================================

PLAN_SYSTEM_INSTRUCTION = """You are GymBud AI, an elite-level personal trainer and sports nutritionist with 20+ years of experience coaching natural athletes. You specialize in physique transformation through evidence-based programming.

Your task: Analyze the user's profile data and physique photos, then generate a complete weekly training program and daily nutrition plan tailored to their exact situation.

ANALYSIS PROCESS:
1. Assess the photos — evaluate muscle development, symmetry, estimated body fat, identify lagging parts.
2. Cross-reference with stated weak points — validate the user's self-assessment.
3. Factor in the goal — design split, volume, intensity to serve the stated goal.
4. Account for experience — beginners: full-body/upper-lower; intermediates: PPL/Arnold; advanced: specialization.
5. Consider injuries — exclude dangerous exercises, substitute with safe alternatives, explain why.
6. Program advanced techniques where appropriate: supersets, pre-exhaustion, myo-reps, drop sets, pause reps.

CRITICAL RULES:
- NEVER include exercises that aggravate listed injuries.
- ALWAYS prioritize weak points with higher volume, earlier placement, and specialized techniques.
- ALWAYS keep weekly volume per muscle group within 10-20 hard sets (up to 25 for priority weak points).
- NEVER exceed equipment constraints.
- If adaptation context is provided, modify the existing plan accordingly rather than starting from scratch."""

FITCHECK_SYSTEM_INSTRUCTION = """You are GymBud AI, an expert physique analysis coach. You are analyzing a user's daily physique check-in photo.

Compare this photo against the user's baseline and provide an honest, encouraging, and actionable analysis.

CRITICAL RULES:
- Be honest but constructive. Never give false praise, always frame feedback positively.
- If photo quality is poor, note this in posing_feedback and mention reduced accuracy.
- Focus on weekly/monthly trends rather than day-to-day noise.
- Do NOT diagnose medical conditions. Suggest consulting a healthcare provider if concerned."""


# =====================================================================
# SERVICE FUNCTIONS
# =====================================================================

async def generate_workout_plan(
    user_profile: dict,
    weak_points: list[str],
    images: list[Image.Image] | None = None,
    performance_history: list[dict] | None = None,
    adaptation_context: dict | None = None,
) -> dict:
    """
    Generate a full structured workout and nutrition plan using Gemini 1.5 Flash.

    By passing our Pydantic model into `response_schema`, Gemini is forced to
    return JSON that exactly matches the schema — no regex or string parsing needed.

    Args:
        user_profile: User profile dict (biometrics, goals, equipment, etc.)
        weak_points: List of lagging muscle groups to prioritize
        images: Optional PIL Images (front/back/side physique photos)
        performance_history: Optional recent workout logs for context
        adaptation_context: Optional reasons for plan re-generation

    Returns:
        Parsed dict matching GeneratedPlanResponse schema
    """
    prompt = f"""## USER PROFILE
{json.dumps(user_profile, indent=2, default=str)}

## STATED WEAK POINTS
{json.dumps(weak_points)}
"""

    if performance_history:
        prompt += f"""
## RECENT PERFORMANCE HISTORY (last 7 sessions)
{json.dumps(performance_history, indent=2, default=str)}
"""

    if adaptation_context:
        prompt += f"""
## ADAPTATION CONTEXT (plan re-generation triggered)
{json.dumps(adaptation_context, indent=2, default=str)}
Modify the existing plan according to these adjustment reasons rather than generating from scratch.
"""

    prompt += "\nBased on this data and the provided photos (if any), generate a highly specific, optimized protocol."

    # Build multimodal content list
    contents = [prompt]
    if images:
        contents.extend(images)

    # Enforce strict JSON output matching the Pydantic schema
    generation_config = GenerationConfig(
        response_mime_type="application/json",
        response_schema=GeneratedPlanResponse,
        temperature=0.4,  # Lower temperature for analytical, structured output
    )

    try:
        logger.info(
            f"Sending plan generation request to Gemini "
            f"({len(images) if images else 0} photos, "
            f"adaptation={'yes' if adaptation_context else 'no'})"
        )
        response = model.generate_content(
            contents,
            generation_config=generation_config,
            system_instruction=PLAN_SYSTEM_INSTRUCTION,
        )
        result = json.loads(response.text)
        logger.info("✅ Plan generation successful — structured JSON validated by Gemini")
        return result

    except Exception as e:
        logger.error(f"❌ Failed to generate plan via Gemini: {e}")
        raise Exception(f"Failed to generate plan via Gemini: {str(e)}")


async def analyze_daily_fitcheck(
    current_image: Image.Image,
    user_context: dict,
    previous_analysis: dict | None = None,
    baseline_images: list[Image.Image] | None = None,
) -> dict:
    """
    Analyze a daily physique photo, comparing against past data.

    Args:
        current_image: Today's physique photo as PIL Image
        user_context: User's goals, weak points, current plan summary
        previous_analysis: Most recent prior fitcheck analysis (for trends)
        baseline_images: Optional onboarding photos for comparison

    Returns:
        Parsed dict matching FitcheckAnalysisResponse schema
    """
    prompt = f"""## USER CONTEXT & GOALS
{json.dumps(user_context, indent=2, default=str)}

## PREVIOUS ANALYSIS
{json.dumps(previous_analysis, indent=2, default=str) if previous_analysis else 'None — this is the baseline check-in.'}

Analyze the current physique photo and return structured feedback.
"""

    # Build multimodal content
    contents = [prompt]
    if baseline_images:
        contents.append("BASELINE (ONBOARDING) PHOTOS for comparison:")
        contents.extend(baseline_images)
    contents.append("TODAY'S FITCHECK PHOTO:")
    contents.append(current_image)

    generation_config = GenerationConfig(
        response_mime_type="application/json",
        response_schema=FitcheckAnalysisResponse,
        temperature=0.3,
    )

    try:
        logger.info("Sending fitcheck analysis request to Gemini")
        response = model.generate_content(
            contents,
            generation_config=generation_config,
            system_instruction=FITCHECK_SYSTEM_INSTRUCTION,
        )
        result = json.loads(response.text)
        logger.info("✅ Fitcheck analysis successful")
        return result

    except Exception as e:
        logger.warning(f"⚠️ Fitcheck analysis failed: {e}")
        # Return graceful fallback instead of crashing
        return {
            "estimated_body_fat_pct": None,
            "muscle_symmetry_score": None,
            "notable_changes": ["Analysis temporarily unavailable"],
            "areas_to_improve": [],
            "comparison_to_previous": "Unable to analyze — please try again",
            "posing_feedback": "",
            "motivation": "Keep showing up! Consistency beats perfection. 💪",
            "recommended_focus": "",
        }
