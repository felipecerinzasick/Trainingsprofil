import type { BillingStatus } from "../api/types";
import { formatPrice, trialLabel } from "../utils/billing";
import { Icon } from "./Icon";

interface TrialBannerProps {
  status: BillingStatus;
  onUpgrade: () => void;
}

/** Shown on the dashboard while an account is still in its free trial. */
export function TrialBanner({ status, onUpgrade }: TrialBannerProps) {
  if (!status.paywallEnabled) return null;
  if (status.accessState === "active") {
    if (status.subscriptionStatus !== "past_due") return null;
    return (
      <div className="trial-banner trial-banner--warning" role="status">
        <Icon name="alert" size={20} />
        <div>
          <strong>Deine letzte Zahlung ist fehlgeschlagen.</strong>
          <span> Bitte aktualisiere deine Zahlungsmethode, damit dein Zugang bestehen bleibt.</span>
        </div>
        <button type="button" className="button button--primary button--small" onClick={onUpgrade}>Zahlung prüfen <Icon name="arrow-right" size={15} /></button>
      </div>
    );
  }
  if (status.accessState !== "trial") return null;
  const price = formatPrice(status.price);
  const urgent = status.trialDaysLeft <= 3;
  return (
    <div className={`trial-banner ${urgent ? "trial-banner--warning" : ""}`} role="status">
      <Icon name={urgent ? "clock" : "spark"} size={20} />
      <div>
        <strong>{trialLabel(status)}</strong>
        <span> Danach brauchst du ein Abo{price ? ` (${price})` : ""}, um weiter Pläne zu erstellen und zu öffnen.</span>
      </div>
      <button type="button" className="button button--primary button--small" onClick={onUpgrade}>Jetzt upgraden <Icon name="arrow-right" size={15} /></button>
    </div>
  );
}
