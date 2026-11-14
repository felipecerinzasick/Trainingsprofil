from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ProductKey = Literal["plus_monthly", "plus_yearly", "single_block"]
Tier = Literal["free", "plus"]


class PriceInfo(BaseModel):
    amount: int = Field(description="Betrag in der kleinsten Währungseinheit, z. B. Cent.")
    currency: str
    type: Literal["recurring", "one_time"]
    interval: str | None = None
    intervalCount: int = 1
    priceId: str | None = None
    source: Literal["stripe", "fallback"] = "fallback"


class PriceCatalog(BaseModel):
    plusMonthly: PriceInfo
    plusYearly: PriceInfo
    singleBlock: PriceInfo


class BillingStatus(BaseModel):
    tier: Tier
    hasFullAccess: bool
    paywallEnabled: bool
    paymentsConfigured: bool
    previewWeeks: int
    subscriptionStatus: str | None = None
    subscriptionInterval: str | None = None
    cancelAtPeriodEnd: bool = False
    currentPeriodEnd: datetime | None = None
    prices: PriceCatalog


class CheckoutRequest(BaseModel):
    product: ProductKey
    planId: str | None = Field(default=None, max_length=36)


class CheckoutSessionResponse(BaseModel):
    url: str


class CompleteCheckoutRequest(BaseModel):
    sessionId: str = Field(min_length=10, max_length=255)


class CompleteCheckoutResponse(BaseModel):
    status: BillingStatus
    unlockedPlanId: str | None = None


class PortalSessionResponse(BaseModel):
    url: str
