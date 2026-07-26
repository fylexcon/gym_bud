"""
GymBud Backend Utilities

Shared utilities for Supabase client access, storage operations,
physiology metrics, and data validation.
"""

from app.utils.supabase_client import supabase_client, supabase_admin
from app.utils.storage import upload_photo_to_storage, get_photo_public_url
from app.utils.metrics import (
    calculate_bmr_mifflin,
    calculate_tdee,
    estimate_1rm,
    calculate_macro_targets,
)
from app.utils.validators import (
    validate_macro_balance,
    sanitize_exercise_log,
    check_overtraining_risk,
)

__all__ = [
    "supabase_client",
    "supabase_admin",
    "upload_photo_to_storage",
    "get_photo_public_url",
    "calculate_bmr_mifflin",
    "calculate_tdee",
    "estimate_1rm",
    "calculate_macro_targets",
    "validate_macro_balance",
    "sanitize_exercise_log",
    "check_overtraining_risk",
]
