from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.services.exercise_catalog import get_exercise_catalog, split_pipe
from app.services.plan_engine import generate_training_plan
from app.services.restrictions import REGION_RULES
from app.services.safety import SafetyGateError


ROOT = Path(__file__).resolve().parents[2]


def load_example(name: str) -> dict:
    return json.loads((ROOT / "frontend" / "examples" / name).read_text(encoding="utf-8"))


def iter_exercises(plan: dict):
    for week in plan["weeks"]:
        for session in week["sessions"]:
            for block in session.get("blocks", []):
                yield from block.get("exercises", [])


def test_marathon_plan_has_progression_and_schedule() -> None:
    profile = load_example("marathon-profile.json")
    plan = generate_training_plan(profile, duration_weeks=8)

    assert plan["durationWeeks"] == 8
    assert plan["sessionsPerWeek"] == 5
    assert len(plan["weeks"]) == 8
    assert all(len(week["sessions"]) == 5 for week in plan["weeks"])
    assert plan["weeks"][3]["loadFactor"] < plan["weeks"][2]["loadFactor"]
    assert plan["qualityChecks"]["generationMode"] == "deterministic-rule-engine"
    assert plan["athleteSnapshot"]["event"]["distance"] == "42,2 km"


def test_senior_shoulder_restriction_filters_blocked_movements_and_equipment() -> None:
    profile = load_example("active-senior-profile.json")
    plan = generate_training_plan(profile, duration_weeks=4)
    catalog = get_exercise_catalog()
    available = catalog.expand_equipment(
        profile["environment"]["equipmentIds"],
        profile["environment"]["locations"],
    )
    shoulder = REGION_RULES["shoulder"]

    selected = list(iter_exercises(plan))
    assert selected, "The plan should contain suitable exercises."
    for planned in selected:
        if not planned.get("exerciseId"):
            # The engine adds a deliberately scripted balance drill for older users.
            assert planned["name"] == "Tandemstand mit Haltemöglichkeit"
            continue
        exercise = catalog.by_id[planned["exerciseId"]]
        assert exercise["pattern_id"] not in shoulder["patterns"]
        assert exercise["primary_muscle_id"] not in shoulder["muscles"]
        assert set(split_pipe(exercise["required_equipment_ids"])).issubset(available)
        assert "überkopf" not in exercise["name_de"].casefold()


def test_safety_gate_blocks_unresolved_red_flags() -> None:
    profile = load_example("marathon-profile.json")
    profile["health"]["safetyFlags"] = [{"id": "chest_symptoms", "value": True}]

    with pytest.raises(SafetyGateError) as exc:
        generate_training_plan(profile, duration_weeks=4)

    assert "Brustschmerz" in str(exc.value)


def test_triathlon_plan_combines_three_disciplines_and_strength() -> None:
    profile = load_example("marathon-profile.json")
    profile["goals"]["sports"] = ["triathlon", "swimming", "cycling", "running", "strength"]
    profile["goals"]["event"].update({
        "type": "triathlon",
        "name": "Olympische Distanz",
        "distance": "1,5 km / 40 km / 10 km",
    })
    profile["schedule"].update({
        "desiredSessions": 6,
        "availableDays": ["mon", "tue", "wed", "thu", "sat", "sun"],
    })
    profile["environment"]["locations"] = ["home", "outdoor", "pool"]
    profile["environment"]["equipmentIds"] += ["BIKE", "POOL"]
    profile["health"]["painFree"] = True
    profile["health"]["restrictions"] = []
    profile["preferences"]["excludedExercises"] = ""

    plan = generate_training_plan(profile, duration_weeks=4)
    disciplines = {
        session["discipline"]
        for week in plan["weeks"]
        for session in week["sessions"]
    }

    assert {"Laufen", "Radfahren", "Schwimmen", "Krafttraining", "Triathlon"}.issubset(disciplines)
    assert all(len(week["sessions"]) == 6 for week in plan["weeks"])


def test_trail_event_uses_trail_specific_sessions() -> None:
    profile = load_example("marathon-profile.json")
    profile["goals"]["sports"] = ["trail", "strength"]
    profile["goals"]["event"].update({
        "type": "trail",
        "name": "Alpen-Trail",
        "distance": "35 km / 1'800 Hm",
    })
    profile["health"]["painFree"] = True
    profile["health"]["restrictions"] = []
    profile["preferences"]["excludedExercises"] = ""

    plan = generate_training_plan(profile, duration_weeks=4)
    trail_sessions = [
        session
        for week in plan["weeks"]
        for session in week["sessions"]
        if session["discipline"] == "Trailrunning"
    ]

    assert trail_sessions
    assert any("Trail" in session["title"] or "Berg" in session["title"] for session in trail_sessions)
    assert any(
        "Anstiegen" in item["details"] or "Abstiege" in item["details"]
        for session in trail_sessions
        for block in session["blocks"]
        for item in block.get("items", [])
    )


def test_generated_plan_matches_public_json_schema() -> None:
    from jsonschema import Draft202012Validator, FormatChecker

    profile = load_example("active-senior-profile.json")
    plan = generate_training_plan(profile, duration_weeks=4)
    schema = json.loads((ROOT / "docs" / "training-plan.schema.json").read_text(encoding="utf-8"))
    errors = list(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(plan))

    assert not errors, "\n".join(error.message for error in errors)


def test_upper_arm_avoid_skips_direct_arm_exercises() -> None:
    profile = load_example("active-senior-profile.json")
    profile["health"]["restrictions"] = [{
        "id": "arm-test",
        "region": "upper_arm",
        "side": "right",
        "intensity": 4,
        "symptoms": ["pain"],
        "duration": "weeks",
        "triggers": "Ellenbogen beugen oder strecken",
        "strategy": "avoid",
        "professionalClearance": "yes",
        "notes": "Direkte Armübungen vorerst auslassen."
    }]

    plan = generate_training_plan(profile, duration_weeks=4)
    catalog = get_exercise_catalog()
    blocked_muscles = REGION_RULES["upper_arm"]["muscles"]
    blocked_patterns = REGION_RULES["upper_arm"]["patterns"]

    for planned in iter_exercises(plan):
        if not planned.get("exerciseId"):
            continue
        exercise = catalog.by_id[planned["exerciseId"]]
        assert exercise["primary_muscle_id"] not in blocked_muscles
        assert exercise["pattern_id"] not in blocked_patterns
