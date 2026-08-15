from __future__ import annotations

import re
from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TrainingPlanRecord, TrainingProfileRecord, User
from ..schemas.common import MessageResponse
from ..schemas.plan import GeneratePlanRequest, PlanListItem, PlanRecordOut
from ..schemas.profile import TrainingProfile
from ..security import get_current_user
from ..services.pdf_renderer import render_plan_pdf
from ..services.plan_engine import generate_training_plan
from ..services.safety import SafetyGateError


router = APIRouter(prefix="/plans", tags=["plans"])


def _recommended_duration(profile: TrainingProfile) -> int:
    """Choose a useful block length when the user does not specify one."""

    primary = profile.goals.primaryGoal
    if primary == "event" or profile.goals.event.enabled:
        return 12
    if primary in {"strength_muscle", "healthy_strength", "endurance"}:
        return 8
    return 4


def _list_item(record: TrainingPlanRecord) -> PlanListItem:
    return PlanListItem(
        id=record.id,
        title=record.title,
        goalLabel=record.goal_label,
        sportFocus=record.sport_focus,
        status=record.status,
        safetyStatus=record.safety_status,
        startDate=record.start_date,
        endDate=record.end_date,
        durationWeeks=record.duration_weeks,
        createdAt=record.created_at,
    )


def _record_out(record: TrainingPlanRecord) -> PlanRecordOut:
    return PlanRecordOut(
        **_list_item(record).model_dump(),
        plan=record.payload,
        profileSnapshot=TrainingProfile.model_validate(record.profile_snapshot),
    )


def _owned_plan(db: Session, user_id: str, plan_id: str) -> TrainingPlanRecord:
    record = db.scalar(
        select(TrainingPlanRecord).where(
            TrainingPlanRecord.id == plan_id,
            TrainingPlanRecord.user_id == user_id,
        )
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainingsplan nicht gefunden.")
    return record


def _load_saved_profile(db: Session, user_id: str) -> TrainingProfileRecord | None:
    return db.scalar(select(TrainingProfileRecord).where(TrainingProfileRecord.user_id == user_id))


@router.post("/generate", response_model=PlanRecordOut, status_code=status.HTTP_201_CREATED)
def generate_plan(
    request: GeneratePlanRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanRecordOut:
    saved_profile = _load_saved_profile(db, user.id)

    if request.profile is not None:
        profile = request.profile
        profile_data = profile.model_dump(mode="json")
        if saved_profile is None:
            saved_profile = TrainingProfileRecord(
                user_id=user.id,
                schema_version=profile.schemaVersion,
                payload=profile_data,
            )
            db.add(saved_profile)
        else:
            saved_profile.schema_version = profile.schemaVersion
            saved_profile.payload = profile_data

        if profile.identity.firstName and not user.first_name:
            user.first_name = profile.identity.firstName.strip()
    elif saved_profile is not None:
        profile = TrainingProfile.model_validate(saved_profile.payload)
        profile_data = saved_profile.payload
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bitte zuerst ein Trainingsprofil speichern.",
        )

    duration_weeks = request.durationWeeks or _recommended_duration(profile)

    try:
        plan = generate_training_plan(
            profile_data,
            duration_weeks=duration_weeks,
            title=request.title,
        )
    except SafetyGateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "MEDICAL_CLEARANCE_REQUIRED",
                "message": "Der Plan wird aus Sicherheitsgründen noch nicht automatisch erstellt.",
                "notices": exc.messages,
            },
        ) from exc
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    safety = plan.get("safety", {})
    record = TrainingPlanRecord(
        id=str(plan["id"]),
        user_id=user.id,
        title=str(plan["title"]),
        goal_label=str(plan.get("athleteSnapshot", {}).get("goal", "Persönliches Trainingsziel")),
        sport_focus=str(plan.get("discipline", "training")),
        status=str(plan.get("status", "active")),
        safety_status=str(safety.get("status", "ready")),
        start_date=date.fromisoformat(str(plan["startsOn"])),
        end_date=date.fromisoformat(str(plan["endsOn"])),
        duration_weeks=int(plan["durationWeeks"]),
        profile_snapshot=profile_data,
        payload=plan,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _record_out(record)


@router.get("", response_model=list[PlanListItem])
def list_plans(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PlanListItem]:
    records = db.scalars(
        select(TrainingPlanRecord)
        .where(TrainingPlanRecord.user_id == user.id)
        .order_by(TrainingPlanRecord.created_at.desc())
    ).all()
    return [_list_item(record) for record in records]


@router.get("/{plan_id}", response_model=PlanRecordOut)
def get_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanRecordOut:
    return _record_out(_owned_plan(db, user.id, plan_id))


@router.get("/{plan_id}/pdf")
def download_plan_pdf(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    record = _owned_plan(db, user.id, plan_id)
    pdf = render_plan_pdf(record.payload)
    safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", record.title).strip("-") or "trainingsplan"
    headers = {"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'}
    return StreamingResponse(BytesIO(pdf), media_type="application/pdf", headers=headers)


@router.delete("/{plan_id}", response_model=MessageResponse)
def delete_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    record = _owned_plan(db, user.id, plan_id)
    db.delete(record)
    db.commit()
    return MessageResponse(message="Trainingsplan gelöscht.")
