from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from .exercise_catalog import ExerciseCatalog, get_exercise_catalog
from .restrictions import compile_restriction_rules
from .safety import evaluate_safety
from .session_builders import PlanContext, build_session


WEEKDAY_ORDER = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
WEEKDAY_LABELS = {
    "mon": "Montag", "tue": "Dienstag", "wed": "Mittwoch", "thu": "Donnerstag",
    "fri": "Freitag", "sat": "Samstag", "sun": "Sonntag",
}
SPORT_LABELS = {
    "strength": "Krafttraining", "running": "Laufen", "trail": "Trailrunning",
    "cycling": "Radfahren", "swimming": "Schwimmen", "triathlon": "Triathlon",
    "hiking": "Wandern", "mobility": "Mobilität", "other": "andere Aktivität",
}
GOAL_LABELS = {
    "healthy_strength": "Stark und gesund bleiben",
    "strength_muscle": "Kraft und Muskeln aufbauen",
    "endurance": "Ausdauer verbessern",
    "event": "Auf ein konkretes Ziel vorbereiten",
    "mobility": "Beweglicher und belastbarer werden",
    "return": "Sicher wieder einsteigen",
    "weight": "Körpergewicht nachhaltig regulieren",
}
EXPERIENCE_LABELS = {
    "new": "Einsteiger/in",
    "returning": "Wiedereinstieg",
    "regular": "regelmässig trainierend",
    "experienced": "erfahren",
}
PHASE_LABELS = {
    "foundation": "Grundlagenphase",
    "build": "Aufbauphase",
    "specific": "spezifische Vorbereitungsphase",
    "taper": "Reduktions- und Wettkampfphase",
}


def _parse_iso_date(value: str | None, fallback: date | None = None) -> date:
    if value:
        try:
            return date.fromisoformat(value)
        except ValueError:
            pass
    return fallback or date.today()


def _event_phase(profile: dict[str, Any], start_on: date) -> str:
    event = profile.get("goals", {}).get("event", {})
    if not event.get("enabled") or not event.get("date"):
        return "foundation"
    event_date = _parse_iso_date(event.get("date"), start_on)
    days = (event_date - start_on).days
    if days <= 0:
        return "foundation"
    if days <= 21:
        return "taper"
    if days <= 56:
        return "specific"
    if days <= 112:
        return "build"
    return "foundation"


def _goal_and_discipline(profile: dict[str, Any]) -> tuple[str, str]:
    goals = profile.get("goals", {})
    primary = goals.get("primaryGoal", "healthy_strength")
    sports = goals.get("sports", [])
    event = goals.get("event", {})
    event_type = event.get("type") if event.get("enabled") else ""

    if primary == "event" or event_type:
        discipline = event_type or next((sport for sport in ("triathlon", "trail", "running", "cycling", "hiking", "strength") if sport in sports), "running")
        if discipline == "running":
            distance = f"{event.get('distance', '')} {event.get('name', '')}".casefold()
            if "42" in distance or "marathon" in distance:
                return "marathon", "running"
            if "21" in distance or "halbmarathon" in distance or "half" in distance:
                return "half_marathon", "running"
            return "running_event", "running"
        if discipline == "trail":
            return "trail", "trail"
        if discipline == "triathlon":
            return "triathlon", "triathlon"
        if discipline == "cycling":
            return "cycling", "cycling"
        if discipline == "hiking":
            return "hiking", "hiking"
        if discipline == "strength":
            return "strength", "strength"

    if primary == "strength_muscle":
        return "strength", "strength"
    if primary == "healthy_strength":
        return "health_strength", "strength"
    if primary == "mobility":
        return "mobility", "mobility"
    if primary == "return":
        return "return", next((sport for sport in ("running", "cycling", "swimming", "hiking") if sport in sports), "strength")
    if primary == "weight":
        return "hybrid", next((sport for sport in ("running", "cycling", "swimming", "hiking") if sport in sports), "running")
    if primary == "endurance":
        discipline = next((sport for sport in ("triathlon", "trail", "running", "cycling", "swimming", "hiking") if sport in sports), "running")
        return discipline if discipline != "running" else "endurance", discipline
    return "health_strength", "strength"


def _max_difficulty(experience: str, is_senior: bool) -> tuple[int, bool]:
    if experience == "experienced" and not is_senior:
        return 4, True
    if experience == "regular" and not is_senior:
        return 3, False
    return 2, False


def _evenly_select_days(available_days: list[str], count: int, prefer_weekend: bool) -> list[str]:
    days = sorted({day for day in available_days if day in WEEKDAY_ORDER}, key=WEEKDAY_ORDER.get)
    if not days:
        days = ["mon", "wed", "sat"]
    count = max(1, min(count, len(days)))
    if count == len(days):
        selected = days[:]
    elif count == 1:
        selected = [days[len(days) // 2]]
    else:
        indices = []
        for i in range(count):
            index = round(i * (len(days) - 1) / (count - 1))
            if index not in indices:
                indices.append(index)
        for index in range(len(days)):
            if len(indices) >= count:
                break
            if index not in indices:
                indices.append(index)
        selected = sorted((days[index] for index in indices[:count]), key=WEEKDAY_ORDER.get)

    if prefer_weekend and count >= 2:
        weekend = next((day for day in ("sun", "sat") if day in days), None)
        if weekend and weekend not in selected:
            selected[-1] = weekend
            selected = sorted(set(selected), key=WEEKDAY_ORDER.get)
            while len(selected) < count:
                for day in days:
                    if day not in selected:
                        selected.append(day)
                        break
                selected.sort(key=WEEKDAY_ORDER.get)
    return selected


def _next_occurrence(start: date, weekday_id: str) -> date:
    target = WEEKDAY_ORDER[weekday_id]
    return start + timedelta(days=(target - start.weekday()) % 7)


def _first_cycle_dates(start: date, selected_days: list[str]) -> list[tuple[str, date]]:
    occurrences = [(day, _next_occurrence(start, day)) for day in selected_days]
    return sorted(occurrences, key=lambda item: item[1])


def _fit(sequence: list[dict[str, Any]], count: int, fillers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = sequence[:count]
    index = 0
    while len(result) < count:
        result.append(fillers[index % len(fillers)].copy())
        index += 1
    return result


def _blueprints(goal_type: str, discipline: str, count: int) -> list[dict[str, Any]]:
    strength_a = {"kind": "strength", "variant": "a"}
    strength_b = {"kind": "strength", "variant": "b"}
    strength_c = {"kind": "strength", "variant": "c"}
    mobility = {"kind": "mobility", "focus": "mobility"}
    recovery_mobility = {"kind": "mobility", "focus": "recovery"}

    if goal_type == "strength":
        mapping = {
            1: [strength_a],
            2: [strength_a, strength_b],
            3: [strength_a, strength_b, strength_c],
            4: [
                {"kind": "strength", "variant": "lower_a"},
                {"kind": "strength", "variant": "upper_a"},
                {"kind": "strength", "variant": "lower_b"},
                {"kind": "strength", "variant": "upper_b"},
            ],
        }
        return _fit(mapping.get(count, mapping[4]), count, [mobility, strength_c])

    if goal_type == "health_strength":
        mapping = {
            1: [strength_a],
            2: [strength_a, strength_b],
            3: [strength_a, {"kind": "easy", "discipline": "hiking"}, strength_b],
            4: [strength_a, mobility, strength_b, {"kind": "easy", "discipline": "hiking"}],
        }
        return _fit(mapping.get(count, mapping[4]), count, [strength_c, recovery_mobility])

    if goal_type == "mobility":
        return _fit([mobility, {"kind": "strength", "variant": "light"}, recovery_mobility, {"kind": "easy", "discipline": "hiking"}], count, [mobility])

    if goal_type == "return":
        return _fit([strength_a, {"kind": "easy", "discipline": discipline}, strength_b, recovery_mobility], count, [{"kind": "easy", "discipline": discipline}])

    if goal_type == "hybrid":
        return _fit([strength_a, {"kind": "easy", "discipline": discipline}, strength_b, {"kind": "quality", "discipline": discipline}, {"kind": "long", "discipline": discipline}], count, [recovery_mobility])

    if goal_type == "triathlon" or discipline == "triathlon":
        mapping = {
            1: [{"kind": "easy", "discipline": "running"}],
            2: [{"kind": "easy", "discipline": "swimming"}, {"kind": "easy", "discipline": "cycling"}],
            3: [{"kind": "easy", "discipline": "swimming"}, {"kind": "easy", "discipline": "cycling"}, {"kind": "easy", "discipline": "running"}],
            4: [{"kind": "easy", "discipline": "swimming"}, {"kind": "quality", "discipline": "cycling"}, strength_a, {"kind": "long", "discipline": "running"}],
            5: [{"kind": "easy", "discipline": "swimming"}, {"kind": "quality", "discipline": "cycling"}, {"kind": "easy", "discipline": "running"}, strength_a, {"kind": "brick", "discipline": "triathlon"}],
            6: [{"kind": "easy", "discipline": "swimming"}, {"kind": "quality", "discipline": "running"}, {"kind": "long", "discipline": "cycling"}, strength_a, {"kind": "quality", "discipline": "swimming"}, {"kind": "brick", "discipline": "triathlon"}],
            7: [{"kind": "easy", "discipline": "swimming"}, {"kind": "quality", "discipline": "running"}, {"kind": "easy", "discipline": "cycling"}, strength_a, {"kind": "quality", "discipline": "swimming"}, {"kind": "long", "discipline": "cycling"}, {"kind": "long", "discipline": "running"}],
        }
        return mapping[min(max(count, 1), 7)]

    if discipline in {"running", "trail"}:
        mapping = {
            1: [{"kind": "easy", "discipline": discipline}],
            2: [{"kind": "easy", "discipline": discipline}, {"kind": "long", "discipline": discipline}],
            3: [{"kind": "easy", "discipline": discipline}, {"kind": "quality", "discipline": discipline}, {"kind": "long", "discipline": discipline}],
            4: [{"kind": "easy", "discipline": discipline}, strength_a, {"kind": "quality", "discipline": discipline}, {"kind": "long", "discipline": discipline}],
            5: [{"kind": "easy", "discipline": discipline}, strength_a, {"kind": "quality", "discipline": discipline}, {"kind": "recovery", "discipline": discipline}, {"kind": "long", "discipline": discipline}],
            6: [{"kind": "easy", "discipline": discipline}, strength_a, {"kind": "quality", "discipline": discipline}, {"kind": "recovery", "discipline": discipline}, strength_b, {"kind": "long", "discipline": discipline}],
            7: [{"kind": "easy", "discipline": discipline}, strength_a, {"kind": "quality", "discipline": discipline}, {"kind": "recovery", "discipline": discipline}, {"kind": "easy", "discipline": discipline}, strength_b, {"kind": "long", "discipline": discipline}],
        }
        return mapping[min(max(count, 1), 7)]

    if discipline in {"cycling", "swimming", "hiking"}:
        mapping = {
            1: [{"kind": "easy", "discipline": discipline}],
            2: [{"kind": "easy", "discipline": discipline}, {"kind": "long", "discipline": discipline}],
            3: [{"kind": "easy", "discipline": discipline}, {"kind": "quality", "discipline": discipline}, {"kind": "long", "discipline": discipline}],
            4: [{"kind": "easy", "discipline": discipline}, strength_a, {"kind": "quality", "discipline": discipline}, {"kind": "long", "discipline": discipline}],
            5: [{"kind": "easy", "discipline": discipline}, strength_a, {"kind": "quality", "discipline": discipline}, recovery_mobility, {"kind": "long", "discipline": discipline}],
        }
        return _fit(mapping.get(count, mapping[5]), count, [strength_b, {"kind": "easy", "discipline": discipline}])

    return _fit([strength_a, {"kind": "easy", "discipline": "hiking"}, strength_b], count, [mobility])


def _load_factors(duration_weeks: int, phase: str, conservative: bool) -> list[float]:
    factors: list[float] = []
    for week in range(1, duration_weeks + 1):
        cycle = ((week - 1) % 4) + 1
        block = (week - 1) // 4
        if phase == "taper":
            factor = {1: 0.78, 2: 0.68, 3: 0.58, 4: 0.45}[cycle]
        else:
            factor = {1: 0.90, 2: 1.00, 3: 1.08, 4: 0.78}[cycle] + block * 0.04
            if phase == "specific" and cycle in {2, 3}:
                factor += 0.03
        if conservative:
            factor = min(factor, 1.02)
        factors.append(round(factor, 2))
    return factors


def _week_theme(week_number: int, phase: str) -> tuple[str, str]:
    cycle = ((week_number - 1) % 4) + 1
    if phase == "taper":
        themes = {
            1: ("Frische aufbauen", "Umfang reduzieren, kurze Qualitätsreize behalten."),
            2: ("Spezifisch und kurz", "Wettkampfnah trainieren, aber Ermüdung vermeiden."),
            3: ("Entlasten", "Nur kurze, vertraute Reize setzen."),
            4: ("Bereit sein", "Erholung, Routine und Selbstvertrauen priorisieren."),
        }
    else:
        themes = {
            1: ("Ankommen und Technik", "Belastung kalibrieren und Bewegungsqualität sichern."),
            2: ("Stabilisieren", "Wiederholungen oder Zeit moderat erweitern."),
            3: ("Aufbaureiz", "Stärkste Woche des Zyklus, ohne maximale Belastungen."),
            4: ("Entlasten und festigen", "Umfang reduzieren und Anpassung ermöglichen."),
        }
    return themes[cycle]


def _plan_title(profile: dict[str, Any], goal_type: str, duration_weeks: int, custom: str | None) -> str:
    if custom and custom.strip():
        return custom.strip()
    event = profile.get("goals", {}).get("event", {})
    if event.get("enabled") and event.get("name"):
        return f"{event['name']} - {duration_weeks}-Wochen-Trainingsblock"
    titles = {
        "marathon": "Marathon-Aufbaublock",
        "half_marathon": "Halbmarathon-Aufbaublock",
        "running_event": "Lauf-Aufbaublock",
        "trail": "Trailrunning-Aufbaublock",
        "triathlon": "Triathlon-Aufbaublock",
        "cycling": "Rad-Ausdauerblock",
        "swimming": "Schwimm-Aufbaublock",
        "hiking": "Wander- und Trekkingblock",
        "strength": "Kraftaufbau",
        "health_strength": "Stark im Alltag",
        "mobility": "Beweglich und belastbar",
        "return": "Sicher zurück ins Training",
        "hybrid": "Kraft und Ausdauer kombiniert",
        "endurance": "Ausdauer-Grundlagenblock",
    }
    return f"{titles.get(goal_type, 'Persönlicher Trainingsplan')} - {duration_weeks} Wochen"


def _principles(profile: dict[str, Any], goal_type: str, phase: str) -> list[str]:
    principles = [
        "Die geplante Intensität wird über RPE und den Sprechtest gesteuert - nicht über ein starres Tempo.",
        "Technisch saubere, gut verträgliche Wiederholungen haben Vorrang vor zusätzlichem Gewicht oder Umfang.",
        "Die vierte Woche jedes Blocks reduziert die Belastung, damit Anpassung und Erholung stattfinden können.",
    ]
    if goal_type in {"marathon", "half_marathon", "running_event", "trail", "triathlon", "cycling", "swimming", "hiking", "endurance"}:
        principles.append("Ruhige Einheiten bilden die Basis; Qualitätsreize bleiben gezielt und klar begrenzt.")
    if goal_type in {"strength", "health_strength", "return", "hybrid"}:
        principles.append("Last erst steigern, wenn der obere Wiederholungsbereich mit stabiler Technik erreicht wird.")
    if phase == "taper":
        principles.append("In der Wettkampfphase sinkt der Umfang deutlich, während kurze vertraute Reize erhalten bleiben.")
    if profile.get("preferences", {}).get("adherenceBarrier") == "Zeitmangel":
        principles.append("Bei Zeitmangel zuerst Zubehör kürzen; Hauptteil und Warm-up bleiben bestehen.")
    return principles


def generate_training_plan(
    profile: dict[str, Any],
    *,
    duration_weeks: int = 4,
    title: str | None = None,
    catalog: ExerciseCatalog | None = None,
    plan_id: str | None = None,
) -> dict[str, Any]:
    """Create a deterministic, auditable training block from a validated profile."""

    catalog = catalog or get_exercise_catalog()
    safety = evaluate_safety(profile)
    restrictions = compile_restriction_rules(profile)
    start_on = _parse_iso_date(profile.get("schedule", {}).get("planStartDate"), date.today())
    goal_type, discipline = _goal_and_discipline(profile)
    phase = _event_phase(profile, start_on)
    experience = profile.get("experience", {}).get("level", "returning")
    age_group = profile.get("identity", {}).get("ageGroup", "")
    is_senior = age_group in {"60–69", "70+"}
    max_difficulty, allow_coaching = _max_difficulty(experience, is_senior)
    available_equipment = catalog.expand_equipment(
        profile.get("environment", {}).get("equipmentIds", []),
        profile.get("environment", {}).get("locations", []),
    )

    desired_sessions = int(profile.get("schedule", {}).get("desiredSessions", 3))
    available_days = profile.get("schedule", {}).get("availableDays", [])
    actual_count = min(max(1, desired_sessions), max(1, len(set(available_days))))
    prefer_weekend = discipline in {"running", "trail", "cycling", "hiking", "triathlon"}
    selected_days = _evenly_select_days(available_days, actual_count, prefer_weekend)
    first_dates = _first_cycle_dates(start_on, selected_days)
    actual_count = len(first_dates)
    blueprints = _blueprints(goal_type, discipline, actual_count)

    preferred_styles = set(profile.get("preferences", {}).get("likedStyles", []))
    ctx = PlanContext(
        profile=profile,
        catalog=catalog,
        restrictions=restrictions,
        available_equipment=available_equipment,
        goal_type="strength" if goal_type == "strength" else goal_type,
        discipline=discipline,
        phase=phase,
        experience_level=experience,
        max_difficulty=max_difficulty,
        allow_coaching=allow_coaching,
        is_senior=is_senior,
        base_duration=int(profile.get("schedule", {}).get("sessionDuration", 45)),
        preferred_styles=preferred_styles,
        preferred_bodyweight=is_senior or "bodyweight" in preferred_styles,
    )

    conservative = experience in {"new", "returning"} or is_senior or profile.get("recovery", {}).get("recoveryFeeling", 3) <= 2
    load_factors = _load_factors(duration_weeks, phase, conservative)
    weeks: list[dict[str, Any]] = []

    for week_number in range(1, duration_weeks + 1):
        theme, week_note = _week_theme(week_number, phase)
        sessions: list[dict[str, Any]] = []
        for index, ((weekday_id, first_date), blueprint) in enumerate(zip(first_dates, blueprints), start=1):
            scheduled_date = first_date + timedelta(days=7 * (week_number - 1))
            session = build_session(
                ctx,
                blueprint,
                week_number=week_number,
                load_factor=load_factors[week_number - 1],
            )
            session["id"] = f"W{week_number:02d}-S{index:02d}"
            session["date"] = scheduled_date.isoformat()
            session["weekday"] = WEEKDAY_LABELS[weekday_id]
            preferred_times = profile.get("schedule", {}).get("preferredTimes", [])
            session["preferredTime"] = preferred_times[(index - 1) % len(preferred_times)] if preferred_times else "flexible"
            sessions.append(session)

        weeks.append({
            "weekNumber": week_number,
            "theme": theme,
            "coachNote": week_note,
            "loadFactor": load_factors[week_number - 1],
            "targetMinutes": sum(int(session.get("durationMinutes", 0)) for session in sessions),
            "sessions": sessions,
            "recoveryGuidance": (
                "Mindestens einen vollständigen Ruhetag einplanen. Bei ungewöhnlich hoher Müdigkeit die letzte Zubehörübung oder den letzten Intervallblock streichen."
            ),
        })

    all_dates = [date.fromisoformat(session["date"]) for week in weeks for session in week["sessions"]]
    plan_start = min(all_dates)
    plan_end = max(all_dates)
    first_name = profile.get("identity", {}).get("firstName", "").strip()
    sports = [SPORT_LABELS.get(item, item) for item in profile.get("goals", {}).get("sports", [])]
    equipment_names = catalog.equipment_names(sorted(available_equipment))
    exercise_pool = catalog.rank_exercises(
        available_equipment=available_equipment,
        restriction_rules=restrictions,
        categories={"strength", "core", "conditioning", "prehab", "mobility"},
        max_difficulty=max_difficulty,
        allow_coaching=allow_coaching,
        preferred_styles=preferred_styles,
        preferred_bodyweight=ctx.preferred_bodyweight,
    )

    plan_notes: list[str] = []
    if actual_count < desired_sessions:
        plan_notes.append(
            f"Es wurden {actual_count} statt {desired_sessions} Einheiten pro Woche geplant, weil nur {actual_count} unterschiedliche Trainingstage angegeben wurden."
        )
    if profile.get("schedule", {}).get("scheduleNotes"):
        plan_notes.append(f"Alltagshinweis: {profile['schedule']['scheduleNotes']}")
    plan_notes.extend(safety["notices"])

    event = profile.get("goals", {}).get("event", {})
    plan = {
        "schemaVersion": "1.0",
        "engineVersion": "1.0.0",
        "id": plan_id or str(uuid4()),
        "title": _plan_title(profile, goal_type, duration_weeks, title),
        "subtitle": f"{PHASE_LABELS.get(phase, phase)} · {actual_count} Einheiten pro Woche",
        "status": "active",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "startsOn": plan_start.isoformat(),
        "endsOn": plan_end.isoformat(),
        "durationWeeks": duration_weeks,
        "sessionsPerWeek": actual_count,
        "goalType": goal_type,
        "discipline": discipline,
        "phase": phase,
        "athleteSnapshot": {
            "firstName": first_name,
            "ageGroup": age_group,
            "goal": GOAL_LABELS.get(profile.get("goals", {}).get("primaryGoal", ""), "Persönliches Ziel"),
            "sports": sports,
            "experience": EXPERIENCE_LABELS.get(experience, experience),
            "currentTrainingDays": profile.get("experience", {}).get("currentTrainingDays", 0),
            "event": {
                "name": event.get("name", ""),
                "date": event.get("date", ""),
                "distance": event.get("distance", ""),
                "target": event.get("targetTime", ""),
            } if event.get("enabled") else None,
            "equipmentSummary": equipment_names[:12],
            "restrictionSummary": restrictions.notes,
        },
        "safety": safety,
        "principles": _principles(profile, goal_type, phase),
        "planNotes": list(dict.fromkeys(plan_notes)),
        "weeks": weeks,
        "progressionNotes": [
            "Woche 1: Ausgangsbelastung finden und Technik kalibrieren.",
            "Woche 2: Zeit, Wiederholungen oder Gesamtumfang moderat erhöhen.",
            "Woche 3: stärkster kontrollierter Reiz des Zyklus.",
            "Woche 4: Umfang reduzieren; keine versäumten Einheiten nachholen.",
            "Nach dem Block: Rückmeldung zu Verträglichkeit, Leistung und Alltag einholen und den nächsten Block neu berechnen.",
        ],
        "qualityChecks": {
            "exerciseDatabaseVersion": catalog.metadata.get("version"),
            "availableEquipmentCount": len(available_equipment),
            "eligibleExercisePool": len(exercise_pool),
            "restrictionRulesApplied": bool(profile.get("health", {}).get("restrictions") or profile.get("preferences", {}).get("excludedExercises")),
            "scheduleFit": actual_count == desired_sessions,
            "generationMode": "deterministic-rule-engine",
        },
    }
    return plan
