from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

from app.database import init_db
from app.models import User
from app.services import billing


ROOT = Path(__file__).resolve().parents[2]
WEBHOOK_SECRET = "whsec_test_secret"


def load_profile() -> dict:
    return json.loads((ROOT / "frontend" / "examples" / "active-senior-profile.json").read_text(encoding="utf-8"))


def register(client: TestClient, email: str = "trial@example.com") -> tuple[dict[str, str], str]:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "very-secure-password", "firstName": "Toni"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return {"Authorization": f"Bearer {body['accessToken']}"}, body["user"]["id"]


def expire_trial(db: Session, user_id: str, days_ago: int = 15) -> None:
    user = db.scalar(select(User).where(User.id == user_id))
    assert user is not None
    user.created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
    db.commit()


def sign(payload: bytes, secret: str = WEBHOOK_SECRET) -> str:
    timestamp = int(time.time())
    signed = f"{timestamp}.".encode() + payload
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


@pytest.fixture()
def stripe_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(billing.settings, "stripe_secret_key", "sk_test_dummy")
    monkeypatch.setattr(billing.settings, "stripe_price_id", "price_dummy")
    monkeypatch.setattr(billing.settings, "stripe_webhook_secret", WEBHOOK_SECRET)
    monkeypatch.setattr(billing, "price_info", lambda: None)


def test_new_account_is_in_trial_with_full_access(client: TestClient) -> None:
    headers, _ = register(client)
    status = client.get("/api/billing/status", headers=headers)
    assert status.status_code == 200, status.text
    body = status.json()
    assert body["accessState"] == "trial"
    assert body["hasAccess"] is True
    assert body["trialDays"] == 14
    assert body["trialDaysLeft"] == 14
    assert body["subscriptionStatus"] is None

    save = client.put("/api/profile", headers=headers, json=load_profile())
    assert save.status_code == 200, save.text
    generated = client.post("/api/plans/generate", headers=headers, json={"durationWeeks": 4})
    assert generated.status_code == 201, generated.text


def test_expired_trial_blocks_plan_access_but_not_profile(client: TestClient, db: Session) -> None:
    headers, user_id = register(client)
    save = client.put("/api/profile", headers=headers, json=load_profile())
    assert save.status_code == 200
    generated = client.post("/api/plans/generate", headers=headers, json={"durationWeeks": 4})
    assert generated.status_code == 201
    plan_id = generated.json()["id"]

    expire_trial(db, user_id)

    status = client.get("/api/billing/status", headers=headers).json()
    assert status["accessState"] == "expired"
    assert status["hasAccess"] is False
    assert status["trialDaysLeft"] == 0

    for call in (
        lambda: client.post("/api/plans/generate", headers=headers, json={"durationWeeks": 4}),
        lambda: client.get("/api/plans", headers=headers),
        lambda: client.get(f"/api/plans/{plan_id}", headers=headers),
        lambda: client.get(f"/api/plans/{plan_id}/pdf", headers=headers),
    ):
        response = call()
        assert response.status_code == 402, response.text
        assert response.json()["detail"]["code"] == "SUBSCRIPTION_REQUIRED"

    # Profile and account data stay accessible, and own data can still be deleted.
    assert client.get("/api/profile", headers=headers).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.delete(f"/api/plans/{plan_id}", headers=headers).status_code == 200


def test_paywall_can_be_disabled(client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    headers, user_id = register(client)
    expire_trial(db, user_id)
    monkeypatch.setattr(billing.settings, "paywall_enabled", False)
    assert client.get("/api/plans", headers=headers).status_code == 200
    body = client.get("/api/billing/status", headers=headers).json()
    assert body["accessState"] == "expired"
    assert body["hasAccess"] is True


def test_checkout_requires_stripe_configuration(client: TestClient) -> None:
    headers, _ = register(client)
    response = client.post("/api/billing/checkout", headers=headers)
    assert response.status_code == 503


def test_checkout_creates_customer_and_returns_url(
    client: TestClient, db: Session, stripe_settings: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, user_id = register(client)
    calls: dict[str, object] = {}

    def fake_create_customer(user: User) -> str:
        calls["customer_for"] = user.id
        return "cus_123"

    def fake_checkout(user: User, customer_id: str) -> str:
        calls["checkout"] = (user.id, customer_id)
        return "https://checkout.stripe.com/c/pay/cs_test_123"

    monkeypatch.setattr(billing, "create_customer", fake_create_customer)
    monkeypatch.setattr(billing, "create_checkout_session", fake_checkout)

    response = client.post("/api/billing/checkout", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["url"].startswith("https://checkout.stripe.com/")
    assert calls == {"customer_for": user_id, "checkout": (user_id, "cus_123")}

    db.expire_all()
    user = db.scalar(select(User).where(User.id == user_id))
    assert user is not None and user.stripe_customer_id == "cus_123"

    # A second checkout reuses the stored customer.
    monkeypatch.setattr(billing, "create_customer", lambda user: pytest.fail("customer must be reused"))
    assert client.post("/api/billing/checkout", headers=headers).status_code == 200


def test_webhook_activates_subscription_and_unlocks_access(
    client: TestClient, db: Session, stripe_settings: None
) -> None:
    headers, user_id = register(client)
    expire_trial(db, user_id)
    assert client.get("/api/plans", headers=headers).status_code == 402

    period_end = int(time.time()) + 30 * 86400
    event = {
        "id": "evt_1",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_123",
                "object": "subscription",
                "customer": "cus_123",
                "status": "active",
                "cancel_at_period_end": False,
                "metadata": {"user_id": user_id},
                "items": {"data": [{"current_period_end": period_end}]},
            }
        },
    }
    payload = json.dumps(event).encode()
    response = client.post("/api/billing/webhook", content=payload, headers={"Stripe-Signature": sign(payload)})
    assert response.status_code == 200, response.text
    assert response.json()["message"] == "subscription-synced"

    status = client.get("/api/billing/status", headers=headers).json()
    assert status["accessState"] == "active"
    assert status["hasAccess"] is True
    assert status["subscriptionStatus"] == "active"
    assert status["currentPeriodEnd"] is not None
    assert client.get("/api/plans", headers=headers).status_code == 200

    # Cancellation at the end of the period locks the account again.
    event["type"] = "customer.subscription.deleted"
    event["data"]["object"]["status"] = "canceled"
    payload = json.dumps(event).encode()
    response = client.post("/api/billing/webhook", content=payload, headers={"Stripe-Signature": sign(payload)})
    assert response.status_code == 200
    assert client.get("/api/billing/status", headers=headers).json()["accessState"] == "expired"
    assert client.get("/api/plans", headers=headers).status_code == 402


def test_webhook_rejects_invalid_signature(client: TestClient, stripe_settings: None) -> None:
    payload = json.dumps({"type": "customer.subscription.updated", "data": {"object": {}}}).encode()
    bad = client.post("/api/billing/webhook", content=payload, headers={"Stripe-Signature": sign(payload, "other")})
    assert bad.status_code == 400
    missing = client.post("/api/billing/webhook", content=payload)
    assert missing.status_code == 400


def test_checkout_completion_syncs_subscription_immediately(
    client: TestClient, db: Session, stripe_settings: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, user_id = register(client)
    expire_trial(db, user_id)

    def fake_retrieve(session_id: str) -> dict:
        assert session_id == "cs_test_abcdefghijk"
        return {
            "id": session_id,
            "client_reference_id": user_id,
            "customer": "cus_999",
            "subscription": {
                "id": "sub_999",
                "customer": "cus_999",
                "status": "active",
                "cancel_at_period_end": False,
                "current_period_end": int(time.time()) + 86400,
            },
        }

    monkeypatch.setattr(billing, "retrieve_checkout_session", fake_retrieve)
    response = client.post("/api/billing/checkout/complete", headers=headers, json={"sessionId": "cs_test_abcdefghijk"})
    assert response.status_code == 200, response.text
    assert response.json()["accessState"] == "active"
    assert client.get("/api/plans", headers=headers).status_code == 200

    # A session that belongs to someone else is rejected.
    other_headers, _ = register(client, "other@example.com")
    forbidden = client.post("/api/billing/checkout/complete", headers=other_headers, json={"sessionId": "cs_test_abcdefghijk"})
    assert forbidden.status_code == 403


def test_portal_requires_existing_customer(client: TestClient, stripe_settings: None, monkeypatch: pytest.MonkeyPatch) -> None:
    headers, _ = register(client)
    assert client.post("/api/billing/portal", headers=headers).status_code == 404


def test_init_db_adds_missing_billing_columns(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{(tmp_path / 'legacy.db').as_posix()}")
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE users (id VARCHAR(36) PRIMARY KEY, email VARCHAR(320) NOT NULL, "
            "password_hash VARCHAR(512) NOT NULL, first_name VARCHAR(120) NOT NULL, is_active BOOLEAN NOT NULL, "
            "created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"
        ))
        connection.execute(text(
            "INSERT INTO users VALUES ('u1', 'a@example.com', 'x', 'A', 1, '2024-01-01 00:00:00', '2024-01-01 00:00:00')"
        ))

    init_db(engine)

    columns = {column["name"] for column in inspect(engine).get_columns("users")}
    assert {"trial_ends_at", "stripe_customer_id", "subscription_status", "subscription_cancel_at_period_end"} <= columns
    with Session(engine) as session:
        user = session.scalar(select(User).where(User.id == "u1"))
        assert user is not None
        assert user.subscription_cancel_at_period_end is False
        assert billing.access_for(user).state == "expired"
    engine.dispose()
