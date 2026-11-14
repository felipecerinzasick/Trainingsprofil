import { useState } from "react";
import { api, ApiError } from "../api/client";
import type { AuthUser, BillingStatus, ProductKey } from "../api/types";
import { FALLBACK_PRICES, formatDateTime, subscriptionLabel } from "../utils/billing";
import { AppHeader } from "./AppHeader";
import { Icon } from "./Icon";
import { PricingTiers, type BillingInterval } from "./PricingTiers";

export interface BillingPlanContext {
  id: string;
  title: string;
}

interface BillingPageProps {
  user: AuthUser;
  status: BillingStatus | null;
  /** Plan the visitor came from; enables the one-time unlock of exactly this plan. */
  planContext?: BillingPlanContext | null;
  notice?: string;
  onHome: () => void;
  onDashboard: () => void;
  onOpenPlan: (id: string) => void;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}

export function BillingPage({ user, status, planContext, notice, onHome, onDashboard, onOpenPlan, onLogout, onRefresh }: BillingPageProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [interval, setInterval] = useState<BillingInterval>("month");

  const redirect = async (call: () => Promise<{ url: string }>) => {
    setBusy(true);
    setError("");
    try {
      const { url } = await call();
      window.location.assign(url);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Die Zahlungsseite konnte nicht geöffnet werden.");
      setBusy(false);
    }
  };

  const prices = status?.prices ?? FALLBACK_PRICES;
  const isPlus = status?.tier === "plus";
  const paymentsReady = Boolean(status?.paymentsConfigured);
  const previewWeeks = status?.previewWeeks ?? 2;
  const checkout = (product: ProductKey, planId?: string) => void redirect(() => api.startCheckout(product, planId));

  return (
    <div className="dashboard-page billing-page">
      <AppHeader user={user} onHome={onHome} onDashboard={onDashboard} onLogout={onLogout} />
      <main className="dashboard-main page-shell">
        <section className="dashboard-welcome billing-welcome">
          <div>
            <span className="eyebrow"><Icon name="lock" size={16} /> Tarif &amp; Zugang</span>
            <h1>
              {isPlus
                ? "Dein Plus-Abo ist aktiv."
                : planContext
                  ? "Diesen Trainingsblock vollständig freischalten."
                  : `${user.firstName ? `${user.firstName}, wie` : "Wie"} möchtest du weitermachen?`}
            </h1>
            <p>
              {isPlus
                ? "Alle Wochen jedes Trainingsblocks und der PDF-Export sind freigeschaltet."
                : planContext
                  ? `„${planContext.title}“: Im kostenlosen Tarif siehst du die ersten ${previewWeeks} Wochen. Plus öffnet alle deine Pläne, der Einzelkauf genau diesen – beides ohne versteckte Kosten.`
                  : `Im kostenlosen Tarif siehst du von jedem Plan die ersten ${previewWeeks} Wochen. Plus öffnet alle Pläne, der Einzelkauf genau einen – beides ohne versteckte Kosten.`}
            </p>
          </div>
          <div className="dashboard-welcome__actions">
            {planContext && <button type="button" className="button button--ghost" onClick={() => onOpenPlan(planContext.id)}><Icon name="arrow-left" size={17} /> Zurück zum Plan</button>}
            <button type="button" className="button button--ghost" onClick={onDashboard}><Icon name="user" size={17} /> Mein Bereich</button>
          </div>
        </section>

        {notice && <div className="notice notice--success billing-notice"><Icon name="check-circle" size={20} /><div>{notice}</div></div>}
        {error && <div className="dashboard-error"><Icon name="alert" size={18} />{error}</div>}
        {!paymentsReady && !isPlus && (
          <div className="notice notice--warning billing-notice"><Icon name="info" size={20} /><div>Zahlungen sind noch nicht eingerichtet. Die Preise gelten, der Kauf ist in Kürze möglich.</div></div>
        )}

        {isPlus && status ? (
          <section className="billing-grid">
            <article className="billing-card billing-card--offer">
              <span className="eyebrow">Dein Tarif</span>
              <div className="billing-card__status">
                <span className={`status-pill ${status.subscriptionStatus === "past_due" ? "status-pill--warning" : "status-pill--ready"}`}><i /> {subscriptionLabel(status)}</span>
              </div>
              <ul className="billing-card__facts">
                {status.currentPeriodEnd && (
                  <li><Icon name="calendar" size={17} />{status.cancelAtPeriodEnd ? "Zugang bis" : "Nächste Abrechnung am"} <b>{formatDateTime(status.currentPeriodEnd)}</b></li>
                )}
                {status.subscriptionStatus === "past_due" && (
                  <li><Icon name="alert" size={17} />Die letzte Zahlung ist fehlgeschlagen. Bitte aktualisiere deine Zahlungsmethode.</li>
                )}
                <li><Icon name="user" size={17} />Rechnungen, Zahlungsmethode, Wechsel zwischen monatlich und jährlich sowie Kündigung verwaltest du im Kundenportal.</li>
              </ul>
              <button type="button" className="button button--primary button--large" disabled={busy} onClick={() => void redirect(api.openBillingPortal)}>
                {busy ? "Portal wird geöffnet …" : "Abo verwalten"}{!busy && <Icon name="arrow-right" size={19} />}
              </button>
            </article>
            <article className="billing-card">
              <span className="eyebrow">In Plus enthalten</span>
              <ul className="billing-benefits">
                <li><span className="billing-benefits__icon"><Icon name="calendar" size={20} /></span><div><strong>Alle Wochen jedes Plans</strong><p>Jeder Trainingsblock ist vollständig sichtbar, inklusive Progression und Entlastungswochen.</p></div></li>
                <li><span className="billing-benefits__icon"><Icon name="download" size={20} /></span><div><strong>PDF-Export</strong><p>Jeden Plan als formatiertes A4-PDF herunterladen.</p></div></li>
                <li><span className="billing-benefits__icon"><Icon name="spark" size={20} /></span><div><strong>Unbegrenzt neue Blöcke</strong><p>Neues Ziel, neue Saison, neues Equipment – jederzeit einen neuen Plan rechnen.</p></div></li>
              </ul>
              <div className="billing-card__footer">
                <button type="button" className="text-button" onClick={() => void onRefresh()}><Icon name="refresh" size={16} /> Status aktualisieren</button>
              </div>
            </article>
          </section>
        ) : (
          <section className="billing-pricing">
            <PricingTiers
              prices={prices}
              interval={interval}
              onIntervalChange={setInterval}
              previewWeeks={previewWeeks}
              freeCurrent
              onPlus={(product) => checkout(product)}
              plusLabel="Plus abschliessen"
              onSingle={planContext ? () => checkout("single_block", planContext.id) : undefined}
              singleHint="Öffne einen deiner Pläne und wähle dort „Vollständig freischalten“."
              showCoach={false}
              busy={busy}
            />
            <div className="billing-card__footer billing-pricing__footer">
              <small>Sichere Zahlung über Stripe. Du wirst zur Zahlungsseite weitergeleitet und kommst danach automatisch zurück.</small>
              <button type="button" className="text-button" onClick={() => void onRefresh()}><Icon name="refresh" size={16} /> Status aktualisieren</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
