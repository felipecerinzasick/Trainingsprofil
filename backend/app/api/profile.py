from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TrainingProfileRecord, User
from ..schemas.profile import TrainingProfile
from ..security import get_current_user


router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=TrainingProfile | None)
def get_profile(user: User = Depends(get_current_user)) -> TrainingProfile | None:
    if user.profile is None:
        return None
    return TrainingProfile.model_validate(user.profile.payload)


@router.put("", response_model=TrainingProfile)
def save_profile(
    payload: TrainingProfile,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrainingProfile:
    data = payload.model_dump(mode="json")
    if user.profile is None:
        record = TrainingProfileRecord(
            user_id=user.id,
            schema_version=payload.schemaVersion,
            payload=data,
        )
        db.add(record)
    else:
        user.profile.schema_version = payload.schemaVersion
        user.profile.payload = data
        user.profile.updated_at = datetime.now(timezone.utc)
    if payload.identity.firstName and not user.first_name:
        user.first_name = payload.identity.firstName.strip()
    db.commit()
    return payload


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    if user.profile is not None:
        db.delete(user.profile)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
