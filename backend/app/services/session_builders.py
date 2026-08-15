from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

from .exercise_catalog import ExerciseCatalog, RankedExercise, split_pipe
from .restrictions import RestrictionRules


@dataclass
class PlanContext:
    profile: dict[str, Any]
    catalog: ExerciseCatalog
    restrictions: RestrictionRules
    available_equipment: set[str]
    goal_type: str
    discipline: str
    phase: str
    experience_level: str
    max_difficulty: int
    allow_coaching: bool
    is_senior: bool
    base_duration: int
    preferred_styles: set[str]
    preferred_bodyweight: bool


PATTERN_LABELS = {
    "squat": "Kniebeuge",
    "lunge": "Ausfallschritt/einbeinig",
    "step": "Aufsteigen/Absteigen",
    "hinge": "Hüftbeuge",
    "hip_extension": "Hüftstreckung",
    "knee_flexion": "Kniebeugung",
    "knee_extension": "Kniestreckung",
    "calf": "Wade/Sprunggelenk",
    "hip_abduction": "Hüftabduktion",
    "hip_adduction": "Hüftadduktion",
    "horizontal_push": "Horizontal drücken",
    "vertical_push": "Vertikal drücken",
    "horizontal_pull": "Horizontal ziehen",
    "vertical_pull": "Vertikal ziehen",
    "shoulder_abduction": "Schulterabduktion",
    "scapular": "Schulterblattkontrolle",
    "carry": "Tragen/Halten",
    "anti_extension": "Anti-Extension",
    "anti_rotation": "Anti-Rotation",
    "anti_lateral": "Anti-Lateralflexion",
    "trunk_flexion": "Rumpfbeugung",
    "trunk_rotation": "Rumpfrotation",
    "mobility": "Mobilität",
}


STRENGTH_TEMPLATES: dict[str, list[str]] = {
    "a": ["squat", "horizontal_push", "horizontal_pull", "hinge", "anti_extension", "carry"],
    "b": ["hinge", "vertical_pull", "vertical_push", "lunge", "hip_extension", "anti_rotation"],
    "c": ["step", "horizontal_pull", "horizontal_push", "hip_extension", "calf", "anti_lateral"],
    "upper_a": ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "elbow_flexion", "elbow_extension"],
    "upper_b": ["vertical_pull", "horizontal_push", "horizontal_pull", "shoulder_abduction", "elbow_extension", "anti_rotation"],
    "lower_a": ["squat", "hinge", "lunge", "knee_flexion", "calf", "anti_extension"],
    "lower_b": ["hinge", "step", "hip_extension", "knee_extension", "hip_abduction", "anti_lateral"],
    "senior_a": ["squat", "horizontal_pull", "horizontal_push", "step", "hip_extension", "anti_lateral"],
    "senior_b": ["hinge", "horizontal_pull", "horizontal_push", "lunge", "calf", "anti_rotation"],
    "light": ["squat", "horizontal_pull", "hip_extension", "horizontal_push", "anti_extension"],
}


PATTERN_FALLBACKS: dict[str, list[str]] = {
    "squat": ["step", "lunge", "knee_extension"],
    "lunge": ["step", "squat", "hip_extension"],
    "step": ["lunge", "squat", "calf"],
    "hinge": ["hip_extension", "knee_flexion"],
    "hip_extension": ["hinge", "squat"],
    "horizontal_push": ["vertical_push"],
    "vertical_push": ["horizontal_push", "shoulder_abduction"],
    "horizontal_pull": ["vertical_pull", "scapular"],
    "vertical_pull": ["horizontal_pull", "scapular"],
    "carry": ["anti_lateral", "anti_rotation"],
    "anti_extension": ["anti_rotation", "anti_lateral"],
    "anti_rotation": ["anti_lateral", "anti_extension"],
    "anti_lateral": ["anti_rotation", "carry"],
    "calf": ["step", "locomotion"],
}


SESSION_TITLES = {
    "a": "Ganzkörper A - stabile Basis",
    "b": "Ganzkörper B - Hüfte und Zugkraft",
    "c": "Ganzkörper C - einbeinig und alltagsnah",
    "upper_a": "Oberkörper A",
    "upper_b": "Oberkörper B",
    "lower_a": "Unterkörper A",
    "lower_b": "Unterkörper B",
    "senior_a": "Alltagskraft A - sicher und stabil",
    "senior_b": "Alltagskraft B - Haltung und Beine",
    "light": "Leichte Ganzkörpereinheit",
}


def parse_number(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"-?\d+(?:[.,]\d+)?", str(value))
    if not match:
        return default
    try:
        return float(match.group(0).replace(",", "."))
    except ValueError:
        return default


def round_to_5(value: float, minimum: int = 15) -> int:
    return max(minimum, int(5 * round(value / 5)))


def _coach_note(ctx: PlanContext, session_type: str) -> str:
    tone = ctx.profile.get("preferences", {}).get("coachingTone", "balanced")
    if tone == "supportive":
        return "Ruhig beginnen, saubere Wiederholungen sammeln und jede Einheit mit einem guten Gefühl beenden."
    if tone == "direct":
        return "Halte die Zielintensität ein. Qualität vor Zusatzvolumen; beende einen Satz, sobald die Technik nachlässt."
    if session_type == "strength":
        return "Lass etwa zwei technisch saubere Wiederholungen im Tank. Belastung nur steigern, wenn alle Sätze kontrolliert bleiben."
    return "Die Zielintensität ist wichtiger als Tempo oder Distanz. Passe den Umfang an die Tagesform an."


def _strength_exercise_count(duration: int) -> int:
    if duration <= 30:
        return 4
    if duration <= 45:
        return 5
    if duration <= 65:
        return 6
    return 7


def _variant_offset(variant: str) -> int:
    return {"a": 0, "b": 1, "c": 2, "upper_a": 0, "upper_b": 1, "lower_a": 0, "lower_b": 1, "senior_a": 0, "senior_b": 1, "light": 0}.get(variant, 0)


def _rank_for_pattern(
    ctx: PlanContext,
    pattern: str,
    excluded_families: set[str],
) -> list[RankedExercise]:
    ranked = ctx.catalog.rank_exercises(
        available_equipment=ctx.available_equipment,
        restriction_rules=ctx.restrictions,
        patterns={pattern},
        categories={"strength", "core", "conditioning", "prehab"},
        max_difficulty=ctx.max_difficulty,
        allow_coaching=ctx.allow_coaching,
        preferred_styles=ctx.preferred_styles,
        excluded_families=excluded_families,
        preferred_bodyweight=ctx.preferred_bodyweight,
    )
    if ranked:
        return ranked
    for fallback in PATTERN_FALLBACKS.get(pattern, []):
        ranked = ctx.catalog.rank_exercises(
            available_equipment=ctx.available_equipment,
            restriction_rules=ctx.restrictions,
            patterns={fallback},
            categories={"strength", "core", "conditioning", "prehab"},
            max_difficulty=ctx.max_difficulty,
            allow_coaching=ctx.allow_coaching,
            preferred_styles=ctx.preferred_styles,
            excluded_families=excluded_families,
            preferred_bodyweight=ctx.preferred_bodyweight,
        )
        if ranked:
            return ranked
    return []


def _prescription(
    ctx: PlanContext,
    exercise: dict[str, Any],
    exercise_index: int,
    week_number: int,
) -> dict[str, Any]:
    cycle_week = ((week_number - 1) % 4) + 1
    experience = ctx.experience_level
    is_main = exercise_index < 2 and bool(exercise.get("is_compound"))
    pattern = exercise.get("pattern_id", "")

    if ctx.is_senior or experience in {"new", "returning"}:
        base_sets = 2
        target_rpe = "5-7/10"
    elif experience == "experienced":
        base_sets = 4 if is_main else 3
        target_rpe = "7-8/10"
    else:
        base_sets = 3
        target_rpe = "6-8/10"

    if cycle_week == 3 and not ctx.is_senior:
        sets = min(base_sets + 1, 5)
    elif cycle_week == 4:
        sets = max(1, base_sets - 1)
    else:
        sets = base_sets

    if pattern in {"anti_extension", "anti_rotation", "anti_lateral", "carry"}:
        reps = "20-40 Sek. / 20-40 m"
        rest = 60
    elif is_main and ctx.goal_type == "strength":
        reps = "5-8"
        rest = 120
    elif is_main:
        reps = "6-10"
        rest = 90
    else:
        reps = "8-12" if exercise.get("is_compound") else "10-15"
        rest = 60

    if ctx.is_senior:
        reps = "6-10 kontrolliert" if is_main else "8-12 kontrolliert"
        rest = max(rest, 75)

    tempo = "3-1-2" if ctx.is_senior or experience in {"new", "returning"} else "kontrolliert"
    progression = {
        1: "Technik und passende Startlast finden.",
        2: "Bei sauberer Ausführung 1-2 Wiederholungen pro Satz ergänzen.",
        3: "Kleine Laststeigerung oder einen zusätzlichen Satz nutzen.",
        4: "Entlastungswoche: weniger Sätze, keine Wiederholung erzwingen.",
    }[cycle_week]

    return {
        "sets": sets,
        "reps": reps,
        "restSeconds": rest,
        "tempo": tempo,
        "targetRpe": target_rpe,
        "progression": progression,
    }


def _plan_exercise(
    ctx: PlanContext,
    ranked: RankedExercise,
    alternatives: list[RankedExercise],
    exercise_index: int,
    week_number: int,
) -> dict[str, Any]:
    exercise = ranked.exercise
    prescription = _prescription(ctx, exercise, exercise_index, week_number)
    required_ids = split_pipe(exercise.get("required_equipment_ids"))
    equipment = ctx.catalog.equipment_names(required_ids)
    notes = list(ranked.adaptation_notes)
    if exercise.get("unilateral"):
        notes.append("Beide Seiten trainieren; mit der schwächeren oder unsicheren Seite beginnen.")
    if exercise.get("requires_coaching"):
        notes.append("Technik vorab durch eine qualifizierte Person prüfen lassen.")

    return {
        "exerciseId": exercise.get("exercise_id"),
        "name": exercise.get("name_de"),
        "pattern": exercise.get("pattern_de") or PATTERN_LABELS.get(exercise.get("pattern_id", ""), ""),
        "primaryMuscle": exercise.get("primary_muscle_de"),
        "equipment": equipment,
        **prescription,
        "notes": list(dict.fromkeys(notes)),
        "alternatives": [
            {
                "exerciseId": candidate.exercise.get("exercise_id"),
                "name": candidate.exercise.get("name_de"),
            }
            for candidate in alternatives[:2]
        ],
    }


def build_strength_session(
    ctx: PlanContext,
    *,
    variant: str,
    week_number: int,
    load_factor: float,
) -> dict[str, Any]:
    if ctx.is_senior and variant in {"a", "b"}:
        variant = f"senior_{variant}"
    patterns = STRENGTH_TEMPLATES.get(variant, STRENGTH_TEMPLATES["a"])
    count = _strength_exercise_count(ctx.base_duration)
    if ctx.is_senior:
        count = min(count, 5)
    patterns = patterns[:count]

    selected: list[dict[str, Any]] = []
    used_families: set[str] = set()
    used_ids: set[str] = set()
    offset = _variant_offset(variant)

    for pattern in patterns:
        ranked = _rank_for_pattern(ctx, pattern, used_families)
        ranked = [item for item in ranked if item.exercise.get("exercise_id") not in used_ids]
        if not ranked:
            continue
        candidate_index = min(offset, max(0, len(ranked) - 1)) if len(ranked) > 2 else 0
        chosen = ranked[candidate_index]
        family_id = chosen.exercise.get("family_id")
        if family_id:
            used_families.add(family_id)
        used_ids.add(chosen.exercise.get("exercise_id"))
        alternatives = [item for item in ranked if item.exercise.get("exercise_id") not in used_ids]
        selected.append(_plan_exercise(ctx, chosen, alternatives, len(selected), week_number))

    if ctx.is_senior:
        selected.append({
            "exerciseId": None,
            "name": "Tandemstand mit Haltemöglichkeit",
            "pattern": "Gleichgewicht",
            "primaryMuscle": "Ganzkörper/Stabilität",
            "equipment": ["Stabiler Stuhl oder Wand"],
            "sets": 2,
            "reps": "20-30 Sek. pro Position",
            "restSeconds": 45,
            "tempo": "ruhig",
            "targetRpe": "3-5/10",
            "progression": "Haltekontakt nur reduzieren, wenn der Stand sicher bleibt.",
            "notes": ["Immer in Reichweite einer stabilen Haltemöglichkeit trainieren."],
            "alternatives": [{"exerciseId": None, "name": "Gewichtsverlagerung im Stand"}],
        })

    equipment = sorted({item for exercise in selected for item in exercise.get("equipment", [])})
    adaptations = list(ctx.restrictions.notes)
    if ctx.is_senior:
        adaptations.append("Ruhige Positionswechsel; keine Eile beim Hinsetzen, Aufstehen oder Gerätewechsel.")

    cycle_week = ((week_number - 1) % 4) + 1
    objective = {
        1: "Technik festigen und eine gut verträgliche Ausgangsbelastung finden.",
        2: "Wiederholungen innerhalb des Zielbereichs steigern.",
        3: "Den stärksten Trainingsreiz des Blocks setzen, ohne bis zum Muskelversagen zu gehen.",
        4: "Ermüdung abbauen und Bewegungsqualität erhalten.",
    }[cycle_week]

    return {
        "type": "strength",
        "discipline": "Krafttraining",
        "title": SESSION_TITLES.get(variant, "Ganzkörper-Krafttraining"),
        "subtitle": f"Woche {week_number}: {objective}",
        "durationMinutes": ctx.base_duration,
        "intensity": {
            "rpe": "5-8/10",
            "zone": "submaximal",
            "talkTest": "zwischen den Sätzen vollständig erholen",
        },
        "objective": objective,
        "warmup": [
            {"title": "Allgemein erwärmen", "details": "5-8 Minuten lockere Bewegung oder zügiges Gehen.", "durationMinutes": 6},
            {"title": "Bewegungen vorbereiten", "details": "Die ersten zwei Übungen je 1-2 leichte Vorbereitungssätze ausführen.", "durationMinutes": 5},
        ],
        "blocks": [{
            "type": "strength",
            "title": "Kraft-Hauptteil",
            "instructions": "Übungen nacheinander ausführen. Die angegebenen Pausen vollständig nutzen.",
            "exercises": selected,
        }],
        "cooldown": [
            {"title": "Ruhig ausklingen", "details": "2-5 Minuten locker bewegen und Atmung normalisieren.", "durationMinutes": 4},
        ],
        "equipment": equipment,
        "adaptations": list(dict.fromkeys(adaptations)),
        "coachNote": _coach_note(ctx, "strength"),
        "loadFactor": round(load_factor, 2),
    }


def build_mobility_session(
    ctx: PlanContext,
    *,
    week_number: int,
    focus: str = "mobility",
    load_factor: float = 1.0,
) -> dict[str, Any]:
    duration = round_to_5(min(ctx.base_duration, 40) * (0.85 if focus == "recovery" else 1.0), 20)
    ranked = ctx.catalog.rank_exercises(
        available_equipment=ctx.available_equipment,
        restriction_rules=ctx.restrictions,
        categories={"mobility", "prehab"},
        max_difficulty=min(ctx.max_difficulty, 3),
        allow_coaching=False,
        preferred_styles=ctx.preferred_styles,
        preferred_bodyweight=True,
    )
    selected: list[dict[str, Any]] = []
    families: set[str] = set()
    target_count = 6 if duration >= 30 else 4
    for item in ranked:
        family = item.exercise.get("family_id")
        if family in families:
            continue
        families.add(family)
        exercise = item.exercise
        selected.append({
            "exerciseId": exercise.get("exercise_id"),
            "name": exercise.get("name_de"),
            "pattern": exercise.get("pattern_de"),
            "primaryMuscle": exercise.get("primary_muscle_de"),
            "equipment": ctx.catalog.equipment_names(split_pipe(exercise.get("required_equipment_ids"))),
            "sets": 1 if focus == "recovery" else 2,
            "reps": "5-8 ruhige Wiederholungen oder 30-40 Sek.",
            "restSeconds": 20,
            "tempo": "langsam, ohne Federn",
            "targetRpe": "2-4/10",
            "progression": "Nur den schmerzfreien Bewegungsumfang allmählich erweitern.",
            "notes": list(item.adaptation_notes),
            "alternatives": [],
        })
        if len(selected) >= target_count:
            break

    if not selected:
        selected = [{
            "exerciseId": None,
            "name": "Ruhige Gelenkbewegungen im verfügbaren Bewegungsumfang",
            "pattern": "Mobilität",
            "primaryMuscle": "Ganzkörper",
            "equipment": [],
            "sets": 2,
            "reps": "5-8 pro Bewegung",
            "restSeconds": 20,
            "tempo": "langsam",
            "targetRpe": "2-3/10",
            "progression": "Bewegungsumfang nur bei guter Verträglichkeit erweitern.",
            "notes": [],
            "alternatives": [],
        }]

    title = "Aktive Erholung und Mobilität" if focus == "recovery" else "Mobilität und Bewegungskontrolle"
    return {
        "type": "mobility",
        "discipline": "Mobilität",
        "title": title,
        "subtitle": "Bewegungsqualität, Atmung und leichte Aktivierung",
        "durationMinutes": duration,
        "intensity": {"rpe": "2-4/10", "zone": "sehr locker", "talkTest": "ruhige Nasenatmung möglich"},
        "objective": "Beweglichkeit erhalten, Steifheit reduzieren und die nächste Belastung vorbereiten.",
        "warmup": [{"title": "Ankommen", "details": "2 Minuten ruhig gehen und bewusst atmen.", "durationMinutes": 2}],
        "blocks": [{
            "type": "mobility",
            "title": "Mobility-Flow",
            "instructions": "Alle Bewegungen kontrolliert und ohne aggressives Dehnen ausführen.",
            "exercises": selected,
        }],
        "cooldown": [{"title": "Atemfokus", "details": "1-2 Minuten langsam ausatmen und Spannung lösen.", "durationMinutes": 2}],
        "equipment": sorted({item for exercise in selected for item in exercise.get("equipment", [])}),
        "adaptations": list(dict.fromkeys(ctx.restrictions.notes)),
        "coachNote": _coach_note(ctx, "mobility"),
        "loadFactor": round(load_factor, 2),
    }


def _resolved_endurance_discipline(ctx: PlanContext, requested: str) -> tuple[str | None, list[str]]:
    adaptations: list[str] = []
    if requested in {"running", "trail", "hiking"} and "locomotion" in ctx.restrictions.blocked_patterns:
        if "BIKE" in ctx.available_equipment or "AIR_BIKE" in ctx.available_equipment:
            adaptations.append("Lauf-/Gehbelastung wurde wegen der angegebenen Einschränkung durch Radfahren ersetzt.")
            return "cycling", adaptations
        if "ELLIPTICAL" in ctx.available_equipment:
            adaptations.append("Laufbelastung wurde durch Crosstrainer ersetzt.")
            return "elliptical", adaptations
        if "ROWER" in ctx.available_equipment:
            adaptations.append("Laufbelastung wurde durch Rudern ersetzt.")
            return "rowing", adaptations
        if "POOL" in ctx.available_equipment:
            adaptations.append("Laufbelastung wurde durch eine Schwimmeinheit ersetzt.")
            return "swimming", adaptations
        return None, ["Für die geplante Ausdauerbelastung ist aufgrund der Einschränkung derzeit keine sichere automatische Alternative hinterlegt."]
    return requested, adaptations


def _endurance_duration(ctx: PlanContext, kind: str, discipline: str, load_factor: float) -> int:
    base = ctx.base_duration
    experience = ctx.experience_level
    if kind == "recovery":
        multiplier = 0.65
    elif kind == "long":
        if discipline in {"cycling", "hiking"}:
            multiplier = 2.0
        elif discipline == "swimming":
            multiplier = 1.2
        else:
            multiplier = 1.65 if experience in {"new", "returning"} else 1.9
    elif kind == "brick":
        multiplier = 1.55
    elif kind == "easy":
        multiplier = 0.9
    else:
        multiplier = 1.0

    duration = base * multiplier
    if kind in {"long", "brick"}:
        duration *= max(0.82, load_factor)
    elif kind != "quality":
        duration *= max(0.9, min(load_factor, 1.08))

    if experience in {"new", "returning"}:
        caps = {"running": 95, "trail": 105, "cycling": 135, "hiking": 150, "swimming": 75}
    else:
        caps = {"running": 150, "trail": 165, "cycling": 210, "hiking": 240, "swimming": 90}
    if ctx.is_senior:
        caps = {key: min(value, 90) for key, value in caps.items()}
    return round_to_5(min(duration, caps.get(discipline, 150)), 20)


def _running_blocks(ctx: PlanContext, kind: str, duration: int, week_number: int, trail: bool) -> list[dict[str, Any]]:
    main = max(10, duration - 18)
    experience = ctx.experience_level
    cycle_week = ((week_number - 1) % 4) + 1
    if kind == "easy":
        return [
            {"title": "Locker einlaufen", "dose": "8-10 Min.", "intensity": "RPE 2-3", "details": "Sehr ruhig beginnen; bei Bedarf Gehpausen."},
            {"title": "Ruhiger Dauerlauf", "dose": f"{main} Min.", "intensity": "RPE 3-4", "details": "Tempo so wählen, dass ganze Sätze möglich bleiben."},
            {"title": "Lockeres Auslaufen", "dose": "5 Min.", "intensity": "RPE 2", "details": "Schritte verkürzen und Atmung beruhigen."},
        ]
    if kind == "recovery":
        return [
            {"title": "Regenerativer Lauf/Gehmix", "dose": f"{duration - 5} Min.", "intensity": "RPE 2-3", "details": "Kein Tempodruck. Gehpausen sind Teil der Einheit."},
            {"title": "Mobil ausklingen", "dose": "5 Min.", "intensity": "sehr locker", "details": "Waden, Hüfte und Fussgelenke leicht bewegen."},
        ]
    if kind == "long":
        details = "Auf Anstiegen zügig gehen; technische Abstiege kontrolliert und ohne Tempodruck." if trail else "Gleichmässig locker laufen; Verpflegung und Trinken frühzeitig üben."
        return [
            {"title": "Einlaufen", "dose": "10 Min.", "intensity": "RPE 2-3", "details": "Sehr locker starten."},
            {"title": "Langer, ruhiger Hauptteil", "dose": f"{max(20, duration - 15)} Min.", "intensity": "RPE 3-5", "details": details},
            {"title": "Auslaufen/Gehen", "dose": "5 Min.", "intensity": "RPE 2", "details": "Puls und Atmung normalisieren."},
        ]

    if experience in {"new", "returning"}:
        work = "6 x 2 Min. zügig / 2 Min. locker"
        detail = "Zügig bedeutet kontrolliert, nicht sprinten."
    elif ctx.phase == "foundation":
        work = "5 x 4 Min. zügig / 2 Min. locker"
        detail = "Stabiler Rhythmus, die letzte Wiederholung soll technisch so sauber wie die erste sein."
    elif cycle_week == 3:
        work = "3 x 8 Min. an der Schwelle / 3 Min. locker"
        detail = "Hart, aber gleichmässig; keine Endspurts."
    else:
        work = "6 x 3 Min. zügig / 2 Min. locker"
        detail = "Kontrollierte Qualität, nicht maximal."
    if trail:
        detail += " Nach Möglichkeit bergauf arbeiten und bergab locker zurückkehren."
    return [
        {"title": "Einlaufen plus Lauf-ABC", "dose": "12-15 Min.", "intensity": "RPE 2-4", "details": "Locker laufen, danach 3 kurze Technikübungen."},
        {"title": "Qualitätsblock", "dose": work, "intensity": "RPE 6-8", "details": detail},
        {"title": "Auslaufen", "dose": "8-10 Min.", "intensity": "RPE 2-3", "details": "Sehr locker beenden."},
    ]


def _cycling_blocks(kind: str, duration: int, week_number: int) -> list[dict[str, Any]]:
    if kind in {"easy", "recovery"}:
        return [
            {"title": "Einrollen", "dose": "10 Min.", "intensity": "RPE 2", "details": "Leichter Gang, runder Tritt."},
            {"title": "Grundlagenteil", "dose": f"{max(15, duration - 15)} Min.", "intensity": "RPE 3-4", "details": "Ruhig und gleichmässig, ganze Sätze möglich."},
            {"title": "Ausrollen", "dose": "5 Min.", "intensity": "RPE 1-2", "details": "Kadenz locker halten."},
        ]
    if kind == "long":
        return [
            {"title": "Einrollen", "dose": "15 Min.", "intensity": "RPE 2-3", "details": "Langsam in die Belastung finden."},
            {"title": "Lange Ausfahrt", "dose": f"{max(30, duration - 25)} Min.", "intensity": "RPE 3-5", "details": "Verpflegung und Flüssigkeit regelmässig aufnehmen."},
            {"title": "Ausrollen", "dose": "10 Min.", "intensity": "RPE 2", "details": "Sehr locker beenden."},
        ]
    return [
        {"title": "Einrollen", "dose": "12 Min.", "intensity": "RPE 2-3", "details": "Drei kurze Kadenzsteigerungen einbauen."},
        {"title": "Intervalle", "dose": "5 x 5 Min. kräftig / 3 Min. locker", "intensity": "RPE 7-8", "details": "Leistung gleichmässig halten; nicht in der ersten Wiederholung überziehen."},
        {"title": "Ausrollen", "dose": "10 Min.", "intensity": "RPE 2", "details": "Locker treten."},
    ]


def _swimming_blocks(ctx: PlanContext, kind: str, duration: int) -> tuple[list[dict[str, Any]], int]:
    rate = 18 if ctx.experience_level in {"new", "returning"} else 25
    target = int(100 * round((duration * rate) / 100))
    target = max(600, min(target, 3200))
    if kind in {"easy", "recovery"}:
        blocks = [
            {"title": "Einschwimmen", "dose": "200 m locker", "intensity": "RPE 2-3", "details": "Lange Ausatmung ins Wasser."},
            {"title": "Technik", "dose": "6 x 50 m, 20 Sek. Pause", "intensity": "RPE 3", "details": "Abwechselnd Technikfokus und lockeres Schwimmen."},
            {"title": "Aerober Hauptteil", "dose": f"ca. {max(200, target - 600)} m", "intensity": "RPE 3-4", "details": "Kurze Pausen, gleichmässige Züge."},
            {"title": "Ausschwimmen", "dose": "100 m", "intensity": "RPE 2", "details": "Sehr locker."},
        ]
    elif kind == "long":
        blocks = [
            {"title": "Einschwimmen", "dose": "300 m", "intensity": "RPE 2-3", "details": "Locker variieren."},
            {"title": "Langer Hauptsatz", "dose": f"3-5 Serien bis insgesamt ca. {max(400, target - 500)} m", "intensity": "RPE 4-5", "details": "Pausen kurz halten und Technik stabilisieren."},
            {"title": "Ausschwimmen", "dose": "200 m", "intensity": "RPE 2", "details": "Entspannt beenden."},
        ]
    else:
        blocks = [
            {"title": "Einschwimmen", "dose": "300 m", "intensity": "RPE 2-3", "details": "Technik und Atmung vorbereiten."},
            {"title": "Technik", "dose": "6 x 50 m", "intensity": "RPE 3-4", "details": "Saubere Wasserlage und ruhiger Zug."},
            {"title": "Qualitätsblock", "dose": "8 x 100 m, 20-30 Sek. Pause", "intensity": "RPE 6-7", "details": "Gleichmässige Zeiten; Technik hat Vorrang."},
            {"title": "Ausschwimmen", "dose": "200 m", "intensity": "RPE 2", "details": "Locker."},
        ]
    return blocks, target


def _hiking_blocks(kind: str, duration: int) -> list[dict[str, Any]]:
    if kind == "quality":
        return [
            {"title": "Einlaufen", "dose": "10 Min.", "intensity": "RPE 2-3", "details": "Flach und locker beginnen."},
            {"title": "Anstiegsblock", "dose": "6 x 4 Min. bergauf / locker zurück", "intensity": "RPE 6-7", "details": "Kurze Schritte, stabile Haltung, Stöcke optional."},
            {"title": "Ausgehen", "dose": "10 Min.", "intensity": "RPE 2", "details": "Locker beenden."},
        ]
    return [
        {"title": "Ruhiger Start", "dose": "10 Min.", "intensity": "RPE 2-3", "details": "Tempo langsam aufbauen."},
        {"title": "Wander-/Gehteil", "dose": f"{max(15, duration - 15)} Min.", "intensity": "RPE 3-5", "details": "Aufrechte Haltung, gleichmässiger Schritt; Anstiege kontrolliert."},
        {"title": "Ausgehen", "dose": "5 Min.", "intensity": "RPE 2", "details": "Locker auslaufen."},
    ]


def _generic_cardio_blocks(discipline: str, kind: str, duration: int) -> list[dict[str, Any]]:
    label = {"elliptical": "Crosstrainer", "rowing": "Ruderergometer"}.get(discipline, "Ausdauergerät")
    if kind == "quality":
        main = "6 x 3 Min. kräftig / 2 Min. locker"
        intensity = "RPE 7"
    else:
        main = f"{max(15, duration - 15)} Min. gleichmässig"
        intensity = "RPE 3-4"
    return [
        {"title": f"{label}: locker beginnen", "dose": "8-10 Min.", "intensity": "RPE 2-3", "details": "Technik und Rhythmus finden."},
        {"title": "Hauptteil", "dose": main, "intensity": intensity, "details": "Bewegung kontrolliert und gleichmässig halten."},
        {"title": "Locker beenden", "dose": "5 Min.", "intensity": "RPE 2", "details": "Atmung beruhigen."},
    ]


def build_endurance_session(
    ctx: PlanContext,
    *,
    kind: str,
    discipline: str,
    week_number: int,
    load_factor: float,
) -> dict[str, Any]:
    resolved, replacement_notes = _resolved_endurance_discipline(ctx, discipline)
    if resolved is None:
        session = build_mobility_session(ctx, week_number=week_number, focus="recovery", load_factor=load_factor)
        session["title"] = "Schonende Ersatz- und Erholungseinheit"
        session["adaptations"] = list(dict.fromkeys(session["adaptations"] + replacement_notes))
        return session
    discipline = resolved
    duration = _endurance_duration(ctx, kind, discipline, load_factor)

    if kind == "brick":
        bike_minutes = round_to_5(duration * 0.62, 20)
        run_minutes = round_to_5(duration * 0.25, 10)
        if "locomotion" in ctx.restrictions.blocked_patterns:
            run_label = "zügiges Gehen oder zweite lockere Radphase"
        else:
            run_label = "lockerer Koppellauf"
        blocks = [
            {"title": "Rad", "dose": f"{bike_minutes} Min.", "intensity": "RPE 3-5", "details": "Gleichmässig fahren; die letzten 8 Minuten etwas höhere Kadenz."},
            {"title": "Wechsel", "dose": "3-5 Min.", "intensity": "ruhig", "details": "Geordnet wechseln, trinken, keine Hektik."},
            {"title": run_label.capitalize(), "dose": f"{run_minutes} Min.", "intensity": "RPE 3-4", "details": "Sehr kontrolliert beginnen und Schrittfrequenz stabil halten."},
        ]
        title = "Koppeleinheit Rad + Lauf"
        discipline_label = "Triathlon"
        target_meters = None
    elif discipline in {"running", "trail"}:
        blocks = _running_blocks(ctx, kind, duration, week_number, trail=discipline == "trail")
        title = {
            "easy": "Lockerer Dauerlauf" if discipline == "running" else "Lockerer Traillauf",
            "quality": "Tempo- und Techniklauf" if discipline == "running" else "Berg- und Traillaufqualität",
            "long": "Langer Lauf" if discipline == "running" else "Langer Trailrun",
            "recovery": "Regenerativer Lauf/Gehmix",
        }.get(kind, "Laufeinheit")
        discipline_label = "Laufen" if discipline == "running" else "Trailrunning"
        target_meters = None
    elif discipline == "cycling":
        blocks = _cycling_blocks(kind, duration, week_number)
        title = {"easy": "Lockere Grundlagenfahrt", "quality": "Radintervalle", "long": "Lange Ausfahrt", "recovery": "Regeneratives Rollen"}.get(kind, "Radeinheit")
        discipline_label = "Radfahren"
        target_meters = None
    elif discipline == "swimming":
        blocks, target_meters = _swimming_blocks(ctx, kind, duration)
        title = {"easy": "Technik und lockeres Schwimmen", "quality": "Schwimmqualität", "long": "Aerober Schwimmschwerpunkt", "recovery": "Lockeres Technikschwimmen"}.get(kind, "Schwimmeinheit")
        discipline_label = "Schwimmen"
    elif discipline == "hiking":
        blocks = _hiking_blocks(kind, duration)
        title = "Anstiegs- und Trittsicherheit" if kind == "quality" else "Lange Wanderung" if kind == "long" else "Zügiges Gehen/Wandern"
        discipline_label = "Wandern"
        target_meters = None
    else:
        blocks = _generic_cardio_blocks(discipline, kind, duration)
        title = "Ausdauerintervalle" if kind == "quality" else "Ruhige Ausdauereinheit"
        discipline_label = {"elliptical": "Crosstrainer", "rowing": "Rudern"}.get(discipline, "Ausdauer")
        target_meters = None

    intensity = {
        "easy": {"rpe": "3-4/10", "zone": "Zone 2", "talkTest": "ganze Sätze möglich"},
        "recovery": {"rpe": "2-3/10", "zone": "Zone 1-2", "talkTest": "sehr lockere Unterhaltung"},
        "long": {"rpe": "3-5/10", "zone": "überwiegend Zone 2", "talkTest": "meist ganze Sätze möglich"},
        "quality": {"rpe": "6-8/10", "zone": "wechselnd Zone 2-4", "talkTest": "im Arbeitsintervall nur kurze Sätze"},
        "brick": {"rpe": "3-6/10", "zone": "überwiegend Zone 2", "talkTest": "kontrolliert"},
    }.get(kind, {"rpe": "3-5/10", "zone": "moderat", "talkTest": "kontrolliert"})

    adaptations = list(ctx.restrictions.endurance_notes) + replacement_notes
    if ctx.restrictions.avoid_high_impact and discipline in {"running", "trail"}:
        adaptations.append("Keine Sprünge oder harten Sprints; flache, gut kontrollierbare Strecke bevorzugen.")
    adaptations.extend(ctx.restrictions.notes)

    return {
        "type": "endurance",
        "discipline": discipline_label,
        "title": title,
        "subtitle": f"Woche {week_number} - {duration} Minuten" + (f" / ca. {target_meters} m" if target_meters else ""),
        "durationMinutes": duration,
        "intensity": intensity,
        "objective": {
            "easy": "Aerobe Basis und effiziente, entspannte Bewegung entwickeln.",
            "recovery": "Durchblutung fördern, ohne zusätzliche Ermüdung aufzubauen.",
            "long": "Ausdauer, Energieversorgung und mentale Ruhe unter längerer Belastung entwickeln.",
            "quality": "Gezielt an Tempo, Schwelle oder Technik arbeiten, ohne maximal zu trainieren.",
            "brick": "Den Wechsel zwischen Disziplinen und das kontrollierte Weiterarbeiten üben.",
        }.get(kind, "Ausdauer gezielt entwickeln."),
        "warmup": [],
        "blocks": [{"type": "endurance", "title": "Einheitsablauf", "instructions": "Die Intensität über RPE und Sprechtest steuern.", "items": blocks}],
        "cooldown": [],
        "equipment": ctx.catalog.equipment_names(
            [
                {"cycling": "BIKE", "swimming": "POOL", "elliptical": "ELLIPTICAL", "rowing": "ROWER"}.get(discipline, "OUTDOOR")
            ]
        ),
        "adaptations": list(dict.fromkeys(adaptations)),
        "coachNote": _coach_note(ctx, "endurance"),
        "loadFactor": round(load_factor, 2),
    }


def build_session(
    ctx: PlanContext,
    blueprint: dict[str, Any],
    *,
    week_number: int,
    load_factor: float,
) -> dict[str, Any]:
    kind = blueprint["kind"]
    if kind == "strength":
        return build_strength_session(
            ctx,
            variant=blueprint.get("variant", "a"),
            week_number=week_number,
            load_factor=load_factor,
        )
    if kind == "mobility":
        return build_mobility_session(
            ctx,
            week_number=week_number,
            focus=blueprint.get("focus", "mobility"),
            load_factor=load_factor,
        )
    return build_endurance_session(
        ctx,
        kind=kind,
        discipline=blueprint.get("discipline", ctx.discipline),
        week_number=week_number,
        load_factor=load_factor,
    )
