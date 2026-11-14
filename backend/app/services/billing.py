"""Pricing model and paywall.

Tiers (see ``Preismodell``):

* **Kostenlos** – account, Trainings-Check and a preview of every plan: the first
  ``settings.preview_weeks`` weeks. No time limit.
* **Plus** – 9,99 € / month or 59,99 € / year: complete plans and PDF export.
* **Einzelner Trainingsblock** – one-time purchase that unlocks a single plan.

Stripe is the source of truth for prices (resolved by lookup key) and for the
subscription state, which is mirrored onto the ``users`` / ``training_plans`` tables by
the webhook and by the checkout completion endpoint. Authorization therefore never
calls Stripe on the request path.
"""

from __future__ import annotations

import copy
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping

import stripe
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import TrainingPlanRecord, User
from ..schemas.billing import BillingStatus, PriceCatalog, PriceInfo, ProductKey
from ..schemas.plan import PlanAccess


logger = logging.getLogger(__name__)
settings = get_settings()

# Stripe subscription statuses that keep Plus unlocked. ``past_due`` is included so that
# a single failed card payment does not lock people out while Stripe retries.
ACTIVE_SUBSCRIPTION_STATUSES = frozenset({"active", "trialing", "past_due"})

UPGRADE_REQUIRED_CODE = "UPGRADE_REQUIRED"
PRICE_CACHE_SECONDS = 600


class StripeNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProductSpec:
    key: ProductKey
    lookup_key: str
    mode: str  # "subscription" | "payment"
    fallback: PriceInfo


def _products() -> dict[str, ProductSpec]:
    return {
        "plus_monthly": ProductSpec(
            "plus_monthly",
            settings.stripe_lookup_key_plus_monthly,
            "subscription",
            PriceInfo(amount=999, currency="EUR", type="recurring", interval="month"),
        ),
        "plus_yearly": ProductSpec(
            "plus_yearly",
            settings.stripe_lookup_key_plus_yearly,
            "subscription",
            PriceInfo(amount=5999, currency="EUR", type="recurring", interval="year"),
        ),
        "single_block": ProductSpec(
            "single_block",
            settings.stripe_lookup_key_single_block,
            "payment",
            PriceInfo(amount=2499, currency="EUR", type="one_time"),
        ),
    }


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------


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


def _plain(value: Any) -> dict[str, Any]:
    """Stripe resources are not dicts; convert them so the rest of the code can use Mapping access."""

    if hasattr(value, "to_dict"):
        return dict(value.to_dict())
    return dict(value)


def _id_of(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, Mapping):
        identifier = value.get("id")
        return str(identifier) if identifier else None
    return str(value)


def _ensure_stripe() -> None:
    if not settings.stripe_configured:
        raise StripeNotConfiguredError("Stripe ist nicht konfiguriert.")
    stripe.api_key = settings.stripe_secret_key


# --------------------------------------------------------------------------------------
# Access rules
# --------------------------------------------------------------------------------------


def is_plus(user: User) -> bool:
    return (user.subscription_status or "") in ACTIVE_SUBSCRIPTION_STATUSES


def plan_is_unlocked(user: User, record: TrainingPlanRecord) -> bool:
    if not settings.paywall_enabled:
        return True
    return is_plus(user) or record.unlocked_at is not None


def plan_access(user: User, record: TrainingPlanRecord) -> PlanAccess:
    total = int(record.duration_weeks)
    if plan_is_unlocked(user, record):
        return PlanAccess(level="full", previewWeeks=total, totalWeeks=total, unlockedAt=_aware(record.unlocked_at))
    return PlanAccess(level="preview", previewWeeks=min(settings.preview_weeks, total), totalWeeks=total)


def preview_payload(payload: Mapping[str, Any], preview_weeks: int) -> dict[str, Any]:
    """Return a copy of the plan JSON that only contains the first ``preview_weeks`` weeks."""

    plan = copy.deepcopy(dict(payload))
    weeks = plan.get("weeks") or []
    plan["weeks"] = [week for week in weeks if int(week.get("weekNumber", 0)) <= preview_weeks]
    return plan


def require_plan_unlocked(user: User, record: TrainingPlanRecord) -> None:
    if plan_is_unlocked(user, record):
        return
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "code": UPGRADE_REQUIRED_CODE,
            "message": (
                f"Im kostenlosen Tarif siehst du die ersten {settings.preview_weeks} Wochen als Vorschau. "
                "Mit Plus oder dem Kauf dieses Trainingsblocks schaltest du den vollständigen Plan und das PDF frei."
            ),
            "planId": record.id,
        },
    )


# --------------------------------------------------------------------------------------
# Prices
# --------------------------------------------------------------------------------------


_price_cache: dict[str, tuple[float, PriceInfo]] = {}
# After a failed Stripe call, fall back silently for a while instead of retrying on every request.
_price_retry_after = 0.0
PRICE_FAILURE_BACKOFF_SECONDS = 60


def _price_from_stripe(price: Mapping[str, Any]) -> PriceInfo:
    recurring = price.get("recurring") or None
    return PriceInfo(
        amount=int(price.get("unit_amount") or 0),
        currency=str(price.get("currency", "eur")).upper(),
        type="recurring" if recurring else "one_time",
        interval=str(recurring.get("interval")) if recurring else None,
        intervalCount=int((recurring or {}).get("interval_count") or 1),
        priceId=_id_of(price.get("id")),
        source="stripe",
    )


def _load_prices() -> None:
    """Fetch all catalog prices from Stripe in one call; cache successes only."""

    global _price_retry_after
    if not settings.stripe_configured:
        return
    products = _products()
    now = time.monotonic()
    if now < _price_retry_after:
        return
    if all(spec.lookup_key in _price_cache and _price_cache[spec.lookup_key][0] > now for spec in products.values()):
        return
    try:
        _ensure_stripe()
        result = _plain(stripe.Price.list(lookup_keys=[spec.lookup_key for spec in products.values()], active=True, limit=10))
    except Exception as exc:  # noqa: BLE001 - price display must never break the app
        _price_retry_after = now + PRICE_FAILURE_BACKOFF_SECONDS
        logger.warning("Stripe prices could not be loaded (using fallback for %ss): %s", PRICE_FAILURE_BACKOFF_SECONDS, exc)
        return
    for item in result.get("data") or []:
        price = _plain(item)
        lookup_key = price.get("lookup_key")
        if lookup_key:
            _price_cache[str(lookup_key)] = (now + PRICE_CACHE_SECONDS, _price_from_stripe(price))


def price_for(product_key: str) -> PriceInfo:
    spec = _products()[product_key]
    _load_prices()
    cached = _price_cache.get(spec.lookup_key)
    if cached is not None:
        return cached[1]
    return spec.fallback


def price_catalog() -> PriceCatalog:
    return PriceCatalog(
        plusMonthly=price_for("plus_monthly"),
        plusYearly=price_for("plus_yearly"),
        singleBlock=price_for("single_block"),
    )


# --------------------------------------------------------------------------------------
# Stripe gateway. Thin wrappers so tests can monkeypatch a single module.
# --------------------------------------------------------------------------------------


def create_customer(user: User) -> str:
    _ensure_stripe()
    customer = stripe.Customer.create(
        email=user.email,
        name=user.first_name or None,
        metadata={"user_id": user.id},
    )
    return str(customer["id"])


def create_checkout_session(
    user: User,
    customer_id: str,
    product_key: str,
    plan: TrainingPlanRecord | None = None,
) -> str:
    _ensure_stripe()
    spec = _products()[product_key]
    price = price_for(product_key)
    if not price.priceId:
        raise StripeNotConfiguredError(f"Für {product_key} ist in Stripe kein aktiver Preis mit Lookup-Key {spec.lookup_key} hinterlegt.")

    base = settings.public_frontend_url
    metadata = {"user_id": user.id, "product_key": product_key}
    params: dict[str, Any] = {
        "mode": spec.mode,
        "customer": customer_id,
        "line_items": [{"price": price.priceId, "quantity": 1}],
        "client_reference_id": user.id,
        "allow_promotion_codes": True,
        "customer_update": {"address": "auto", "name": "auto"},
    }
    if spec.mode == "payment":
        if plan is None:
            raise ValueError("single_block requires a plan")
        metadata["plan_id"] = plan.id
        params["payment_intent_data"] = {"metadata": metadata}
        params["invoice_creation"] = {"enabled": True}
        params["success_url"] = f"{base}/?checkout=success&session_id={{CHECKOUT_SESSION_ID}}#plan/{plan.id}"
        params["cancel_url"] = f"{base}/?checkout=cancel#plan/{plan.id}"
    else:
        params["subscription_data"] = {"metadata": metadata}
        params["success_url"] = f"{base}/?checkout=success&session_id={{CHECKOUT_SESSION_ID}}#konto"
        params["cancel_url"] = f"{base}/?checkout=cancel#abo"
    params["metadata"] = metadata

    session = stripe.checkout.Session.create(**params)
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


# --------------------------------------------------------------------------------------
# Applying Stripe state to the database
# --------------------------------------------------------------------------------------


def _period_end(subscription: Mapping[str, Any]) -> datetime | None:
    # Newer Stripe API versions moved current_period_end from the subscription onto
    # its items; support both shapes.
    value = subscription.get("current_period_end")
    if value is None:
        value = _first_item(subscription).get("current_period_end")
    return _from_timestamp(value)


def _first_item(subscription: Mapping[str, Any]) -> Mapping[str, Any]:
    items = subscription.get("items") or {}
    data = items.get("data") if isinstance(items, Mapping) else None
    if data and isinstance(data[0], Mapping):
        return data[0]
    return {}


def apply_subscription(user: User, subscription: Mapping[str, Any]) -> None:
    """Mirror a Stripe subscription object onto the user."""

    user.stripe_subscription_id = _id_of(subscription.get("id"))
    customer_id = _id_of(subscription.get("customer"))
    if customer_id:
        user.stripe_customer_id = customer_id
    user.subscription_status = str(subscription.get("status") or "") or None
    user.subscription_cancel_at_period_end = bool(subscription.get("cancel_at_period_end", False))
    user.subscription_current_period_end = _period_end(subscription)
    price = _first_item(subscription).get("price")
    recurring = price.get("recurring") if isinstance(price, Mapping) else None
    if isinstance(recurring, Mapping) and recurring.get("interval"):
        user.subscription_interval = str(recurring["interval"])


def unlock_plan(db: Session, user: User, plan_id: str, checkout_session_id: str | None) -> TrainingPlanRecord | None:
    record = db.scalar(
        select(TrainingPlanRecord).where(TrainingPlanRecord.id == plan_id, TrainingPlanRecord.user_id == user.id)
    )
    if record is None:
        logger.warning("Paid checkout %s references unknown plan %s for user %s.", checkout_session_id, plan_id, user.id)
        return None
    if record.unlocked_at is None:
        record.unlocked_at = datetime.now(timezone.utc)
    if checkout_session_id:
        record.stripe_checkout_session_id = checkout_session_id
    return record


def _user_for(db: Session, *, user_id: Any = None, customer_id: str | None = None) -> User | None:
    if user_id:
        user = db.scalar(select(User).where(User.id == str(user_id)))
        if user is not None:
            return user
    if customer_id:
        return db.scalar(select(User).where(User.stripe_customer_id == customer_id))
    return None


def _apply_checkout_session(db: Session, user: User, session: Mapping[str, Any]) -> str | None:
    """Apply a completed Checkout Session. Returns the unlocked plan id for one-time purchases."""

    customer_id = _id_of(session.get("customer"))
    if customer_id:
        user.stripe_customer_id = customer_id
    metadata = session.get("metadata") or {}
    mode = session.get("mode")

    if mode == "subscription":
        subscription = session.get("subscription")
        if isinstance(subscription, Mapping):
            apply_subscription(user, subscription)
        elif subscription:
            apply_subscription(user, retrieve_subscription(str(subscription)))
        return None

    if mode == "payment":
        if session.get("payment_status") not in ("paid", "no_payment_required"):
            return None
        plan_id = metadata.get("plan_id") if isinstance(metadata, Mapping) else None
        if not plan_id:
            return None
        record = unlock_plan(db, user, str(plan_id), _id_of(session.get("id")))
        return record.id if record else None

    return None


def handle_webhook_event(db: Session, event: Mapping[str, Any]) -> str:
    """Process a verified Stripe event. Returns a short outcome label for logging/tests."""

    event_type = str(event.get("type", ""))
    data_object = (event.get("data") or {}).get("object") or {}

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        metadata = data_object.get("metadata") or {}
        user = _user_for(
            db,
            user_id=data_object.get("client_reference_id") or (metadata.get("user_id") if isinstance(metadata, Mapping) else None),
            customer_id=_id_of(data_object.get("customer")),
        )
        if user is None:
            logger.warning("%s without matching user (session %s).", event_type, data_object.get("id"))
            return "no-user"
        unlocked = _apply_checkout_session(db, user, data_object)
        db.commit()
        return "plan-unlocked" if unlocked else "checkout-completed"

    if event_type in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
    }:
        metadata = data_object.get("metadata") or {}
        user = _user_for(
            db,
            user_id=metadata.get("user_id") if isinstance(metadata, Mapping) else None,
            customer_id=_id_of(data_object.get("customer")),
        )
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


def complete_checkout_for_user(db: Session, user: User, session_id: str) -> str | None:
    """Called when the browser returns from Stripe Checkout.

    The webhook is the source of truth, but it can arrive a few seconds later than the
    redirect; syncing here makes the app reflect the purchase immediately. Returns the
    unlocked plan id for one-time purchases.
    """

    session = retrieve_checkout_session(session_id)
    reference = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
    customer_id = _id_of(session.get("customer"))
    if str(reference or "") != user.id and (not customer_id or customer_id != user.stripe_customer_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Diese Zahlung gehört nicht zu deinem Konto.")
    unlocked = _apply_checkout_session(db, user, session)
    db.commit()
    return unlocked


def billing_status(user: User) -> BillingStatus:
    plus = is_plus(user)
    return BillingStatus(
        tier="plus" if plus else "free",
        hasFullAccess=plus or not settings.paywall_enabled,
        paywallEnabled=settings.paywall_enabled,
        paymentsConfigured=settings.stripe_configured,
        previewWeeks=settings.preview_weeks,
        subscriptionStatus=user.subscription_status,
        subscriptionInterval=user.subscription_interval,
        cancelAtPeriodEnd=bool(user.subscription_cancel_at_period_end),
        currentPeriodEnd=_aware(user.subscription_current_period_end),
        prices=price_catalog(),
    )
