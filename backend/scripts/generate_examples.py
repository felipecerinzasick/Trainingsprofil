from __future__ import annotations

import json
from pathlib import Path

from app.services.pdf_renderer import render_plan_pdf
from app.services.plan_engine import generate_training_plan


BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
EXAMPLES = ROOT / "frontend" / "examples"
OUTPUT = ROOT / "sample-output"


def create(source_name: str, output_stem: str, duration_weeks: int = 4) -> None:
    profile = json.loads((EXAMPLES / source_name).read_text(encoding="utf-8"))
    plan = generate_training_plan(profile, duration_weeks=duration_weeks)
    (OUTPUT / f"{output_stem}.json").write_text(
        json.dumps(plan, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUTPUT / f"{output_stem}.pdf").write_bytes(render_plan_pdf(plan))
    print(f"Created {output_stem}: {len(plan['weeks'])} weeks, {len(render_plan_pdf(plan)):,} PDF bytes")


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    create("marathon-profile.json", "beispiel-trainingsplan-marathon", 4)
    create("active-senior-profile.json", "beispiel-trainingsplan-aktive-seniorin", 4)
