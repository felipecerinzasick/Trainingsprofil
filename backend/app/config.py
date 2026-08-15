from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables or ``backend/.env``."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_prefix="TRAINING_",
    )

    app_name: str = "Trainingsplan API"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'trainingsplan.db').as_posix()}"
    jwt_secret_key: str = "change-this-development-secret-before-deployment"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    google_client_id: str = ""
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    exercise_database_path: Path = BACKEND_DIR / "app" / "data" / "fitness_exercise_database_de.json"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("exercise_database_path", mode="before")
    @classmethod
    def resolve_exercise_path(cls, value: object) -> Path:
        path = Path(str(value))
        return path if path.is_absolute() else BACKEND_DIR / path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
