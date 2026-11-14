import type { PriceCatalog, ProductKey } from "../api/types";
import { amountOf, intervalLabel, monthlyEquivalent, yearlySavingsPercent } from "../utils/billing";
import { Icon } from "./Icon";

export type BillingInterval = "month" | "year";

interface PricingTiersProps {
  prices: PriceCatalog;
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  previewWeeks?: number;
  /** Free tier call to action. Omit to show the free tier as the current plan without a button. */
  onFree?: () => void;
  freeLabel?: string;
  freeCurrent?: boolean;
  onPlus: (product: ProductKey) => void;
  plusLabel?: string;
  /** Single block call to action. Omit to show an explanatory hint instead of a button. */
  onSingle?: () => void;
  singleLabel?: string;
  singleHint?: string;
  showCoach?: boolean;
  busy?: boolean;
}

export function PricingTiers({
  prices,
  interval,
  onIntervalChange,
  previewWeeks = 2,
  onFree,
  freeLabel = "Kostenlos starten",
  freeCurrent = false,
  onPlus,
  plusLabel = "Plus wählen",
  onSingle,
  singleLabel = "Diesen Block freischalten",
  singleHint,
  showCoach = true,
  busy = false,
}: PricingTiersProps) {
  const plusPrice = interval === "year" ? prices.plusYearly : prices.plusMonthly;
  const savings = yearlySavingsPercent(prices.plusMonthly, prices.plusYearly);
  const plusProduct: ProductKey = interval === "year" ? "plus_yearly" : "plus_monthly";

  return (
    <div className="pricing">
      <div className="pricing-toggle" role="radiogroup" aria-label="Abrechnungszeitraum">
        <button type="button" role="radio" aria-checked={interval === "month"} className={interval === "month" ? "is-active" : ""} onClick={() => onIntervalChange("month")}>Monatlich</button>
        <button type="button" role="radio" aria-checked={interval === "year"} className={interval === "year" ? "is-active" : ""} onClick={() => onIntervalChange("year")}>
          Jährlich {savings > 0 && <em>−{savings} %</em>}
        </button>
      </div>

      <div className={`pricing-grid ${showCoach ? "pricing-grid--four" : ""}`}>
        <article className="pricing-card">
          <span className="pricing-card__name">Kostenlos</span>
          <p className="pricing-card__price"><strong>0 €</strong><span>für immer</span></p>
          <p className="pricing-card__lead">Konto, Trainings-Check und eine Vorschau jedes Plans: die ersten {previewWeeks} Wochen. So siehst du die Personalisierung, bevor du zahlst.</p>
          <ul>
            <li><Icon name="check" size={15} /> Trainings-Check in 7 Schritten</li>
            <li><Icon name="check" size={15} /> Beliebig viele Pläne erstellen</li>
            <li><Icon name="check" size={15} /> Woche 1–{previewWeeks} jedes Plans in voller Tiefe</li>
            <li><Icon name="check" size={15} /> Profil und Pläne im Konto gespeichert</li>
          </ul>
          {freeCurrent ? (
            <span className="pricing-card__current"><Icon name="check-circle" size={16} /> Dein aktueller Tarif</span>
          ) : onFree ? (
            <button type="button" className="button button--ghost pricing-card__cta" onClick={onFree}>{freeLabel} <Icon name="arrow-right" size={16} /></button>
          ) : null}
        </article>

        <article className="pricing-card pricing-card--featured">
          <span className="pricing-card__badge"><Icon name="spark" size={14} /> Beliebt</span>
          <span className="pricing-card__name">Plus</span>
          <p className="pricing-card__price">
            <strong>{amountOf(plusPrice)}</strong>
            <span>{intervalLabel(plusPrice)}</span>
          </p>
          <p className="pricing-card__lead">
            {interval === "year"
              ? `Entspricht ${monthlyEquivalent(prices.plusYearly)} pro Monat. Vollständige Pläne für ein ganzes Trainingsjahr.`
              : "Vollständige Pläne. Jederzeit kündbar."}
          </p>
          <ul>
            <li><Icon name="check" size={15} /> Alle Wochen jedes Trainingsblocks</li>
            <li><Icon name="check" size={15} /> PDF-Export für unterwegs</li>
            <li><Icon name="check" size={15} /> Unbegrenzt neue Blöcke bei neuen Zielen</li>
            <li><Icon name="check" size={15} /> Verwaltung und Kündigung im Kundenportal</li>
          </ul>
          <button type="button" className="button button--primary pricing-card__cta" disabled={busy} onClick={() => onPlus(plusProduct)}>
            {busy ? "Weiter zu Stripe …" : plusLabel}{!busy && <Icon name="arrow-right" size={16} />}
          </button>
        </article>

        <article className="pricing-card">
          <span className="pricing-card__name">Einzelner Trainingsblock</span>
          <p className="pricing-card__price"><strong>{amountOf(prices.singleBlock)}</strong><span>einmalig</span></p>
          <p className="pricing-card__lead">Ein Plan, komplett freigeschaltet – ohne Abo. Für alle, die auf ein einzelnes Ziel wie einen Halbmarathon hintrainieren.</p>
          <ul>
            <li><Icon name="check" size={15} /> Alle Wochen dieses einen Plans</li>
            <li><Icon name="check" size={15} /> PDF-Export für diesen Plan</li>
            <li><Icon name="check" size={15} /> Dauerhaft in deinem Konto</li>
            <li><Icon name="check" size={15} /> Kein Abo, keine Folgekosten</li>
          </ul>
          {onSingle ? (
            <button type="button" className="button button--soft pricing-card__cta" disabled={busy} onClick={onSingle}>
              {busy ? "Weiter zu Stripe …" : singleLabel}{!busy && <Icon name="arrow-right" size={16} />}
            </button>
          ) : (
            <span className="pricing-card__hint"><Icon name="info" size={15} /> {singleHint ?? "Freischalten direkt im jeweiligen Plan."}</span>
          )}
        </article>

        {showCoach && (
          <article className="pricing-card pricing-card--soon">
            <span className="pricing-card__name">Coach-Tarif</span>
            <p className="pricing-card__price"><strong>Bald</strong><span>ab ca. 49 € pro Monat</span></p>
            <p className="pricing-card__lead">Persönliche Begleitung: Ein Coach schaut jeden Monat auf deinen Plan, deine Rückmeldungen und passt den nächsten Block mit dir an.</p>
            <ul>
              <li><Icon name="check" size={15} /> Alles aus Plus</li>
              <li><Icon name="check" size={15} /> Monatlicher Plan-Check durch einen Coach</li>
              <li><Icon name="check" size={15} /> Rückfragen per Nachricht</li>
            </ul>
            <span className="pricing-card__hint"><Icon name="clock" size={15} /> In Vorbereitung</span>
          </article>
        )}
      </div>
    </div>
  );
}
