"""
GymBud — User Pydantic Models

Schemas for user profile, onboarding, and updates.
"""

from pydantic import BaseModel, Field, EmailStr
from datetime import date
from typing import Optional


class OnboardingRequest(BaseModel):
    """Payload for POST /api/onboarding — initial user setup."""

    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr

    # Biometrics
    gender: str = Field(..., pattern=r"^(male|female|other)$")
    date_of_birth: date
    height_cm: float = Field(..., gt=100, lt=300)
    weight_kg: float = Field(..., gt=30, lt=300)
    body_fat_pct: Optional[float] = Field(None, ge=3, le=60)

    # Fitness profile
    experience_level: str = Field(
        default="beginner",
        pattern=r"^(beginner|intermediate|advanced)$",
    )
    fitness_goal: str = Field(
        default="muscle_gain",
        pattern=r"^(muscle_gain|fat_loss|recomp|strength|endurance)$",
    )
    weak_points: list[str] = Field(
        default_factory=list,
        examples=[["lower_chest", "rear_delts", "calves"]],
    )
    injuries: list[str] = Field(
        default_factory=list,
        examples=[["left_shoulder_impingement"]],
    )
    equipment_access: str = Field(
        default="full_gym",
        pattern=r"^(full_gym|home_basic|home_advanced|bodyweight)$",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "Alex Johnson",
                "email": "alex@example.com",
                "gender": "male",
                "date_of_birth": "1995-06-15",
                "height_cm": 180.0,
                "weight_kg": 82.5,
                "body_fat_pct": 16.0,
                "experience_level": "intermediate",
                "fitness_goal": "muscle_gain",
                "weak_points": ["lower_chest", "rear_delts"],
                "injuries": [],
                "equipment_access": "full_gym",
            }
        }


class UserProfileResponse(BaseModel):
    """Response schema for user profile data."""

    id: str
    email: str
    full_name: str
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    experience_level: str
    fitness_goal: str
    weak_points: list[str]
    injuries: list[str]
    equipment_access: str
    onboarding_completed: bool
    onboarding_photo_front: Optional[str] = None
    onboarding_photo_back: Optional[str] = None
    onboarding_photo_side: Optional[str] = None


class UserUpdateRequest(BaseModel):
    """Partial update for user profile fields."""

    full_name: Optional[str] = None
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    fitness_goal: Optional[str] = None
    weak_points: Optional[list[str]] = None
    injuries: Optional[list[str]] = None
    equipment_access: Optional[str] = None
    expo_push_token: Optional[str] = None
