"""Exercise detail pages: catalogue facts, German technique cues and pictures.

Pictures come from the public domain
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


# Short German technique cues per movement pattern. They describe the family of
# movements, not one specific variant, and are shown next to the pictures.
PATTERN_CUES: dict[str, list[str]] = {
    "squat": [
        "Füsse etwa schulterbreit, Gewicht über dem ganzen Fuss verteilt.",
        "Hüfte und Knie gleichzeitig beugen; Knie folgen der Fussrichtung.",
        "Rumpf aufrecht und fest, Blick nach vorne, Fersen bleiben am Boden.",
        "Nur so tief, wie Technik und Rücken stabil bleiben.",
    ],
    "hinge": [
        "Hüfte nach hinten schieben, Knie bleiben leicht gebeugt.",
        "Rücken neutral: Bauch fest, Brustbein lang, kein Rundrücken.",
        "Last nah am Körper führen; Oberkörper neigt sich wie eine Wippe.",
        "Aufrichten über Gesäss und hintere Oberschenkel, Hüfte vollständig strecken.",
    ],
    "lunge": [
        "Langer, stabiler Schritt; vorderes Knie zeigt in Richtung Zehen.",
        "Oberkörper aufrecht, Rumpf fest, Blick nach vorne.",
        "Kontrolliert absenken, hinteres Knie zielt zum Boden.",
        "Mit dem vorderen Bein kräftig zurückdrücken.",
    ],
    "step": [
        "Ganzen Fuss auf die Stufe setzen, Knie zeigt über die Fussmitte.",
        "Mit dem oberen Bein hochdrücken statt mit dem unteren abzustossen.",
        "Oben stabil ausbalancieren, dann langsam und kontrolliert absteigen.",
    ],
    "hip_extension": [
        "Schultern oder Füsse stabil positionieren, Füsse hüftbreit.",
        "Hüfte über Gesässkraft nach oben drücken, oben kurz anspannen.",
        "Rippen unten halten; nicht ins Hohlkreuz drücken.",
    ],
    "knee_extension": [
        "Ruhig strecken, kurz halten und langsam zurückführen.",
        "Kein Schwung; die Bewegung aus dem Oberschenkel kontrollieren.",
    ],
    "knee_flexion": [
        "Fersen aktiv zum Gesäss ziehen, Hüfte stabil und gestreckt halten.",
        "Langsam nachgeben; die Rückwärtsbewegung kontrollieren.",
    ],
    "calf": [
        "Aus dem Fussballen hoch auf die Zehenspitzen, oben kurz halten.",
        "Langsam bis in die Dehnung absenken, Knie je nach Variante gestreckt oder gebeugt.",
    ],
    "horizontal_push": [
        "Schulterblätter leicht zusammen und nach unten, Handgelenke gerade.",
        "Ellbogen etwa 45 Grad vom Körper, nicht flach nach aussen.",
        "Kontrolliert absenken, kraftvoll drücken, Rumpf bleibt fest.",
    ],
    "vertical_push": [
        "Rumpf und Gesäss fest, Rippen unten, kein Hohlkreuz.",
        "Senkrecht über Kopf drücken, Kopf am Ende leicht durch die Arme.",
        "Ellbogen unter den Handgelenken, Schultern aktiv hochschieben.",
    ],
    "horizontal_pull": [
        "Zug mit den Schulterblättern beginnen, dann Ellbogen nach hinten führen.",
        "Rücken neutral, kein Schwung aus Hüfte oder Rücken.",
        "Am Ende kurz halten, dann langsam strecken.",
    ],
    "vertical_pull": [
        "Zuerst Schultern nach unten ziehen, dann Ellbogen zur Hüfte führen.",
        "Brust zur Stange oder zum Griff, Rumpf fest, kein Kippen.",
        "Kontrolliert absenken bis zur vollen Streckung.",
    ],
    "elbow_flexion": [
        "Ellbogen bleiben am Körper, nur der Unterarm bewegt sich.",
        "Ohne Schwung heben, langsam absenken.",
    ],
    "elbow_extension": [
        "Oberarm ruhig halten, nur im Ellbogen strecken.",
        "Volle Streckung ohne Überstrecken; Schulter bleibt stabil.",
    ],
    "shoulder_abduction": [
        "Mit leicht gebeugten Ellbogen bis etwa Schulterhöhe heben.",
        "Schultern unten lassen, kein Hochziehen zu den Ohren.",
        "Langsam absenken, kein Schwung.",
    ],
    "scapular": [
        "Schulterblätter bewusst zusammen und nach unten führen.",
        "Kleine, kontrollierte Bewegung; Nacken bleibt entspannt.",
    ],
    "anti_extension": [
        "Rippen zum Becken ziehen, unterer Rücken bleibt neutral.",
        "Bauch fest, ruhig weiteratmen, kein Durchhängen.",
    ],
    "anti_rotation": [
        "Hüfte und Schultern bleiben parallel ausgerichtet.",
        "Der Widerstand will drehen; der Rumpf hält dagegen.",
    ],
    "anti_lateral": [
        "Körper bildet eine gerade Linie, Hüfte sinkt nicht ab.",
        "Schulter stabil über dem Stützarm, ruhig atmen.",
    ],
    "trunk_flexion": [
        "Bewegung aus dem Bauch einleiten, nicht aus dem Nacken ziehen.",
        "Langsam und kontrolliert, oben kurz anspannen.",
    ],
    "trunk_rotation": [
        "Aus der Brustwirbelsäule drehen, Hüfte stabil halten.",
        "Kontrolliert in beide Richtungen, kein Schwung.",
    ],
    "carry": [
        "Aufrecht stehen, Schultern unten, Rumpf fest.",
        "Kleine, ruhige Schritte; Gewicht darf den Körper nicht kippen.",
    ],
    "locomotion": [
        "Rhythmus vor Tempo: gleichmässig und kontrolliert bewegen.",
        "Rumpf stabil, Atmung ruhig halten.",
    ],
    "jump": [
        "Weich landen: Knie und Hüfte beugen, Knie über den Zehen.",
        "Erst saubere Landung, dann Höhe oder Tempo steigern.",
    ],
    "throw": [
        "Kraft aus Beinen und Hüfte, Rumpf überträgt die Energie.",
        "Vollständig durchziehen und kontrolliert nachfassen.",
    ],
    "olympic": [
        "Technik vor Last: zuerst mit leichtem Gewicht üben.",
        "Rücken neutral, Stange nah am Körper, Hüfte explosiv strecken.",
        "Idealerweise mit Technikkontrolle durch eine Fachperson.",
    ],
    "wrist_grip": [
        "Griff bewusst fest halten, Handgelenk gerade.",
        "Kleine Bewegungen, lange Spannung, langsam absetzen.",
    ],
    "hip_abduction": [
        "Becken stabil halten, Bewegung nur aus der Hüfte.",
        "Langsam nach aussen führen, kontrolliert zurück.",
    ],
    "hip_adduction": [
        "Becken stabil, Bewegung nur aus dem Oberschenkel.",
        "Kontrolliert zusammenführen, langsam öffnen.",
    ],
    "neck": [
        "Sanfter Widerstand, kleine Bewegungen, kein Druckschmerz.",
        "Ruhig atmen, Schultern entspannt lassen.",
    ],
    "mobility": [
        "In die Position hineinatmen; Dehnung spürbar, aber nie schmerzhaft.",
        "Ruhig halten oder langsam bewegen, kein Federn.",
    ],
    "cardio": [
        "Belastung über Sprechtest steuern: Sätze sollten noch möglich sein.",
        "Gleichmässiges Tempo; Haltung aufrecht und locker.",
    ],
}

DEFAULT_CUES = [
    "Technisch saubere Wiederholungen haben Vorrang vor mehr Gewicht.",
    "Bewegung kontrolliert ausführen und bei Schmerzen abbrechen.",
]


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
    cues = PATTERN_CUES.get(pattern_id, DEFAULT_CUES)
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
        "cues": list(cues),
        "media": get_exercise_media().media_for(exercise_id),
    }
