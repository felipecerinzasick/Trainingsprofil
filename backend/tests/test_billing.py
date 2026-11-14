from __future__ import annotations

import hashlib
import hmac
import json
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

from app.database import init_db
from app.models import TrainingPlanRecord, User
from app.services import billing


ROOT = Path(__file__).resolve().parents[2]
WEBHOOK_SECRET = "whsec_test_secret"


def load_profile() -> dict:
    return json.loads((ROOT / "frontend" / "examples" / "active-senior-profile.json").read_text(encoding="utf-8"))


def register(client: TestClient, email: str = "free@example.com") -> tuple[dict[str, str], str]:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "very-secure-password", "firstName": "Toni"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return {"Authorization": f"Bearer {body['accessToken']}"}, body["user"]["id"]


def create_plan(client: TestClient, headers: dict[str, str], weeks: int = 8) -> dict:
    assert client.put("/api/profile", headers=headers, json=load_profile()).status_code == 200
    generated = client.post("/api/plans/generate", headers=headers, json={"durationWeeks": weeks})
    assert generated.status_code == 201, generated.text
    return generated.json()


def sign(payload: bytes, secret: str = WEBHOOK_SECRET) -> str:
    timestamp = int(time.time())
    signed = f"{timestamp}.".encode() + payload
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


def post_event(client: TestClient, event: dict) -> dict:
    payload = json.dumps(event).encode()
    response = client.post("/api/billing/webhook", content=payload, headers={"Stripe-Signature": sign(payload)})
    assert response.status_code == 200, response.text
    return response.json()


def subscription_event(user_id: str, event_type: str = "customer.subscription.updated", status: str = "active", interval: str = "month") -> dict:
    return {
        "id": "evt_1",
        "type": event_type,
        "data": {
            "object": {
                "id": "sub_123",
                "object": "subscription",
                "customer": "cus_123",
                "status": status,
                "cancel_at_period_end": False,
                "metadata": {"user_id": user_id},
                "items": {"data": [{"current_period_end": int(time.time()) + 30 * 86400, "price": {"recurring": {"interval": interval}}}]},
            }
        },
    }


@pytest.fixture()
def stripe_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(billing.settings, "stripe_secret_key", "sk_test_dummy")
    monkeypatch.setattr(billing.settings, "stripe_webhook_secret", WEBHOOK_SECRET)
    # Never talk to Stripe for prices in tests.
    monkeypatch.setattr(billing, "_load_prices", lambda: None)


def test_public_prices_fall_back_to_the_pricing_sheet(client: TestClient) -> None:
    response = client.get("/api/billing/prices")
    assert response.status_code == 200, response.text
    prices = response.json()
    assert prices["plusMonthly"] == {"amount": 999, "currency": "EUR", "type": "recurring", "interval": "month", "intervalCount": 1, "priceId": None, "source": "fallback"}
    assert prices["plusYearly"]["amount"] == 5999 and prices["plusYearly"]["interval"] == "year"
    assert prices["singleBlock"]["amount"] == 2499 and prices["singleBlock"]["type"] == "one_time"


def test_free_account_sees_only_the_preview_weeks(client: TestClient) -> None:
    headers, _ = register(client)
    status = client.get("/api/billing/status", headers=headers).json()
    assert status["tier"] == "free"
    assert status["hasFullAccess"] is False
    assert status["previewWeeks"] == 2

    record = create_plan(client, headers, weeks=8)
    assert record["access"] == {"level": "preview", "previewWeeks": 2, "totalWeeks": 8, "unlockedAt": None}
    assert record["durationWeeks"] == 8
    assert [week["weekNumber"] for week in record["plan"]["weeks"]] == [1, 2]
    assert record["plan"]["durationWeeks"] == 8  # metadata stays intact, only weeks are cut

    detail = client.get(f"/api/plans/{record['id']}", headers=headers).json()
    assert len(detail["plan"]["weeks"]) == 2
    listing = client.get("/api/plans", headers=headers).json()
    assert listing[0]["accessLevel"] == "preview"

    pdf = client.get(f"/api/plans/{record['id']}/pdf", headers=headers)
    assert pdf.status_code == 402, pdf.text
    assert pdf.json()["detail"]["code"] == "UPGRADE_REQUIRED"
    assert pdf.json()["detail"]["planId"] == record["id"]

    # Own data can always be deleted.
    assert client.delete(f"/api/plans/{record['id']}", headers=headers).status_code == 200


def test_paywall_can_be_disabled(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(billing.settings, "paywall_enabled", False)
    headers, _ = register(client)
    record = create_plan(client, headers, weeks=4)
    assert record["access"]["level"] == "full"
    assert len(record["plan"]["weeks"]) == 4
    assert client.get(f"/api/plans/{record['id']}/pdf", headers=headers).status_code == 200
    assert client.get("/api/billing/status", headers=headers).json()["hasFullAccess"] is True


def test_plus_subscription_unlocks_every_plan(client: TestClient, stripe_settings: None) -> None:
    headers, user_id = register(client)
    record = create_plan(client, headers, weeks=8)

    assert post_event(client, subscription_event(user_id, interval="year"))["message"] == "subscription-synced"

    status = client.get("/api/billing/status", headers=headers).json()
    assert status["tier"] == "plus"
    assert status["hasFullAccess"] is True
    assert status["subscriptionStatus"] == "active"
    assert status["subscriptionInterval"] == "year"
    assert status["currentPeriodEnd"] is not None

    detail = client.get(f"/api/plans/{record['id']}", headers=headers).json()
    assert detail["access"]["level"] == "full"
    assert len(detail["plan"]["weeks"]) == 8
    assert client.get(f"/api/plans/{record['id']}/pdf", headers=headers).status_code == 200

    # Cancellation locks the plans again (back to preview).
    post_event(client, subscription_event(user_id, "customer.subscription.deleted", status="canceled"))
    assert client.get("/api/billing/status", headers=headers).json()["tier"] == "free"
    assert len(client.get(f"/api/plans/{record['id']}", headers=headers).json()["plan"]["weeks"]) == 2


def test_single_block_purchase_unlocks_only_that_plan(client: TestClient, db: Session, stripe_settings: None) -> None:
    headers, user_id = register(client)
    first = create_plan(client, headers, weeks=8)
    second = client.post("/api/plans/generate", headers=headers, json={"durationWeeks": 4}).json()

    event = {
        "id": "evt_2",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_block",
                "object": "checkout.session",
                "mode": "payment",
                "payment_status": "paid",
                "customer": "cus_123",
                "client_reference_id": user_id,
                "metadata": {"user_id": user_id, "product_key": "single_block", "plan_id": first["id"]},
            }
        },
    }
    assert post_event(client, event)["message"] == "plan-unlocked"

    unlocked = client.get(f"/api/plans/{first['id']}", headers=headers).json()
    assert unlocked["access"]["level"] == "full"
    assert unlocked["access"]["unlockedAt"] is not None
    assert len(unlocked["plan"]["weeks"]) == 8
    assert client.get(f"/api/plans/{first['id']}/pdf", headers=headers).status_code == 200

    still_locked = client.get(f"/api/plans/{second['id']}", headers=headers).json()
    assert still_locked["access"]["level"] == "preview"
    assert client.get("/api/billing/status", headers=headers).json()["tier"] == "free"

    db.expire_all()
    stored = db.scalar(select(TrainingPlanRecord).where(TrainingPlanRecord.id == first["id"]))
    assert stored is not None and stored.stripe_checkout_session_id == "cs_test_block"

    # Unpaid sessions do not unlock anything.
    event["data"]["object"].update({"id": "cs_unpaid", "payment_status": "unpaid", "metadata": {"user_id": user_id, "product_key": "single_block", "plan_id": second["id"]}})
    assert post_event(client, event)["message"] == "checkout-completed"
    assert client.get(f"/api/plans/{second['id']}", headers=headers).json()["access"]["level"] == "preview"


def test_checkout_requires_stripe_configuration(client: TestClient) -> None:
    headers, _ = register(client)
    response = client.post("/api/billing/checkout", headers=headers, json={"product": "plus_monthly"})
    assert response.status_code == 503


def test_checkout_validates_products_and_creates_sessions(
    client: TestClient, db: Session, stripe_settings: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, user_id = register(client)
    record = create_plan(client, headers, weeks=4)
    calls: list[tuple] = []

    monkeypatch.setattr(billing, "create_customer", lambda user: "cus_123")

    def fake_checkout(user: User, customer_id: str, product_key: str, plan: TrainingPlanRecord | None = None) -> str:
        calls.append((user.id, customer_id, product_key, plan.id if plan else None))
        return f"https://checkout.stripe.com/c/pay/{product_key}"

    monkeypatch.setattr(billing, "create_checkout_session", fake_checkout)

    assert client.post("/api/billing/checkout", headers=headers, json={"product": "single_block"}).status_code == 422
    assert client.post("/api/billing/checkout", headers=headers, json={"product": "single_block", "planId": "missing"}).status_code == 404
    assert client.post("/api/billing/checkout", headers=headers, json={"product": "nope"}).status_code == 422

    ok = client.post("/api/billing/checkout", headers=headers, json={"product": "plus_yearly"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["url"].endswith("plus_yearly")

    block = client.post("/api/billing/checkout", headers=headers, json={"product": "single_block", "planId": record["id"]})
    assert block.status_code == 200, block.text
    assert calls == [(user_id, "cus_123", "plus_yearly", None), (user_id, "cus_123", "single_block", record["id"])]

    db.expire_all()
    user = db.scalar(select(User).where(User.id == user_id))
    assert user is not None and user.stripe_customer_id == "cus_123"

    # Plus members cannot buy Plus twice.
    post_event(client, subscription_event(user_id))
    assert client.post("/api/billing/checkout", headers=headers, json={"product": "plus_monthly"}).status_code == 409
    # ... and an unlocked plan cannot be bought again.
    assert client.post("/api/billing/checkout", headers=headers, json={"product": "single_block", "planId": record["id"]}).status_code == 409


def test_real_checkout_session_parameters(stripe_settings: None, monkeypatch: pytest.MonkeyPatch) -> None:
    """The Stripe call itself: subscription vs. one-time sessions and the return URLs."""

    captured: list[dict] = []

    class FakeSession:
        @staticmethod
        def create(**params: object) -> dict:
            captured.append(params)
            return {"url": "https://checkout.stripe.com/c/pay/x"}

    monkeypatch.setattr(billing.stripe.checkout, "Session", FakeSession)
    monkeypatch.setattr(billing.settings, "frontend_url", "https://app.example.com")
    monkeypatch.setattr(billing, "price_for", lambda key: billing.PriceInfo(amount=1, currency="EUR", type="one_time", priceId=f"price_{key}", source="stripe"))

    user = User(id="u1", email="a@example.com", password_hash="x", first_name="A")
    plan = TrainingPlanRecord(id="p1", user_id="u1")

    billing.create_checkout_session(user, "cus_1", "plus_monthly")
    billing.create_checkout_session(user, "cus_1", "single_block", plan)

    subscription, payment = captured
    assert subscription["mode"] == "subscription"
    assert subscription["line_items"] == [{"price": "price_plus_monthly", "quantity": 1}]
    assert subscription["success_url"] == "https://app.example.com/?checkout=success&session_id={CHECKOUT_SESSION_ID}#konto"
    assert subscription["subscription_data"]["metadata"]["user_id"] == "u1"

    assert payment["mode"] == "payment"
    assert payment["metadata"] == {"user_id": "u1", "product_key": "single_block", "plan_id": "p1"}
    assert payment["success_url"] == "https://app.example.com/?checkout=success&session_id={CHECKOUT_SESSION_ID}#plan/p1"
    assert payment["cancel_url"] == "https://app.example.com/?checkout=cancel#plan/p1"

    with pytest.raises(ValueError):
        billing.create_checkout_session(user, "cus_1", "single_block")


def test_checkout_completion_syncs_immediately(
    client: TestClient, stripe_settings: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers, user_id = register(client)
    record = create_plan(client, headers, weeks=4)

    def fake_retrieve(session_id: str) -> dict:
        if session_id == "cs_test_subscription":
            return {
                "id": session_id,
                "mode": "subscription",
                "client_reference_id": user_id,
                "customer": "cus_999",
                "subscription": {"id": "sub_999", "customer": "cus_999", "status": "active", "cancel_at_period_end": False, "current_period_end": int(time.time()) + 86400},
            }
        return {
            "id": session_id,
            "mode": "payment",
            "payment_status": "paid",
            "client_reference_id": user_id,
            "customer": "cus_999",
            "metadata": {"user_id": user_id, "product_key": "single_block", "plan_id": record["id"]},
        }

    monkeypatch.setattr(billing, "retrieve_checkout_session", fake_retrieve)

    block = client.post("/api/billing/checkout/complete", headers=headers, json={"sessionId": "cs_test_single_block"})
    assert block.status_code == 200, block.text
    assert block.json()["unlockedPlanId"] == record["id"]
    assert block.json()["status"]["tier"] == "free"
    assert client.get(f"/api/plans/{record['id']}", headers=headers).json()["access"]["level"] == "full"

    plus = client.post("/api/billing/checkout/complete", headers=headers, json={"sessionId": "cs_test_subscription"})
    assert plus.status_code == 200, plus.text
    assert plus.json()["status"]["tier"] == "plus"
    assert plus.json()["unlockedPlanId"] is None

    other_headers, _ = register(client, "other@example.com")
    forbidden = client.post("/api/billing/checkout/complete", headers=other_headers, json={"sessionId": "cs_test_subscription"})
    assert forbidden.status_code == 403


def test_webhook_rejects_invalid_signature(client: TestClient, stripe_settings: None) -> None:
    payload = json.dumps({"type": "customer.subscription.updated", "data": {"object": {}}}).encode()
    bad = client.post("/api/billing/webhook", content=payload, headers={"Stripe-Signature": sign(payload, "other")})
    assert bad.status_code == 400
    assert client.post("/api/billing/webhook", content=payload).status_code == 400


def test_portal_requires_existing_customer(client: TestClient, stripe_settings: None) -> None:
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
            "CREATE TABLE training_plans (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, title VARCHAR(240) NOT NULL, "
            "goal_label VARCHAR(180) NOT NULL, sport_focus VARCHAR(80) NOT NULL, status VARCHAR(40) NOT NULL, safety_status VARCHAR(40) NOT NULL, "
            "start_date DATE NOT NULL, end_date DATE NOT NULL, duration_weeks INTEGER NOT NULL, profile_snapshot JSON NOT NULL, payload JSON NOT NULL, "
            "created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"
        ))
        connection.execute(text(
            "INSERT INTO users VALUES ('u1', 'a@example.com', 'x', 'A', 1, '2024-01-01 00:00:00', '2024-01-01 00:00:00')"
        ))

    init_db(engine)

    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    plan_columns = {column["name"] for column in inspect(engine).get_columns("training_plans")}
    assert {"stripe_customer_id", "subscription_status", "subscription_interval", "subscription_cancel_at_period_end"} <= user_columns
    assert {"unlocked_at", "stripe_checkout_session_id"} <= plan_columns
    with Session(engine) as session:
        user = session.scalar(select(User).where(User.id == "u1"))
        assert user is not None
        assert user.subscription_cancel_at_period_end is False
        assert billing.is_plus(user) is False
    engine.dispose()
