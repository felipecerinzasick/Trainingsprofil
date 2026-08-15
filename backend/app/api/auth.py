from __future__ import annotations

from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import User
from ..schemas.auth import GoogleLoginRequest, LoginRequest, TokenResponse, UserCreate, UserOut
from ..security import create_access_token, get_current_user, hash_password, normalize_email, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        firstName=user.first_name,
        isActive=user.is_active,
        createdAt=user.created_at,
    )


def token_response(user: User) -> TokenResponse:
    return TokenResponse(accessToken=create_access_token(user.id), user=to_user_out(user))


def verify_google_credential(credential: str) -> dict[str, object]:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google-Anmeldung ist noch nicht konfiguriert.",
        )

    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google-Anmeldung konnte nicht bestätigt werden.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.get("aud") != settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google-Anmeldung ist für diese Anwendung nicht gültig.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bitte verwende ein bestätigtes Google-Konto.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    email = normalize_email(str(payload.email))
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Für diese E-Mail besteht bereits ein Konto.")

    user = User(
        email=email,
        first_name=payload.firstName.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-Mail oder Passwort ist nicht korrekt.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_response(user)


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    google_payload = verify_google_credential(payload.credential)
    email = google_payload.get("email")
    if not isinstance(email, str) or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google-Konto enthält keine gültige E-Mail-Adresse.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None:
        first_name = google_payload.get("given_name")
        fallback_name = google_payload.get("name")
        user = User(
            email=normalize_email(email),
            first_name=str(first_name or fallback_name or "").strip()[:120],
            password_hash=hash_password(token_urlsafe(48)),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Dieses Konto ist deaktiviert.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.first_name:
        first_name = google_payload.get("given_name") or google_payload.get("name")
        if isinstance(first_name, str) and first_name.strip():
            user.first_name = first_name.strip()[:120]
            db.commit()
            db.refresh(user)

    return token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return to_user_out(user)
