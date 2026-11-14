import type { BillingStatus, PriceCatalog, PriceInfo } from "../api/types";

export const UPGRADE_REQUIRED = "UPGRADE_REQUIRED";
export const PREVIEW_WEEKS_DEFAULT = 2;

/** Mirrors the pricing sheet; used until the API has answered (or when Stripe is unreachable). */
export const FALLBACK_PRICES: PriceCatalog = {
  plusMonthly: { amount: 999, currency: "EUR", type: "recurring", interval: "month", intervalCount: 1, priceId: null, source: "fallback" },
  plusYearly: { amount: 5999, currency: "EUR", type: "recurring", interval: "year", intervalCount: 1, priceId: null, source: "fallback" },
  singleBlock: { amount: 2499, currency: "EUR", type: "one_time", interval: null, intervalCount: 1, priceId: null, source: "fallback" },
};

const INTERVALS: Record<string, string> = { day: "Tag", week: "Woche", month: "Monat", year: "Jahr" };

export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: amount % 100 === 0 ? 0 : 2 }).format(amount / 100);
}

export function amountOf(price: PriceInfo): string {
  return formatAmount(price.amount, price.currency);
}

export function intervalLabel(price: PriceInfo): string {
  if (price.type === "one_time" || !price.interval) return "einmalig";
  const unit = INTERVALS[price.interval] ?? price.interval;
  return price.intervalCount > 1 ? `alle ${price.intervalCount} ${unit}e` : `pro ${unit}`;
}

export function formatPrice(price: PriceInfo): string {
  return `${amountOf(price)} ${intervalLabel(price)}`;
}

/** "5,00 €" – what the yearly plan costs per month. */
export function monthlyEquivalent(yearly: PriceInfo): string {
  return formatAmount(Math.round(yearly.amount / 12), yearly.currency);
}

export function yearlySavingsPercent(monthly: PriceInfo, yearly: PriceInfo): number {
  const fullYear = monthly.amount * 12;
  if (fullYear <= 0) return 0;
  return Math.max(0, Math.round((1 - yearly.amount / fullYear) * 100));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function subscriptionLabel(status: BillingStatus): string {
  const interval = status.subscriptionInterval === "year" ? "Plus jährlich" : status.subscriptionInterval === "month" ? "Plus monatlich" : "Plus";
  switch (status.subscriptionStatus) {
    case "active":
      return status.cancelAtPeriodEnd ? `${interval} · läuft aus` : `${interval} · aktiv`;
    case "trialing":
      return `${interval} · Testphase`;
    case "past_due":
      return `${interval} · Zahlung ausstehend`;
    case "canceled":
      return "Plus beendet";
    case "unpaid":
      return "Zahlung fehlgeschlagen";
    default:
      return status.subscriptionStatus ?? "Kostenlos";
  }
}
