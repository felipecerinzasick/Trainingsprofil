from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import User
from ..schemas.billing import BillingStatus, CheckoutSessionResponse, CompleteCheckoutRequest, PortalSessionResponse
from ..schemas.common import MessageResponse
from ..security import get_current_user
from ..services import billing


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])
settings = get_settings()


def _stripe_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Zahlungen sind noch nicht eingerichtet. Bitte später erneut versuchen.",
    )


@router.get("/status", response_model=BillingStatus)
def get_status(user: User = Depends(get_current_user)) -> BillingStatus:
    return billing.billing_status(user)


@router.post("/checkout", response_model=CheckoutSessionResponse)
def start_checkout(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutSessionResponse:
    if billing.has_active_subscription(user):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Du hast bereits ein aktives Abo.")
    try:
        if not user.stripe_customer_id:
            user.stripe_customer_id = billing.create_customer(user)
            db.commit()
        url = billing.create_checkout_session(user, user.stripe_customer_id)
    except billing.StripeNotConfiguredError as exc:
        raise _stripe_unavailable() from exc
    except billing.stripe.StripeError as exc:
        logger.exception("Stripe checkout session could not be created.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Die Zahlungsseite konnte nicht geöffnet werden. Bitte versuche es gleich noch einmal.",
        ) from exc
    return CheckoutSessionResponse(url=url)


@router.post("/checkout/complete", response_model=BillingStatus)
def complete_checkout(
    payload: CompleteCheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BillingStatus:
    try:
        billing.complete_checkout_for_user(db, user, payload.sessionId)
    except billing.StripeNotConfiguredError as exc:
        raise _stripe_unavailable() from exc
    except billing.stripe.StripeError as exc:
        logger.exception("Stripe checkout session could not be verified.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Die Zahlung konnte noch nicht bestätigt werden. Dein Abo wird in Kürze automatisch aktiviert.",
        ) from exc
    db.refresh(user)
    return billing.billing_status(user)


@router.post("/portal", response_model=PortalSessionResponse)
def open_portal(user: User = Depends(get_current_user)) -> PortalSessionResponse:
    if not user.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Für dieses Konto besteht noch kein Abo.")
    try:
        url = billing.create_portal_session(user.stripe_customer_id)
    except billing.StripeNotConfiguredError as exc:
        raise _stripe_unavailable() from exc
    except billing.stripe.StripeError as exc:
        logger.exception("Stripe portal session could not be created.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Die Abo-Verwaltung konnte nicht geöffnet werden.",
        ) from exc
    return PortalSessionResponse(url=url)


@router.post("/webhook", response_model=MessageResponse, include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
) -> MessageResponse:
    payload = await request.body()
    try:
        event = billing.construct_webhook_event(payload, stripe_signature)
    except billing.StripeNotConfiguredError as exc:
        raise _stripe_unavailable() from exc
    except (ValueError, billing.stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültige Webhook-Signatur.") from exc

    outcome = billing.handle_webhook_event(db, event)
    return MessageResponse(message=outcome)
