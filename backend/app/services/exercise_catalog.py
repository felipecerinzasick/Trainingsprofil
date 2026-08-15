from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

from ..config import get_settings
from .restrictions import RestrictionRules, assess_exercise


def split_pipe(value: Any) -> list[str]:
    if value is None:
        return []
    return [part.strip() for part in str(value).split("|") if part.strip()]


@dataclass(frozen=True)
class RankedExercise:
    exercise: dict[str, Any]
    score: float
    adaptation_notes: tuple[str, ...]


class ExerciseCatalog:
    def __init__(self, path: Path):
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        self.metadata = data["metadata"]
        self.exercises: list[dict[str, Any]] = data["exercises"]
        self.equipment: dict[str, dict[str, Any]] = {
            item["equipment_id"]: item for item in data["equipment"]
        }
        self.muscles: dict[str, dict[str, Any]] = {
            item["muscle_id"]: item for item in data["muscles"]
        }
        self.by_id: dict[str, dict[str, Any]] = {
            item["exercise_id"]: item for item in self.exercises
        }

    def expand_equipment(self, selected: Iterable[str], locations: Iterable[str]) -> set[str]:
        available = {
            equipment_id
            for equipment_id, item in self.equipment.items()
            if item.get("default_available")
        }
        available.update(item for item in selected if item in self.equipment)
        locations_set = set(locations)
        if "gym" in locations_set:
            available.update(
                equipment_id
                for equipment_id, item in self.equipment.items()
                if item.get("full_gym")
            )
        if "pool" in locations_set:
            available.add("POOL")
        if "outdoor" in locations_set:
            available.add("OUTDOOR")

        changed = True
        while changed:
            changed = False
            for equipment_id in tuple(available):
                item = self.equipment.get(equipment_id)
                if not item:
                    continue
                for implied in split_pipe(item.get("implies_equipment_ids")):
                    if implied not in available:
                        available.add(implied)
                        changed = True
        return available

    def equipment_names(self, equipment_ids: Iterable[str]) -> list[str]:
        return [
            self.equipment[equipment_id]["name_de"]
            for equipment_id in equipment_ids
            if equipment_id in self.equipment
        ]

    def rank_exercises(
        self,
        *,
        available_equipment: set[str],
        restriction_rules: RestrictionRules,
        patterns: set[str] | None = None,
        categories: set[str] | None = None,
        max_difficulty: int = 3,
        allow_coaching: bool = False,
        preferred_styles: set[str] | None = None,
        excluded_families: set[str] | None = None,
        preferred_bodyweight: bool = False,
    ) -> list[RankedExercise]:
        preferred_styles = preferred_styles or set()
        excluded_families = excluded_families or set()
        ranked: list[RankedExercise] = []

        for exercise in self.exercises:
            if patterns and exercise.get("pattern_id") not in patterns:
                continue
            if categories and exercise.get("category_id") not in categories:
                continue
            if int(exercise.get("difficulty_1_5") or 5) > max_difficulty:
                continue
            if not allow_coaching and exercise.get("requires_coaching"):
                continue
            if int(exercise.get("variant_level_1_3") or 3) > 2:
                continue

            required = set(split_pipe(exercise.get("required_equipment_ids")))
            if not required.issubset(available_equipment):
                continue

            blocked, penalty, notes = assess_exercise(exercise, restriction_rules)
            if blocked:
                continue

            score = float(exercise.get("priority_score") or 0)
            score += float(exercise.get("commonness_1_5") or 0) * 2.4
            score += 5 if exercise.get("recommended_default_display") else 0
            score += 4 if exercise.get("is_compound") else 0
            if exercise.get("family_id") in excluded_families:
                score -= 42
            if preferred_bodyweight and exercise.get("bodyweight"):
                score += 8

            primary_equipment = exercise.get("primary_equipment_id")
            if "free_weights" in preferred_styles and primary_equipment in {
                "DUMBBELL", "BARBELL", "KETTLEBELL", "TRAP_BAR", "EZ_BAR"
            }:
                score += 10
            if "machines" in preferred_styles and primary_equipment and (
                "MACHINE" in primary_equipment or primary_equipment in {
                    "LEG_PRESS", "HACK_SQUAT", "LAT_PULLDOWN", "LOW_ROW", "SMITH"
                }
            ):
                score += 10
            if "bodyweight" in preferred_styles and exercise.get("bodyweight"):
                score += 10
            score -= penalty

            ranked.append(RankedExercise(exercise, score, tuple(notes)))

        ranked.sort(
            key=lambda item: (
                item.score,
                -int(item.exercise.get("difficulty_1_5") or 5),
                item.exercise.get("name_de", ""),
            ),
            reverse=True,
        )
        return ranked


@lru_cache

def get_exercise_catalog() -> ExerciseCatalog:
    settings = get_settings()
    return ExerciseCatalog(settings.exercise_database_path)
