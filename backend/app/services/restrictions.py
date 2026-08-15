from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


REGION_RULES: dict[str, dict[str, set[str]]] = {
    "neck": {
        "muscles": {"NECK", "TRAPS"},
        "patterns": {"neck", "carry"},
    },
    "shoulder": {
        "muscles": {"FRONT_DELTS", "SIDE_DELTS", "REAR_DELTS", "ROTATOR_CUFF", "SERRATUS"},
        "patterns": {"vertical_push", "shoulder_abduction", "throw"},
    },
    "upper_arm": {
        "muscles": {"BICEPS", "BRACHIALIS", "TRICEPS"},
        "patterns": {"elbow_flexion", "elbow_extension"},
    },
    "forearm_wrist": {
        "muscles": {"FOREARMS"},
        "patterns": {"wrist_grip", "carry"},
    },
    "chest": {
        "muscles": {"CHEST", "SERRATUS"},
        "patterns": {"horizontal_push"},
    },
    "upper_back": {
        "muscles": {"LATS", "TRAPS", "RHOMBOIDS", "REAR_DELTS"},
        "patterns": {"horizontal_pull", "vertical_pull", "scapular"},
    },
    "lower_back": {
        "muscles": {"ERECTORS"},
        "patterns": {"hinge", "carry", "trunk_flexion", "trunk_rotation"},
    },
    "hip_groin": {
        "muscles": {"GLUTES", "ADDUCTORS", "ABDUCTORS", "HIP_FLEXORS"},
        "patterns": {"squat", "lunge", "step", "hinge", "hip_extension", "hip_abduction", "hip_adduction"},
    },
    "thigh": {
        "muscles": {"QUADS", "HAMSTRINGS", "ADDUCTORS"},
        "patterns": {"squat", "lunge", "step", "hinge", "knee_flexion", "knee_extension"},
    },
    "knee": {
        "muscles": {"QUADS"},
        "patterns": {"squat", "lunge", "step", "knee_extension", "jump", "locomotion"},
    },
    "lower_leg": {
        "muscles": {"CALVES", "TIBIALIS"},
        "patterns": {"calf", "jump", "locomotion"},
    },
    "ankle_foot": {
        "muscles": {"CALVES", "TIBIALIS"},
        "patterns": {"calf", "jump", "locomotion"},
    },
}


TRIGGER_PATTERN_RULES: tuple[tuple[tuple[str, ...], set[str]], ...] = (
    (("ueberkopf", "überkopf", "overhead"), {"vertical_push", "vertical_pull", "shoulder_abduction"}),
    (("springen", "sprung", "jump", "hüpfen", "huepfen"), {"jump"}),
    (("laufen", "joggen", "rennen", "running"), {"locomotion", "cardio"}),
    (("bergab", "downhill"), {"locomotion"}),
    (("kniebeuge", "squat"), {"squat"}),
    (("ausfallschritt", "lunge"), {"lunge"}),
    (("treppe", "stufe", "step"), {"step"}),
    (("heben", "deadlift", "kreuzheben"), {"hinge"}),
    (("druecken", "drücken", "push"), {"horizontal_push", "vertical_push"}),
    (("ziehen", "pull"), {"horizontal_pull", "vertical_pull"}),
    (("drehen", "rotation"), {"trunk_rotation"}),
)


STOPWORDS = {
    "keine", "keinen", "keiner", "nicht", "ohne", "oder", "aber", "und", "eine", "einer",
    "einem", "einen", "uebungen", "übungen", "uebung", "übung", "hohem", "hoher", "volumen",
    "schnellen", "schnelle", "vorerst", "moechte", "möchte", "dabei", "wenn", "dass", "mich",
}


@dataclass
class RestrictionRules:
    blocked_muscles: set[str] = field(default_factory=set)
    blocked_patterns: set[str] = field(default_factory=set)
    penalized_muscles: set[str] = field(default_factory=set)
    penalized_patterns: set[str] = field(default_factory=set)
    monitored_muscles: set[str] = field(default_factory=set)
    monitored_patterns: set[str] = field(default_factory=set)
    blocked_equipment: set[str] = field(default_factory=set)
    excluded_name_tokens: set[str] = field(default_factory=set)
    notes: list[str] = field(default_factory=list)
    endurance_notes: list[str] = field(default_factory=list)
    avoid_high_impact: bool = False
    avoid_floor_transitions: bool = False


def _normalise(text: str) -> str:
    return text.casefold().replace("ß", "ss")


def _patterns_from_text(text: str) -> set[str]:
    normalised = _normalise(text)
    patterns: set[str] = set()
    for keywords, pattern_ids in TRIGGER_PATTERN_RULES:
        if any(_normalise(keyword) in normalised for keyword in keywords):
            patterns.update(pattern_ids)
    return patterns


def _name_tokens(text: str) -> set[str]:
    normalised = _normalise(text)
    tokens = {
        token for token in re.findall(r"[a-zäöü]{4,}", normalised)
        if token not in STOPWORDS
    }
    return tokens


def compile_restriction_rules(profile: dict[str, Any]) -> RestrictionRules:
    rules = RestrictionRules()
    health = profile.get("health", {})

    for restriction in health.get("restrictions", []):
        region = restriction.get("region", "")
        strategy = restriction.get("strategy", "adapt")
        intensity = int(restriction.get("intensity") or 0)
        mapped = REGION_RULES.get(region, {"muscles": set(), "patterns": set()})
        muscles = set(mapped["muscles"])
        patterns = set(mapped["patterns"])
        patterns.update(_patterns_from_text(f"{restriction.get('triggers', '')} {restriction.get('notes', '')}"))

        if strategy == "avoid":
            rules.blocked_muscles.update(muscles)
            rules.blocked_patterns.update(patterns)
        elif strategy == "adapt":
            rules.penalized_muscles.update(muscles)
            rules.penalized_patterns.update(patterns)
        else:
            rules.monitored_muscles.update(muscles)
            rules.monitored_patterns.update(patterns)

        if region in {"knee", "lower_leg", "ankle_foot", "hip_groin"} and strategy in {"avoid", "adapt"}:
            rules.avoid_high_impact = True

        side_labels = {
            "left": "links",
            "right": "rechts",
            "both": "beidseitig",
            "not_applicable": "",
        }
        side = side_labels.get(restriction.get("side", "not_applicable"), "")
        strategy_label = {
            "avoid": "vorerst aussparen",
            "adapt": "anpassen",
            "monitor": "beobachten",
        }.get(strategy, "anpassen")
        region_label = {
            "neck": "Nacken",
            "shoulder": "Schulter",
            "upper_arm": "Oberarm/Ellenbogen",
            "forearm_wrist": "Unterarm/Handgelenk",
            "chest": "Brustkorb",
            "upper_back": "oberer Rücken",
            "lower_back": "unterer Rücken",
            "hip_groin": "Hüfte/Leiste",
            "thigh": "Oberschenkel",
            "knee": "Knie",
            "lower_leg": "Unterschenkel/Wade",
            "ankle_foot": "Sprunggelenk/Fuss",
        }.get(region, region or "angegebener Bereich")
        note = f"{region_label}{f' ({side})' if side else ''}: Belastung {strategy_label}"
        if intensity:
            note += f"; angegebene Intensität {intensity}/10"
        rules.notes.append(note + ".")

        trigger_text = _normalise(restriction.get("triggers", ""))
        if "bergab" in trigger_text or "downhill" in trigger_text:
            rules.endurance_notes.append("Bergabtempo reduzieren und technische, kontrollierte Schritte bevorzugen.")
        if any(word in trigger_text for word in ("laufen", "joggen", "rennen")):
            rules.endurance_notes.append("Laufbelastung nur im beschwerdearmen Bereich durchführen; bei Bedarf durch eine gelenkschonende Einheit ersetzen.")

    conditions = set(health.get("conditions", []))
    if "Osteoporose / geringe Knochendichte" in conditions:
        rules.blocked_patterns.add("jump")
        rules.penalized_patterns.update({"trunk_flexion", "trunk_rotation"})
        rules.avoid_high_impact = True
        rules.notes.append("Bei geringer Knochendichte: ruckartige Sprünge und stark belastete Rumpfbeugung vermeiden.")
    if "Arthrose / Gelenkbeschwerden" in conditions:
        rules.notes.append("Gelenkbelastung über schmerzarmen Bewegungsumfang und ruhiges Tempo dosieren.")

    excluded = profile.get("preferences", {}).get("excludedExercises", "") or ""
    excluded_normalised = _normalise(excluded)
    rules.excluded_name_tokens.update(_name_tokens(excluded))
    explicit_patterns = _patterns_from_text(excluded)
    rules.blocked_patterns.update(explicit_patterns)

    if any(term in excluded_normalised for term in ("bodenwechsel", "vom boden", "aufstehen", "boden aufstehen")):
        rules.avoid_floor_transitions = True
        rules.blocked_equipment.add("MAT")
    if any(term in excluded_normalised for term in ("sprung", "springen", "hüpfen", "huepfen")):
        rules.avoid_high_impact = True
        rules.blocked_patterns.add("jump")

    return rules


def assess_exercise(exercise: dict[str, Any], rules: RestrictionRules) -> tuple[bool, int, list[str]]:
    """Return ``(blocked, ranking_penalty, adaptation_notes)`` for one exercise."""

    pattern = exercise.get("pattern_id", "")
    primary = exercise.get("primary_muscle_id", "")
    secondary = {
        item.strip() for item in str(exercise.get("secondary_muscle_ids", "")).split("|") if item.strip()
    }
    equipment = {
        item.strip() for item in str(exercise.get("required_equipment_ids", "")).split("|") if item.strip()
    }
    name = _normalise(f"{exercise.get('name_de', '')} {exercise.get('aliases_de', '')}")

    if pattern in rules.blocked_patterns or primary in rules.blocked_muscles:
        return True, 0, []
    if rules.blocked_equipment.intersection(equipment):
        return True, 0, []
    if any(token in name for token in rules.excluded_name_tokens):
        return True, 0, []

    penalty = 0
    notes: list[str] = []
    if pattern in rules.penalized_patterns:
        penalty += 28
        notes.append("Bewegungsumfang und Belastung konservativ wählen.")
    if primary in rules.penalized_muscles:
        penalty += 28
        notes.append("Nur beschwerdearm ausführen; bei Bedarf Alternative nutzen.")
    if secondary.intersection(rules.penalized_muscles):
        penalty += 10
    if pattern in rules.monitored_patterns or primary in rules.monitored_muscles:
        penalty += 6
        notes.append("Reaktion während und nach der Einheit beobachten.")
    if rules.avoid_floor_transitions and ("FLOOR" in equipment or "MAT" in equipment):
        penalty += 35
    if rules.avoid_high_impact and pattern == "jump":
        return True, 0, []
    return False, penalty, list(dict.fromkeys(notes))
