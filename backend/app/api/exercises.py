from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from ..schemas.exercise import ExerciseDetailOut
from ..services.exercise_media import build_exercise_detail


router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("/{exercise_id}", response_model=ExerciseDetailOut)
def get_exercise(exercise_id: str, response: Response) -> ExerciseDetailOut:
    """Public reference data for one exercise of the catalogue.

    The catalogue contains no personal data, so the endpoint needs no login and
    may be cached by browsers and proxies.
    """

    detail = build_exercise_detail(exercise_id.strip().upper())
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Übung nicht gefunden.")
    response.headers["Cache-Control"] = "public, max-age=86400"
    return ExerciseDetailOut.model_validate(detail)
