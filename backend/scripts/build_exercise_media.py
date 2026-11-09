"""Build ``backend/app/data/exercise_media.json`` from the Free Exercise DB.

The Free Exercise DB (https://github.com/yuhonas/free-exercise-db) is a public
domain (Unlicense) dataset with two photos per exercise (start and end
position) plus step-by-step instructions in English. This script matches the
German exercise catalogue of Trainingsprofil against that dataset by the
English exercise names and writes a compact mapping file that the API serves
through ``GET /api/exercises/{exercise_id}``.

Usage::

    python scripts/build_exercise_media.py /path/to/exercises.json

``exercises.json`` is the combined file from the dataset repository
(``dist/exercises.json``). Only matches with a sufficiently high confidence are
kept; a wrong picture is worse than no picture.
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parents[1]
CATALOG_PATH = BACKEND_DIR / "app" / "data" / "fitness_exercise_database_de.json"
OUTPUT_PATH = BACKEND_DIR / "app" / "data" / "exercise_media.json"

SOURCE = {
    "name": "Free Exercise DB",
    "url": "https://github.com/yuhonas/free-exercise-db",
    "license": "Unlicense (Public Domain)",
    "licenseUrl": "https://unlicense.org/",
    "imageBaseUrl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/",
    "instructionsLanguage": "en",
}

# Tokens that describe a *variation* of a base movement. They are removed
# before matching so that e.g. "Tempo Barbell Overhead Press" is matched to the
# plain barbell shoulder press. Such matches are marked as ``variant``.
VARIANT_TOKENS = {
    "tempo", "paused", "pause", "eccentric", "isometric", "deficit", "15", "1.5", "rep",
    "second", "seconds", "3", "pin", "slow", "hold", "explosive", "speed", "power",
    "feet", "up", "elevated", "heels", "heel", "toes", "tiptoe", "band", "resisted",
    "chain", "chains", "wide", "narrow", "close", "medium", "grip", "neutral", "reverse",
    "underhand", "overhand", "pronated", "supinated", "half", "quarter", "full",
    "low", "high", "handle", "handles", "offset", "contralateral", "ipsilateral",
    "alternating", "alternate", "single", "one", "arm", "leg", "double", "two", "hand",
    "seated", "standing", "kneeling", "lying", "incline", "decline", "flat", "bench", "over",
    "assisted", "weighted", "walking", "stationary", "forward", "backward", "behind",
    "the", "a", "to", "of", "with", "from", "on", "in", "and", "position", "variation",
    "modified", "knee", "knees", "bent", "straight", "stiff", "rack", "touch", "down",
    "standard", "classic", "regular", "basic", "traditional", "conventional", "bilateral",
    "unilateral", "unsupported", "supported", "chest", "strict", "dead", "stop",
}

# Words from the same group must not contradict each other, otherwise the
# picture would show a clearly different exercise (incline vs. decline bench).
CONFLICT_GROUPS: tuple[set[str], ...] = (
    {"incline", "decline", "flat"},
    {"seated", "standing", "lying", "kneeling"},
    {"front", "rear"},
    {"wide", "close", "narrow"},
)
SINGLE_TOKENS = {"single", "one", "alternating", "alternate", "legged"}

# Equipment that is often implied by the name only on one side.
FED_EQUIPMENT_TOKEN = {
    "dumbbell": "dumbbell", "barbell": "barbell", "kettlebells": "kettlebell", "cable": "cable",
    "bands": "band", "machine": "machine", "medicine ball": "medicine", "e-z curl bar": "ezbar",
    "exercise ball": "stability", "body only": "body",
}
OUR_EQUIPMENT_TOKEN = {
    "DUMBBELL": "dumbbell", "BARBELL": "barbell", "KETTLEBELL": "kettlebell", "CABLE": "cable",
    "DUAL_CABLE": "cable", "BAND": "band", "MINIBAND": "band", "MED_BALL": "medicine",
    "EZ_BAR": "ezbar", "SWISS_BALL": "stability", "BODY": "body", "SMITH": "smith",
    "BENCH": "body", "ADJ_BENCH": "body", "WALL": "body", "PULLUP_BAR": "body", "BOX": "body",
    "STEP": "body", "DIP_BARS": "body", "PARALLETTES": "body", "RACK": "body", "PLATES": "body",
    "SLANT_BOARD": "body", "TOWEL": "body",
}
EQUIPMENT_TOKENS = set(FED_EQUIPMENT_TOKEN.values()) | {"smith", "suspension", "ring", "sandbag", "sled", "landmine"}

SYNONYMS = {
    "pushup": "pushup", "pushups": "pushup", "push": "push", "ups": "up",
    "pullup": "pullup", "pullups": "pullup", "chinup": "chinup", "chinups": "chinup",
    "situp": "situp", "situps": "situp", "stepup": "stepup", "stepups": "stepup",
    "kettlebells": "kettlebell", "dumbbells": "dumbbell", "barbells": "barbell",
    "bands": "band", "curls": "curl", "rows": "row", "presses": "press", "raises": "raise",
    "squats": "squat", "lunges": "lunge", "deadlifts": "deadlift", "swings": "swing",
    "shrugs": "shrug", "dips": "dip", "crunches": "crunch", "flyes": "fly", "flys": "fly",
    "flies": "fly", "extensions": "extension", "pulldowns": "pulldown", "kickbacks": "kickback",
    "twists": "twist", "planks": "plank", "bridges": "bridge", "carries": "carry",
    "jumps": "jump", "throws": "throw", "slams": "slam", "walks": "walk", "crawls": "crawl",
    "climbers": "climber", "burpees": "burpee", "thrusters": "thruster", "cleans": "clean",
    "snatches": "snatch", "jerks": "jerk", "goodmorning": "good morning",
    "bodyweight": "body", "shoulder": "overhead", "military": "overhead", "ez": "ezbar",
    "sz": "ezbar", "trx": "suspension", "rings": "ring", "legged": "leg", "resistance": "",
    "reverse": "rear", "side": "lateral", "bicep": "", "biceps": "",
    "glute": "glute", "hip": "hip", "rdl": "romanian", "bulgarian": "bulgarian",
    "lat": "lat", "lats": "lat", "tricep": "triceps", "bicep": "biceps",
    "pec": "chest", "pectoral": "chest", "ab": "ab", "abs": "ab", "abdominal": "ab",
    "hamstrings": "hamstring", "quads": "quad", "quadriceps": "quad", "calves": "calf",
    "machine": "machine", "smith": "smith", "cable": "cable", "pulley": "cable",
    "swiss": "stability", "exercise": "stability", "physio": "stability", "gym": "stability",
    "medicine": "medicine", "med": "medicine", "kb": "kettlebell", "db": "dumbbell",
    "bb": "barbell",
}

# Our primary equipment ids -> acceptable Free Exercise DB equipment values.
EQUIPMENT_COMPAT: dict[str, set[str]] = {
    "DUMBBELL": {"dumbbell"},
    "BARBELL": {"barbell"},
    "TRAP_BAR": {"barbell", "other"},
    "SSB": {"barbell"},
    "SWISS_BAR": {"barbell"},
    "EZ_BAR": {"e-z curl bar", "barbell"},
    "KETTLEBELL": {"kettlebells"},
    "CABLE": {"cable"},
    "DUAL_CABLE": {"cable"},
    "LAT_PULLDOWN": {"cable", "machine"},
    "LOW_ROW": {"cable", "machine"},
    "BAND": {"bands"},
    "MINIBAND": {"bands"},
    "MED_BALL": {"medicine ball"},
    "SWISS_BALL": {"exercise ball"},
    "SMITH": {"machine", "barbell"},
}
BODY_LIKE = {"body only", "other", None}
MACHINE_LIKE = {"machine", "cable", "other"}

# Free Exercise DB primary muscles compatible with our primary muscle ids.
MUSCLE_COMPAT: dict[str, set[str]] = {
    "QUADS": {"quadriceps", "glutes", "hamstrings", "adductors", "abductors"},
    "GLUTES": {"glutes", "quadriceps", "hamstrings", "lower back", "abductors"},
    "HAMSTRINGS": {"hamstrings", "glutes", "lower back", "quadriceps"},
    "ADDUCTORS": {"adductors", "quadriceps", "glutes"},
    "ABDUCTORS": {"abductors", "glutes"},
    "HIP_FLEXORS": {"abdominals", "quadriceps"},
    "CALVES": {"calves"},
    "TIBIALIS": {"calves"},
    "CHEST": {"chest", "triceps", "shoulders"},
    "TRICEPS": {"triceps", "chest", "shoulders"},
    "BICEPS": {"biceps", "forearms"},
    "BRACHIALIS": {"biceps", "forearms"},
    "FOREARMS": {"forearms", "biceps", "traps"},
    "FRONT_DELTS": {"shoulders", "chest", "triceps", "traps"},
    "SIDE_DELTS": {"shoulders", "traps"},
    "REAR_DELTS": {"shoulders", "middle back", "traps", "lats"},
    "ROTATOR_CUFF": {"shoulders"},
    "TRAPS": {"traps", "shoulders", "middle back", "neck"},
    "RHOMBOIDS": {"middle back", "lats", "traps", "shoulders"},
    "LATS": {"lats", "middle back", "biceps", "traps"},
    "ERECTORS": {"lower back", "hamstrings", "glutes", "middle back"},
    "ABS": {"abdominals"},
    "OBLIQUES": {"abdominals", "lower back"},
    "DEEP_CORE": {"abdominals", "lower back", "glutes"},
}

# Hand-checked matches for very common exercises where the automatic name
# comparison would otherwise choose something worse or nothing at all.
MANUAL_MATCHES: dict[str, str] = {
    "EX000044": "Farmer's Walk", "EX000045": "Farmer's Walk",
    "EX000075": "Battling Ropes", "EX000077": "Battling Ropes",
    "EX000099": "Sled Drag - Harness", "EX000103": "Sled Drag - Harness",
    "EX000109": "Rope Jumping",
    "EX000126": "Dead Bug",
    "EX000140": "Plank", "EX000171": "Plank", "EX000174": "Plank",
    "EX000208": "Pallof Press", "EX000209": "Pallof Press", "EX000216": "Pallof Press",
    "EX000225": "One-Arm High-Pulley Cable Side Bends",
    "EX000256": "Flat Bench Lying Leg Raise", "EX000258": "Flat Bench Lying Leg Raise",
    "EX000260": "Crunches", "EX000264": "Crunch - Hands Overhead", "EX000265": "Crunches",
    "EX000266": "Weighted Crunches", "EX000284": "Weighted Crunches",
    "EX000281": "Knee/Hip Raise On Parallel Bars",
    "EX000289": "Decline Crunch", "EX000292": "Reverse Crunch", "EX000294": "Flutter Kicks",
    "EX000295": "Sit-Up", "EX000296": "Sit-Up",
    "EX000307": "Ankle Circles",
    "EX000312": "Standing Soleus And Achilles Stretch", "EX000313": "Calf Stretch Hands Against Wall",
    "EX000315": "Standing Biceps Stretch", "EX000316": "Triceps Stretch",
    "EX000325": "Seated Floor Hamstring Stretch", "EX000326": "Leg-Up Hamstring Stretch",
    "EX000329": "Kneeling Hip Flexor", "EX000330": "Kneeling Hip Flexor",
    "EX000331": "On Your Side Quad Stretch", "EX000332": "Quad Stretch",
    "EX000337": "Seated Glute", "EX000338": "Ankle On The Knee",
    "EX000345": "One Arm Against Wall", "EX000349": "Side Neck Stretch",
    "EX000351": "Adductor", "EX000353": "Piriformis-SMR", "EX000354": "Hamstring-SMR",
    "EX000355": "Latissimus Dorsi-SMR", "EX000356": "Rhomboids-SMR", "EX000357": "Quadriceps-SMR",
    "EX000358": "Anterior Tibialis-SMR", "EX000359": "Iliotibial Tract-SMR", "EX000362": "Calves-SMR",
    "EX000363": "Shoulder Stretch", "EX000370": "Cat Stretch", "EX000371": "Child's Pose",
    "EX000427": "Freehand Jump Squat",
    "EX000523": "Thigh Abductor", "EX000524": "Thigh Adductor",
    "EX000528": "Monster Walk", "EX000529": "Monster Walk", "EX000531": "Side Leg Raises",
    "EX000533": "Isometric Neck Exercise - Front And Back", "EX000534": "Isometric Neck Exercise - Front And Back",
    "EX000553": "External Rotation with Cable", "EX000554": "External Rotation with Cable",
    "EX000555": "External Rotation with Band", "EX000556": "External Rotation with Band",
    "EX000566": "External Rotation",
    "EX000560": "Face Pull", "EX000561": "Face Pull",
    "EX000571": "Hyperextensions (Back Extensions)", "EX000575": "Hyperextensions (Back Extensions)",
    "EX000590": "Hyperextensions (Back Extensions)", "EX000589": "Hyperextensions With No Hyperextension Bench",
    "EX000592": "Weighted Ball Hyperextension",
    "EX000607": "Lying T-Bar Row",
    "EX000641": "Leverage Iso Row", "EX000645": "Leverage Iso Row", "EX000648": "Leverage Iso Row",
    "EX000649": "Leverage Iso Row", "EX000647": "Cable Rope Rear-Delt Rows", "EX000652": "Seated Cable Rows",
    "EX000656": "Standing Dumbbell Calf Raise", "EX000668": "Standing Dumbbell Calf Raise",
    "EX000665": "Calf Press On The Leg Press Machine",
    "EX000672": "Butterfly", "EX000673": "Cable Crossover", "EX000680": "Cable Crossover",
    "EX000685": "Cross Over - With Bands",
    "EX000714": "One-Arm Dumbbell Row",
    "EX000749": "Stiff-Legged Dumbbell Deadlift",
    "EX000766": "Dips - Triceps Version",
    "EX000777": "Triceps Pushdown", "EX000813": "Triceps Pushdown", "EX000830": "Speed Band Overhead Triceps",
    "EX000856": "Cable Hammer Curls - Rope Attachment", "EX000859": "Cable Hammer Curls - Rope Attachment",
    "EX000857": "Standing Biceps Cable Curl", "EX000855": "Standing Biceps Cable Curl",
    "EX000867": "Dumbbell Bicep Curl", "EX000876": "Reverse Barbell Curl",
    "EX000894": "Seated One-Arm Dumbbell Palms-Up Wrist Curl", "EX000904": "Seated Dumbbell Palms-Up Wrist Curl",
    "EX000905": "Seated Palm-Up Barbell Wrist Curl", "EX000924": "Seated Dumbbell Palms-Down Wrist Curl",
    "EX000925": "Seated Palms-Down Barbell Wrist Curl", "EX000933": "Wrist Roller",
    "EX000948": "Band Good Morning (Pull Through)",
    "EX000956": "Butt Lift (Bridge)", "EX000957": "Butt Lift (Bridge)", "EX000958": "Butt Lift (Bridge)",
    "EX000960": "Butt Lift (Bridge)", "EX000971": "Butt Lift (Bridge)", "EX000976": "Butt Lift (Bridge)",
    "EX000963": "Barbell Hip Thrust", "EX000964": "Barbell Hip Thrust", "EX000965": "Barbell Hip Thrust",
    "EX000967": "Barbell Hip Thrust", "EX000968": "Barbell Hip Thrust",
    "EX000984": "Inverted Row", "EX000990": "Inverted Row with Straps", "EX000992": "Inverted Row with Straps",
    "EX000993": "Inverted Row with Straps",
    "EX001009": "Ball Leg Curl",
    "EX001030": "Side Lateral Raise",
    "EX001048": "V-Bar Pulldown", "EX001050": "V-Bar Pulldown", "EX001057": "V-Bar Pulldown",
    "EX001053": "Underhand Cable Pulldowns", "EX001054": "Close-Grip Front Lat Pulldown",
    "EX001055": "Full Range-Of-Motion Lat Pulldown", "EX001058": "Wide-Grip Lat Pulldown",
    "EX001068": "Dumbbell Rear Lunge",
    "EX001125": "Leverage Chest Press", "EX001126": "Leverage Chest Press", "EX001129": "Leverage Chest Press",
    "EX001132": "Leverage Incline Chest Press", "EX001134": "Standing Cable Chest Press",
    "EX001212": "Pushups", "EX001226": "Push-Ups With Feet Elevated",
    "EX000985": "Inverted Row", "EX001322": "Bodyweight Squat", "EX001334": "Barbell Squat",
    "EX001272": "Kettlebell One-Legged Deadlift", "EX001273": "Kettlebell One-Legged Deadlift",
    "EX001276": "Kettlebell One-Legged Deadlift", "EX001268": "Stiff-Legged Dumbbell Deadlift",
    "EX001269": "Romanian Deadlift", "EX000040": "Farmer's Walk", "EX000068": "Farmer's Walk",
    "EX000069": "Farmer's Walk", "EX000962": "Barbell Hip Thrust",
    "EX000702": "One-Arm Kettlebell Floor Press", "EX000792": "Lying Triceps Press", "EX000793": "Lying Triceps Press",
    "EX000832": "Dumbbell Alternate Bicep Curl", "EX000849": "Dumbbell Bicep Curl", "EX000865": "Dumbbell Bicep Curl",
    "EX000866": "Dumbbell Bicep Curl", "EX001144": "One-Arm Kettlebell Military Press To The Side",
    "EX001233": "Cable Rear Delt Fly", "EX001235": "Cable Rear Delt Fly", "EX001236": "Reverse Machine Flyes",
    "EX001237": "Reverse Flyes", "EX001238": "Back Flyes - With Bands", "EX001240": "Reverse Flyes",
    "EX001258": "Dumbbell Shrug", "EX001263": "Barbell Shrug",
    "EX001293": "Suspended Split Squat", "EX001294": "Smith Single-Leg Split Squat",
    "EX001296": "Split Squat with Dumbbells", "EX001297": "Split Squat with Dumbbells",
    "EX001299": "Split Squats",
    "EX001308": "Bodyweight Squat", "EX001321": "Dumbbell Squat", "EX001324": "Goblet Squat",
    "EX001331": "Bodyweight Squat",
    "EX001383": "Step-up with Knee Raise", "EX001385": "Dumbbell Step Ups", "EX001387": "Step-up with Knee Raise",
    "EX001390": "Step-up with Knee Raise", "EX001391": "Step-up with Knee Raise",
}

# Rules by English name (regex) and primary equipment, applied when no id match exists.
MANUAL_RULES: tuple[tuple[str, set[str] | None, str], ...] = (
    (r"side plank", {"BODY", "BENCH", "PLATES", "WALL"}, "Side Bridge"),
    (r"stationary cycling|ergometer", {"BIKE"}, "Bicycling, Stationary"),
    (r"elliptical", {"ELLIPTICAL"}, "Elliptical Trainer"),
    (r"treadmill walking", {"TREADMILL"}, "Walking, Treadmill"),
    (r"treadmill jogging", {"TREADMILL"}, "Jogging, Treadmill"),
    (r"treadmill running|treadmill run", {"TREADMILL"}, "Running, Treadmill"),
    (r"stair climber", {"STAIR_CLIMBER"}, "Stairmaster"),
    (r"rowing|rower|row erg", {"ROWER", "ROW_ERG"}, "Rowing, Stationary"),
    (r"hiking|trail", {"OUTDOOR"}, "Trail Running/Walking"),
    (r"outdoor cycling|road cycling", {"OUTDOOR", "BIKE"}, "Bicycling"),
)

# Exercises that must never receive a picture (e.g. known false positives).
BLOCKED: set[str] = set()
# The dataset's "Air Bike" is an abdominal exercise, not the cardio machine.
BLOCKED_EQUIPMENT = {"AIR_BIKE"}


def normalise(name: str) -> list[str]:
    text = name.lower()
    text = text.replace("&", " and ")
    text = re.sub(r"\be[\s\-]?z([\s\-]?curl)?([\s\-]?bar)?\b", " ezbar ", text)
    text = re.sub(r"\(.*?\)", " ", text)
    text = re.sub(r"[/\-_,.:+']", " ", text)
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    tokens: list[str] = []
    for raw in text.split():
        token = SYNONYMS.get(raw, raw)
        if not token:
            continue
        tokens.extend(token.split())
    merged: list[str] = []
    skip = False
    for index, token in enumerate(tokens):
        if skip:
            skip = False
            continue
        nxt = tokens[index + 1] if index + 1 < len(tokens) else ""
        if token in {"push", "pull", "chin", "sit", "step"} and nxt == "up":
            merged.append(f"{token}up")
            skip = True
        else:
            merged.append(token)
    return merged


def core_tokens(tokens: list[str]) -> set[str]:
    return {token for token in tokens if token not in VARIANT_TOKENS}


def jaccard(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def equipment_ok(our_equipment: str, fed_equipment: str | None) -> bool:
    if our_equipment in EQUIPMENT_COMPAT:
        return fed_equipment in EQUIPMENT_COMPAT[our_equipment] or fed_equipment is None
    if "MACHINE" in our_equipment or our_equipment in {"LEG_PRESS", "HACK_SQUAT", "PULLDOWN_MACHINE", "ROW_MACHINE", "CALF_MACHINE", "LEG_EXTENSION", "LEG_CURL", "ASSISTED_PULLUP", "GHD", "BACK_EXTENSION_BENCH"}:
        return fed_equipment in MACHINE_LIKE or fed_equipment is None
    return fed_equipment in BODY_LIKE


def muscle_ok(our_muscle: str, fed_muscles: list[str]) -> bool:
    if our_muscle == "FULL_BODY" or not fed_muscles:
        return True
    allowed = MUSCLE_COMPAT.get(our_muscle)
    if not allowed:
        return True
    return any(muscle in allowed for muscle in fed_muscles)


def build(fed_path: Path) -> dict[str, Any]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    fed = json.loads(fed_path.read_text(encoding="utf-8"))
    fed_by_id = {item["id"]: item for item in fed}
    fed_by_name = {item["name"]: item["id"] for item in fed}
    fed_tokens = {item["id"]: normalise(item["name"]) for item in fed}

    mapping: dict[str, dict[str, Any]] = {}
    stats: dict[str, int] = defaultdict(int)

    for exercise in catalog["exercises"]:
        exercise_id = exercise["exercise_id"]
        if exercise_id in BLOCKED or exercise.get("primary_equipment_id") in BLOCKED_EQUIPMENT:
            continue
        manual_name = MANUAL_MATCHES.get(exercise_id)
        if manual_name is None:
            for pattern, equipment_ids, fed_name in MANUAL_RULES:
                if re.search(pattern, exercise["name_en"], re.IGNORECASE) and (
                    equipment_ids is None or exercise.get("primary_equipment_id") in equipment_ids
                ):
                    manual_name = fed_name
                    break
        if manual_name is not None:
            if manual_name not in fed_by_name:
                raise SystemExit(f"Manual match '{manual_name}' not found in dataset")
            manual_core = core_tokens(normalise(manual_name))
            our_manual_core = core_tokens(normalise(exercise["name_en"]))
            quality = "exact" if manual_core == our_manual_core else "variant"
            mapping[exercise_id] = {"sourceId": fed_by_name[manual_name], "match": quality}
            stats[f"manual_{quality}"] += 1
            continue

        our_full = normalise(exercise["name_en"])
        our_equipment = exercise.get("primary_equipment_id") or "BODY"
        our_muscle = exercise.get("primary_muscle_id") or "FULL_BODY"
        our_full_set = set(our_full)
        if not (our_full_set & EQUIPMENT_TOKENS) and our_equipment in OUR_EQUIPMENT_TOKEN:
            our_full_set.add(OUR_EQUIPMENT_TOKEN[our_equipment])
        our_core = core_tokens(list(our_full_set))
        our_unilateral = bool(exercise.get("unilateral"))

        best: tuple[float, str, str] | None = None
        for source_id, tokens in fed_tokens.items():
            item = fed_by_id[source_id]
            fed_full = set(tokens)
            fed_equipment_token = FED_EQUIPMENT_TOKEN.get(item.get("equipment") or "")
            if not (fed_full & EQUIPMENT_TOKENS) and fed_equipment_token:
                fed_full.add(fed_equipment_token)
            fed_core = core_tokens(list(fed_full))
            our_side = our_full_set
            if fed_equipment_token is None and OUR_EQUIPMENT_TOKEN.get(our_equipment) == "body":
                our_side = our_full_set - {"body"}
            our_side_core = core_tokens(list(our_side))
            if not (our_side_core & fed_core):
                continue
            if any((our_side & group) and (fed_full & group) and not (our_side & fed_full & group) for group in CONFLICT_GROUPS):
                continue
            if (fed_full & SINGLE_TOKENS) and not our_unilateral and not (our_side & SINGLE_TOKENS):
                continue
            full_score = jaccard(our_side, fed_full)
            core_score = jaccard(our_side_core, fed_core)
            one_sided = sum(
                1 for group in CONFLICT_GROUPS
                if bool(our_side & group) != bool(fed_full & group)
            )
            if one_sided and full_score < 0.5:
                continue
            compatible = equipment_ok(our_equipment, item.get("equipment")) and muscle_ok(our_muscle, item.get("primaryMuscles") or [])
            if full_score >= 0.99:
                quality, score = "exact", 3.0
            elif full_score >= 0.8 and core_score >= 0.8 and compatible:
                quality, score = "similar", 2.0 + full_score
            elif core_score >= 0.99 and compatible:
                quality, score = "variant", 1.0 + full_score
            elif core_score >= 0.8 and compatible and len(our_side_core) >= 3:
                quality, score = "variant", core_score + full_score * 0.5
            else:
                continue
            score -= 0.25 * one_sided + 0.01 * len(fed_full)
            if best is None or score > best[0]:
                best = (score, source_id, quality)

        if best is None:
            stats["unmatched"] += 1
            continue
        mapping[exercise_id] = {"sourceId": best[1], "match": best[2]}
        stats[best[2]] += 1

    used = sorted({entry["sourceId"] for entry in mapping.values()})
    sources = {}
    for source_id in used:
        item = fed_by_id[source_id]
        sources[source_id] = {
            "name": item["name"],
            "images": item.get("images") or [],
            "instructions": item.get("instructions") or [],
            "level": item.get("level"),
            "equipment": item.get("equipment"),
            "primaryMuscles": item.get("primaryMuscles") or [],
            "secondaryMuscles": item.get("secondaryMuscles") or [],
        }

    print("matches:", dict(stats), "sources used:", len(sources), file=sys.stderr)
    return {"source": SOURCE, "exercises": mapping, "sources": sources}


def dump_compact(payload: dict[str, Any]) -> str:
    """One line per exercise and per source: small diffs when the mapping is rebuilt."""

    lines = ['{', ' "source": ' + json.dumps(payload["source"], ensure_ascii=False) + ',', ' "exercises": {']
    exercises = payload["exercises"]
    for index, (exercise_id, entry) in enumerate(exercises.items()):
        comma = "," if index < len(exercises) - 1 else ""
        lines.append(f'  {json.dumps(exercise_id)}: {json.dumps(entry, ensure_ascii=False)}{comma}')
    lines.append(' },')
    lines.append(' "sources": {')
    sources = payload["sources"]
    for index, (source_id, entry) in enumerate(sources.items()):
        comma = "," if index < len(sources) - 1 else ""
        lines.append(f'  {json.dumps(source_id)}: {json.dumps(entry, ensure_ascii=False)}{comma}')
    lines.append(' }')
    lines.append('}')
    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    payload = build(Path(argv[1]))
    OUTPUT_PATH.write_text(dump_compact(payload), encoding="utf-8")
    print(f"written {OUTPUT_PATH}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
