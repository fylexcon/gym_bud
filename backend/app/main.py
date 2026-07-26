"""
GymBud Backend - FastAPI Application Entry Point

Configures the app with CORS, lifespan events, global exception handling,
a health check endpoint, and mounts all API routers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.routers import auth, users, plans, fitcheck, daily_log

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    logger.info("🚀 Starting GymBud API...")
    logger.info(f"   Environment : {settings.ENVIRONMENT}")
    logger.info(f"   Supabase    : {settings.SUPABASE_URL[:40]}...")
    logger.info(f"   CORS origins: {settings.cors_origins_list}")
    yield
    # ── Shutdown ──
    logger.info("🛑 Shutting down GymBud API...")


# ──────────────────────────────────────────────
# App Factory
# ──────────────────────────────────────────────

app = FastAPI(
    title="GymBud API",
    description="Backend services for the GymBud AI-Powered Fitness Application",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Global Exception Handler
# ──────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected server error occurred. Please try again later.",
        },
    )


# ──────────────────────────────────────────────
# Health Check (used by Render for zero-downtime deploys)
# ──────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


# ──────────────────────────────────────────────
# Mount Routers
# ──────────────────────────────────────────────

app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(users.router,     prefix="/api/v1/users",     tags=["Users"])
app.include_router(plans.router,     prefix="/api/v1/plans",     tags=["Plans"])
app.include_router(fitcheck.router,  prefix="/api/v1/fitcheck",  tags=["Fitcheck"])
app.include_router(daily_log.router, prefix="/api/v1/daily-log", tags=["Daily Log"])
