"""Trial and subscription paywall.

Every account can use the app for free for ``settings.trial_days`` days after
registration. Afterwards, plan generation and plan access require an active Stripe
subscription. The subscription state is mirrored onto the ``users`` table by the Stripe
webhook (and by the checkout completion endpoint), so authorization never has to call
Stripe on the request path.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping

import stripe
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import User
from ..schemas.billing import BillingStatus, PriceInfo
from ..security import get_current_user


logger = logging.getLogger(__name__)
settings = get_settings()

# Stripe subscription statuses that keep the account unlocked. ``past_due`` is included
# so that a single failed card payment does not lock people out while Stripe retries.
ACTIVE_SUBSCRIPTION_STATUSES = frozenset({"active", "trialing", "past_due"})

SUBSCRIPTION_REQUIRED_CODE = "SUBSCRIPTION_REQUIRED"


class StripeNotConfiguredError(RuntimeError):
    pass


def _aware(value: datetime | None) -> datetime | None:
    """SQLite drops tzinfo; everything we store is UTC."""

    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _from_timestamp(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def trial_end(user: User) -> datetime:
    explicit = _aware(user.trial_ends_at)
    if explicit is not None:
        return explicit
    created = _aware(user.created_at) or datetime.now(timezone.utc)
    return created + timedelta(days=settings.trial_days)


def has_active_subscription(user: User) -> bool:
    return (user.subscription_status or "") in ACTIVE_SUBSCRIPTION_STATUSES


@dataclass(frozen=True)
class AccessInfo:
    state: str  # trial | active | expired
    has_access: bool
    trial_ends_at: datetime
    trial_days_left: int


def access_for(user: User, now: datetime | None = None) -> AccessInfo:
    current = now or datetime.now(timezone.utc)
    ends = trial_end(user)
    remaining = ends - current
    days_left = math.ceil(remaining.total_seconds() / 86400) if remaining.total_seconds() > 0 else 0

    if has_active_subscription(user):
        return AccessInfo("active", True, ends, days_left)
    if current < ends:
        return AccessInfo("trial", True, ends, days_left)
    return AccessInfo("expired", not settings.paywall_enabled, ends, 0)


def require_active_access(user: User = Depends(get_current_user)) -> User:
    """Dependency for endpoints that are only available during the trial or with a subscription."""

    info = access_for(user)
    if info.has_access:
        return user
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "code": SUBSCRIPTION_REQUIRED_CODE,
            "message": "Deine kostenlose Testphase ist abgelaufen. Mit einem Abo kannst du weiter Trainingspläne erstellen und öffnen.",
            "trialEndsAt": info.trial_ends_at.isoformat(),
        },
    )


# --------------------------------------------------------------------------------------
# Stripe gateway. Thin wrappers so tests can monkeypatch a single module.
# --------------------------------------------------------------------------------------


def _plain(value: Any) -> dict[str, Any]:
    """Stripe resources are not dicts; convert them so the rest of the code can use Mapping access."""

    if hasattr(value, "to_dict"):
        return dict(value.to_dict())
    return dict(value)


def _ensure_stripe() -> None:
    if not settings.stripe_configured:
        raise StripeNotConfiguredError("Stripe ist nicht konfiguriert.")
    stripe.api_key = settings.stripe_secret_key


def create_customer(user: User) -> str:
    _ensure_stripe()
    customer = stripe.Customer.create(
        email=user.email,
        name=user.first_name or None,
        metadata={"user_id": user.id},
    )
    return str(customer["id"])


def create_checkout_session(user: User, customer_id: str) -> str:
    _ensure_stripe()
    base = settings.public_frontend_url
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
        client_reference_id=user.id,
        metadata={"user_id": user.id},
        subscription_data={"metadata": {"user_id": user.id}},
        allow_promotion_codes=True,
        customer_update={"address": "auto", "name": "auto"},
        success_url=f"{base}/?checkout=success&session_id={{CHECKOUT_SESSION_ID}}#konto",
        cancel_url=f"{base}/?checkout=cancel#abo",
    )
    return str(session["url"])


def create_portal_session(customer_id: str) -> str:
    _ensure_stripe()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.public_frontend_url}/#abo",
    )
    return str(session["url"])


def retrieve_checkout_session(session_id: str) -> Mapping[str, Any]:
    _ensure_stripe()
    return _plain(stripe.checkout.Session.retrieve(session_id, expand=["subscription"]))


def retrieve_subscription(subscription_id: str) -> Mapping[str, Any]:
    _ensure_stripe()
    return _plain(stripe.Subscription.retrieve(subscription_id))


def construct_webhook_event(payload: bytes, signature: str | None) -> Mapping[str, Any]:
    if not settings.stripe_webhook_secret:
        raise StripeNotConfiguredError("Stripe-Webhook-Secret fehlt.")
    return _plain(stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret))


_price_cache: dict[str, PriceInfo] = {}


def price_info() -> PriceInfo | None:
    """Price shown on the paywall. Successful lookups are cached; failures are retried next time."""

    if not settings.stripe_configured:
        return None
    price_id = settings.stripe_price_id
    cached = _price_cache.get(price_id)
    if cached is not None:
        return cached
    try:
        _ensure_stripe()
        price = _plain(stripe.Price.retrieve(price_id))
    except Exception as exc:  # noqa: BLE001 - price display is optional
        logger.warning("Stripe price %s could not be loaded: %s", price_id, exc)
        return None
    recurring = price.get("recurring") or {}
    amount = price.get("unit_amount")
    if amount is None:
        return None
    info = PriceInfo(
        amount=int(amount),
        currency=str(price.get("currency", "chf")).upper(),
        interval=str(recurring.get("interval", "month")),
        intervalCount=int(recurring.get("interval_count") or 1),
    )
    _price_cache[price_id] = info
    return info


# --------------------------------------------------------------------------------------
# Applying Stripe state to the user record
# --------------------------------------------------------------------------------------


def _period_end(subscription: Mapping[str, Any]) -> datetime | None:
    # Newer Stripe API versions moved current_period_end from the subscription
    # onto its items; support both shapes.
    value = subscription.get("current_period_end")
    if value is None:
        items = subscription.get("items") or {}
        data = items.get("data") if isinstance(items, Mapping) else None
        if data:
            value = data[0].get("current_period_end")
    return _from_timestamp(value)


def _id_of(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, Mapping):
        identifier = value.get("id")
        return str(identifier) if identifier else None
    return str(value)


def apply_subscription(user: User, subscription: Mapping[str, Any]) -> None:
    """Mirror a Stripe subscription object onto the user."""

    user.stripe_subscription_id = _id_of(subscription.get("id"))
    customer_id = _id_of(subscription.get("customer"))
    if customer_id:
        user.stripe_customer_id = customer_id
    user.subscription_status = str(subscription.get("status") or "") or None
    user.subscription_cancel_at_period_end = bool(subscription.get("cancel_at_period_end", False))
    user.subscription_current_period_end = _period_end(subscription)


def find_user_for_subscription(db: Session, subscription: Mapping[str, Any]) -> User | None:
    metadata = subscription.get("metadata") or {}
    user_id = metadata.get("user_id") if isinstance(metadata, Mapping) else None
    if user_id:
        user = db.scalar(select(User).where(User.id == str(user_id)))
        if user is not None:
            return user
    customer_id = _id_of(subscription.get("customer"))
    if customer_id:
        return db.scalar(select(User).where(User.stripe_customer_id == customer_id))
    return None


def handle_webhook_event(db: Session, event: Mapping[str, Any]) -> str:
    """Process a verified Stripe event. Returns a short outcome label for logging/tests."""

    event_type = str(event.get("type", ""))
    data_object = (event.get("data") or {}).get("object") or {}

    if event_type == "checkout.session.completed":
        if data_object.get("mode") != "subscription":
            return "ignored"
        user_id = data_object.get("client_reference_id") or (data_object.get("metadata") or {}).get("user_id")
        user = db.scalar(select(User).where(User.id == str(user_id))) if user_id else None
        if user is None:
            customer_id = _id_of(data_object.get("customer"))
            if customer_id:
                user = db.scalar(select(User).where(User.stripe_customer_id == customer_id))
        if user is None:
            logger.warning("checkout.session.completed without matching user (session %s).", data_object.get("id"))
            return "no-user"
        customer_id = _id_of(data_object.get("customer"))
        if customer_id:
            user.stripe_customer_id = customer_id
        subscription = data_object.get("subscription")
        if isinstance(subscription, Mapping):
            apply_subscription(user, subscription)
        elif subscription:
            apply_subscription(user, retrieve_subscription(str(subscription)))
        db.commit()
        return "checkout-completed"

    if event_type in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
    }:
        user = find_user_for_subscription(db, data_object)
        if user is None:
            logger.warning("%s without matching user (subscription %s).", event_type, data_object.get("id"))
            return "no-user"
        current = user.stripe_subscription_id
        incoming = _id_of(data_object.get("id"))
        if event_type == "customer.subscription.deleted" and current and incoming and current != incoming:
            # A stale subscription was cancelled while a newer one is active; ignore it.
            return "ignored-stale"
        apply_subscription(user, data_object)
        db.commit()
        return "subscription-synced"

    return "ignored"


def complete_checkout_for_user(db: Session, user: User, session_id: str) -> None:
    """Called when the browser returns from Stripe Checkout.

    The webhook is the source of truth, but it can arrive a few seconds later than the
    redirect; syncing here makes the dashboard reflect the new subscription immediately.
    """

    session = retrieve_checkout_session(session_id)
    reference = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
    customer_id = _id_of(session.get("customer"))
    if str(reference or "") != user.id and (not customer_id or customer_id != user.stripe_customer_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Diese Zahlung gehört nicht zu deinem Konto.")
    if customer_id:
        user.stripe_customer_id = customer_id
    subscription = session.get("subscription")
    if isinstance(subscription, Mapping):
        apply_subscription(user, subscription)
    elif subscription:
        apply_subscription(user, retrieve_subscription(str(subscription)))
    db.commit()


def billing_status(user: User) -> BillingStatus:
    info = access_for(user)
    return BillingStatus(
        accessState=info.state,  # type: ignore[arg-type]
        hasAccess=info.has_access,
        paywallEnabled=settings.paywall_enabled,
        paymentsConfigured=settings.stripe_configured,
        trialDays=settings.trial_days,
        trialEndsAt=info.trial_ends_at,
        trialDaysLeft=info.trial_days_left,
        subscriptionStatus=user.subscription_status,
        cancelAtPeriodEnd=bool(user.subscription_cancel_at_period_end),
        currentPeriodEnd=_aware(user.subscription_current_period_end),
        price=price_info(),
    )
