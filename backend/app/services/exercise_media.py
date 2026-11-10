"""Exercise detail pages: catalogue facts and pictures.

Pictures and English step-by-step instructions come from the public domain
Free Exercise DB (see ``scripts/build_exercise_media.py``). The mapping file is
optional: without it the endpoint still returns the German catalogue data.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..config import get_settings
from .exercise_catalog import get_exercise_catalog, split_pipe


class ExerciseMedia:
    def __init__(self, path: Path, image_base_url: str):
        self.exercises: dict[str, dict[str, Any]] = {}
        self.sources: dict[str, dict[str, Any]] = {}
        self.source_info: dict[str, Any] = {}
        self.image_base_url = image_base_url.rstrip("/") + "/"
        if path.exists():
            with path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            self.exercises = data.get("exercises", {})
            self.sources = data.get("sources", {})
            self.source_info = data.get("source", {})

    def media_for(self, exercise_id: str) -> dict[str, Any] | None:
        mapping = self.exercises.get(exercise_id)
        if not mapping:
            return None
        source = self.sources.get(mapping["sourceId"])
        if not source:
            return None
        return {
            "sourceId": mapping["sourceId"],
            "sourceName": source.get("name"),
            "match": mapping.get("match", "variant"),
            "images": [self.image_base_url + image for image in source.get("images", [])],
            "instructions": list(source.get("instructions", [])),
            "instructionsLanguage": self.source_info.get("instructionsLanguage", "en"),
            "level": source.get("level"),
            "attribution": {
                "name": self.source_info.get("name", "Free Exercise DB"),
                "url": self.source_info.get("url", ""),
                "license": self.source_info.get("license", ""),
            },
        }


@lru_cache
def get_exercise_media() -> ExerciseMedia:
    settings = get_settings()
    return ExerciseMedia(settings.exercise_media_path, settings.exercise_media_base_url)


def build_exercise_detail(exercise_id: str) -> dict[str, Any] | None:
    catalog = get_exercise_catalog()
    exercise = catalog.by_id.get(exercise_id)
    if exercise is None:
        return None

    required_ids = split_pipe(exercise.get("required_equipment_ids"))
    equipment = catalog.equipment_names(required_ids)
    if not equipment:
        equipment = ["Körpergewicht"]

    pattern_id = exercise.get("pattern_id") or ""
    notes = [note.strip() for note in str(exercise.get("notes") or "").split("|") if note.strip()]
    goals = split_pipe(exercise.get("training_goals"))

    return {
        "exerciseId": exercise_id,
        "name": exercise.get("name_de"),
        "nameEn": exercise.get("name_en"),
        "aliases": split_pipe(exercise.get("aliases_de")),
        "family": exercise.get("family_de"),
        "category": exercise.get("category_de"),
        "pattern": exercise.get("pattern_de"),
        "patternId": pattern_id,
        "force": exercise.get("force_de"),
        "mechanic": exercise.get("mechanic_de"),
        "primaryMuscle": exercise.get("primary_muscle_de"),
        "secondaryMuscles": split_pipe(exercise.get("secondary_muscles_de")),
        "bodyRegion": exercise.get("body_region"),
        "equipment": equipment,
        "difficulty": exercise.get("difficulty_de"),
        "difficultyLevel": int(exercise.get("difficulty_1_5") or 0),
        "unilateral": bool(exercise.get("unilateral")),
        "bodyweight": bool(exercise.get("bodyweight")),
        "requiresCoaching": bool(exercise.get("requires_coaching")),
        "trainingGoals": goals,
        "notes": notes,
        "media": get_exercise_media().media_for(exercise_id),
    }
