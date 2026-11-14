from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


AccessState = Literal["trial", "active", "expired"]


class PriceInfo(BaseModel):
    amount: int = Field(description="Betrag in der kleinsten Währungseinheit, z. B. Rappen.")
    currency: str
    interval: str
    intervalCount: int = 1


class BillingStatus(BaseModel):
    accessState: AccessState
    hasAccess: bool
    paywallEnabled: bool
    paymentsConfigured: bool
    trialDays: int
    trialEndsAt: datetime
    trialDaysLeft: int
    subscriptionStatus: str | None = None
    cancelAtPeriodEnd: bool = False
    currentPeriodEnd: datetime | None = None
    price: PriceInfo | None = None


class CheckoutSessionResponse(BaseModel):
    url: str


class CompleteCheckoutRequest(BaseModel):
    sessionId: str = Field(min_length=10, max_length=255)


class PortalSessionResponse(BaseModel):
    url: str
