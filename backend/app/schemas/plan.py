from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .profile import TrainingProfile


class GeneratePlanRequest(BaseModel):
    """Input for creating and saving a new training block."""

    profile: TrainingProfile | None = None
    title: str | None = Field(default=None, max_length=240)
    durationWeeks: int | None = Field(default=None, ge=4, le=16)

    @field_validator("durationWeeks")
    @classmethod
    def supported_duration(cls, value: int | None) -> int | None:
        if value is not None and value not in {4, 8, 12, 16}:
            raise ValueError("Unterstützt werden 4, 8, 12 oder 16 Wochen.")
        return value


class PlanListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    goalLabel: str
    sportFocus: str
    status: str
    safetyStatus: str
    startDate: date
    endDate: date
    durationWeeks: int
    createdAt: datetime


class PlanRecordOut(PlanListItem):
    plan: dict[str, Any]
    profileSnapshot: TrainingProfile


class PlanGenerationBlocked(BaseModel):
    code: str = "MEDICAL_CLEARANCE_REQUIRED"
    message: str
    notices: list[str] = Field(default_factory=list)
