"""
GymBud Backend — Application Configuration

Loads environment variables using Pydantic Settings.
Exposes a module-level `settings` instance for direct import:
    from app.config import settings
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ─── Environment ──────────────────────────────────
    ENVIRONMENT: str = "development"

    # ─── Supabase ─────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # ─── Gemini AI ────────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ─── JWT / Auth ───────────────────────────────────
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # ─── CORS ─────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:19006"

    # ─── Expo Push Notifications ──────────────────────
    EXPO_ACCESS_TOKEN: Optional[str] = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Module-level instance — import directly: `from app.config import settings`
settings = Settings()