from __future__ import annotations

from pydantic import BaseModel, Field


class ExerciseMediaAttribution(BaseModel):
    name: str
    url: str = ""
    license: str = ""


class ExerciseMediaOut(BaseModel):
    """Pictures and instructions from an openly licensed exercise dataset."""

    sourceId: str
    sourceName: str | None = None
    match: str = Field(description="exact, similar or variant")
    images: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    instructionsLanguage: str = "en"
    level: str | None = None
    attribution: ExerciseMediaAttribution


class ExerciseDetailOut(BaseModel):
    exerciseId: str
    name: str
    nameEn: str | None = None
    aliases: list[str] = Field(default_factory=list)
    family: str | None = None
    category: str | None = None
    pattern: str | None = None
    patternId: str = ""
    force: str | None = None
    mechanic: str | None = None
    primaryMuscle: str | None = None
    secondaryMuscles: list[str] = Field(default_factory=list)
    bodyRegion: str | None = None
    equipment: list[str] = Field(default_factory=list)
    difficulty: str | None = None
    difficultyLevel: int = 0
    unilateral: bool = False
    bodyweight: bool = False
    requiresCoaching: bool = False
    trainingGoals: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    media: ExerciseMediaOut | None = None
