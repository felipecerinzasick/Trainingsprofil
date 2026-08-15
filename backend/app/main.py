from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, plans, profile
from .config import get_settings
from .database import init_db
from .services.exercise_catalog import get_exercise_catalog


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    # Fail early if the exercise database is missing or malformed.
    get_exercise_catalog()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Full-Stack-MVP für Trainingsprofile, deterministische Planerstellung, "
        "Konten, Speicherung und PDF-Export."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(profile.router, prefix=settings.api_prefix)
app.include_router(plans.router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name, "version": "1.0.0"}


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {
        "message": "Trainingsplan API läuft.",
        "documentation": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
