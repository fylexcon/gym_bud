"""
GymBud — Fitcheck Pydantic Models

Schemas for daily physique photo uploads and AI analysis.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class FitcheckUploadResponse(BaseModel):
    """Response after uploading a fitcheck photo."""

    photo_id: str
    user_id: str
    photo_date: str
    photo_url: str
    pose: str
    ai_analysis: Optional[dict] = None
    message: str = "Photo uploaded successfully"


class FitcheckPhotoEntry(BaseModel):
    """A single fitcheck photo entry in the album."""

    id: str
    photo_date: str
    photo_url: str
    pose: str
    ai_analysis: Optional[dict] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None
    created_at: str


class FitcheckAlbumResponse(BaseModel):
    """Paginated album of fitcheck photos."""

    photos: list[FitcheckPhotoEntry]
    total_count: int
    page: int
    page_size: int


class PhotoAnalysisResult(BaseModel):
    """Gemini's analysis of a fitcheck photo."""

    estimated_body_fat_pct: Optional[float] = None
    muscle_symmetry_score: Optional[float] = None
    notable_changes: list[str] = []
    areas_to_improve: list[str] = []
    comparison_to_previous: str = ""
    posing_feedback: str = ""
    motivation: str = ""
    recommended_focus: str = ""
