import type { BillingStatus, PriceInfo } from "../api/types";

export const SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED";

const INTERVALS: Record<string, string> = { day: "Tag", week: "Woche", month: "Monat", year: "Jahr" };

export function formatPrice(price: PriceInfo | null | undefined): string | null {
  if (!price) return null;
  const amount = new Intl.NumberFormat("de-CH", { style: "currency", currency: price.currency, minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2 }).format(price.amount / 100);
  const unit = INTERVALS[price.interval] ?? price.interval;
  return price.intervalCount > 1 ? `${amount} alle ${price.intervalCount} ${unit}e` : `${amount} pro ${unit}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function trialLabel(status: BillingStatus): string {
  if (status.trialDaysLeft <= 0) return "Deine Testphase ist abgelaufen.";
  if (status.trialDaysLeft === 1) return "Dein letzter kostenloser Testtag.";
  return `Noch ${status.trialDaysLeft} Tage kostenlos testen.`;
}

export function subscriptionLabel(status: BillingStatus): string {
  switch (status.subscriptionStatus) {
    case "active":
      return status.cancelAtPeriodEnd ? "Abo läuft aus" : "Abo aktiv";
    case "trialing":
      return "Abo in Testphase";
    case "past_due":
      return "Zahlung ausstehend";
    case "canceled":
      return "Abo beendet";
    case "unpaid":
      return "Zahlung fehlgeschlagen";
    default:
      return status.subscriptionStatus ?? "Kein Abo";
  }
}
