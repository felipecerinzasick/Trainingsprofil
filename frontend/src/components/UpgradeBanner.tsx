import type { BillingStatus } from "../api/types";
import { amountOf } from "../utils/billing";
import { Icon } from "./Icon";

interface UpgradeBannerProps {
  status: BillingStatus;
  onUpgrade: () => void;
}

/** Dashboard hint for free accounts (and for Plus members whose payment failed). */
export function UpgradeBanner({ status, onUpgrade }: UpgradeBannerProps) {
  if (!status.paywallEnabled) return null;

  if (status.tier === "plus") {
    if (status.subscriptionStatus !== "past_due") return null;
    return (
      <div className="upgrade-banner upgrade-banner--warning" role="status">
        <Icon name="alert" size={20} />
        <div>
          <strong>Deine letzte Plus-Zahlung ist fehlgeschlagen.</strong>
          <span> Bitte aktualisiere deine Zahlungsmethode, damit deine Pläne vollständig bleiben.</span>
        </div>
        <button type="button" className="button button--primary button--small" onClick={onUpgrade}>Zahlung prüfen <Icon name="arrow-right" size={15} /></button>
      </div>
    );
  }

  return (
    <div className="upgrade-banner" role="status">
      <Icon name="spark" size={20} />
      <div>
        <strong>Kostenloser Tarif: Du siehst von jedem Plan die ersten {status.previewWeeks} Wochen.</strong>
        <span> Plus ab {amountOf(status.prices.plusMonthly)} pro Monat schaltet alle Wochen und den PDF-Export frei – oder du kaufst einen einzelnen Block.</span>
      </div>
      <button type="button" className="button button--primary button--small" onClick={onUpgrade}>Plus entdecken <Icon name="arrow-right" size={15} /></button>
    </div>
  );
}
