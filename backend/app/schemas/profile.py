from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProfileModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class EventTarget(ProfileModel):
    enabled: bool = False
    type: str = ""
    name: str = ""
    date: str = ""
    distance: str = ""
    targetTime: str = ""


class BodyRestriction(ProfileModel):
    id: str
    region: str
    side: Literal["left", "right", "both", "not_applicable"] = "not_applicable"
    intensity: int = Field(default=0, ge=0, le=10)
    symptoms: list[str] = Field(default_factory=list)
    duration: str = ""
    triggers: str = ""
    strategy: Literal["avoid", "adapt", "monitor"] = "adapt"
    professionalClearance: Literal["yes", "no", "not_needed"] = "not_needed"
    notes: str = ""


class SafetyFlag(ProfileModel):
    id: str
    value: bool = True


class Identity(ProfileModel):
    firstName: str = ""
    ageGroup: str = ""
    gender: str = ""
    heightCm: str = ""
    weightKg: str = ""


class Goals(ProfileModel):
    primaryGoal: str = ""
    secondaryGoals: list[str] = Field(default_factory=list)
    sports: list[str] = Field(default_factory=list)
    motivation: str = ""
    event: EventTarget = Field(default_factory=EventTarget)


class Experience(ProfileModel):
    level: str = ""
    currentTrainingDays: int = Field(default=0, ge=0, le=14)
    trainingHistoryYears: str = ""
    recentBreak: str = ""
    currentActivities: list[str] = Field(default_factory=list)
    weeklyRunningKm: str = ""
    longestRunKm: str = ""
    cyclingHours: str = ""
    swimmingMeters: str = ""
    currentRoutine: str = ""


class Schedule(ProfileModel):
    desiredSessions: int = Field(default=3, ge=1, le=14)
    availableDays: list[str] = Field(default_factory=list)
    sessionDuration: int = Field(default=45, ge=10, le=240)
    preferredTimes: list[str] = Field(default_factory=list)
    planStartDate: str = ""
    scheduleNotes: str = ""


class Environment(ProfileModel):
    locations: list[str] = Field(default_factory=list)
    equipmentIds: list[str] = Field(default_factory=list)
    equipmentNotes: str = ""


class Health(ProfileModel):
    painFree: bool | None = None
    restrictions: list[BodyRestriction] = Field(default_factory=list)
    safetyFlags: list[SafetyFlag] = Field(default_factory=list)
    safetyConfirmedNone: bool = False
    conditions: list[str] = Field(default_factory=list)
    medicationsNotes: str = ""
    healthNotes: str = ""


class Preferences(ProfileModel):
    likedStyles: list[str] = Field(default_factory=list)
    dislikedStyles: list[str] = Field(default_factory=list)
    coachingTone: str = "balanced"
    variety: int = Field(default=3, ge=1, le=5)
    indoorOutdoor: str = "balanced"
    excludedExercises: str = ""
    adherenceBarrier: str = ""


class Recovery(ProfileModel):
    sleepHours: float = Field(default=7.0, ge=0, le=24)
    sleepQuality: int = Field(default=3, ge=1, le=5)
    stressLevel: int = Field(default=3, ge=1, le=5)
    recoveryFeeling: int = Field(default=3, ge=1, le=5)
    sedentaryHours: str = ""


class Consent(ProfileModel):
    dataProcessing: bool = False
    healthAcknowledgement: bool = False
    optionalContact: bool = False


class TrainingProfile(ProfileModel):
    schemaVersion: str = "1.0"
    updatedAt: str = ""
    identity: Identity = Field(default_factory=Identity)
    goals: Goals = Field(default_factory=Goals)
    experience: Experience = Field(default_factory=Experience)
    schedule: Schedule = Field(default_factory=Schedule)
    environment: Environment = Field(default_factory=Environment)
    health: Health = Field(default_factory=Health)
    preferences: Preferences = Field(default_factory=Preferences)
    recovery: Recovery = Field(default_factory=Recovery)
    consent: Consent = Field(default_factory=Consent)
