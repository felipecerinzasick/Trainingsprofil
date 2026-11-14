import { useState } from "react";
import { api, ApiError } from "../api/client";
import type { AuthUser, BillingStatus } from "../api/types";
import { formatDateTime, formatPrice, subscriptionLabel, trialLabel } from "../utils/billing";
import { AppHeader } from "./AppHeader";
import { Icon } from "./Icon";

interface BillingPageProps {
  user: AuthUser;
  status: BillingStatus | null;
  notice?: string;
  onHome: () => void;
  onDashboard: () => void;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}

const BENEFITS = [
  { icon: "spark", title: "Unbegrenzt neue Trainingsblöcke", text: "4, 8, 12 oder 16 Wochen – jederzeit neu aus deinem aktuellen Profil." },
  { icon: "shield", title: "Beschwerden und Equipment berücksichtigt", text: "Jeder Plan wird nach deinen Einschränkungen und deiner Ausstattung gefiltert." },
  { icon: "download", title: "Alle gespeicherten Pläne und PDFs", text: "Deine Bibliothek bleibt vollständig erhalten und als PDF abrufbar." },
  { icon: "refresh", title: "Monatlich kündbar", text: "Verwalte oder beende dein Abo jederzeit selbst im Stripe-Kundenportal." },
];

export function BillingPage({ user, status, notice, onHome, onDashboard, onLogout, onRefresh }: BillingPageProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const price = formatPrice(status?.price);
  const paywallActive = Boolean(status?.paywallEnabled);
  const subscribed = status?.accessState === "active";
  const expired = status?.accessState === "expired" && paywallActive;
  const paymentsReady = Boolean(status?.paymentsConfigured);

  return (
    <div className="dashboard-page billing-page">
      <AppHeader user={user} onHome={onHome} onDashboard={onDashboard} onLogout={onLogout} />
      <main className="dashboard-main page-shell">
        <section className="dashboard-welcome billing-welcome">
          <div>
            <span className="eyebrow"><Icon name="lock" size={16} /> Abo &amp; Zugang</span>
            <h1>
              {subscribed
                ? "Dein Abo ist aktiv."
                : expired
                  ? `${user.firstName ? `${user.firstName}, deine` : "Deine"} kostenlose Testphase ist vorbei.`
                  : `${user.firstName ? `${user.firstName}, du` : "Du"} testest Trainingsprofil gerade kostenlos.`}
            </h1>
            <p>
              {subscribed
                ? "Du kannst unbegrenzt Trainingsblöcke erstellen, öffnen und als PDF speichern."
                : expired
                  ? "Dein Profil und deine gespeicherten Pläne sind sicher. Mit einem Abo geht es genau dort weiter, wo du aufgehört hast."
                  : status
                    ? `${trialLabel(status)} Danach brauchst du ein Abo, um weiter Pläne zu erstellen und zu öffnen.`
                    : "Dein Zugang wird geprüft."}
            </p>
          </div>
          {!expired && <button type="button" className="button button--ghost" onClick={onDashboard}><Icon name="arrow-left" size={17} /> Zurück zum Bereich</button>}
        </section>

        {notice && <div className="notice notice--success billing-notice"><Icon name="check-circle" size={20} /><div>{notice}</div></div>}
        {error && <div className="dashboard-error"><Icon name="alert" size={18} />{error}</div>}

        <section className="billing-grid">
          <article className="billing-card billing-card--offer">
            <span className="eyebrow">{subscribed ? "Dein Abo" : "Trainingsprofil Abo"}</span>
            {subscribed && status ? (
              <>
                <div className="billing-card__status">
                  <span className={`status-pill ${status.subscriptionStatus === "past_due" ? "status-pill--warning" : "status-pill--ready"}`}><i /> {subscriptionLabel(status)}</span>
                </div>
                {price && <p className="billing-card__price"><strong>{price.split(" pro ")[0]}</strong><span> pro {price.split(" pro ")[1]}</span></p>}
                <ul className="billing-card__facts">
                  {status.currentPeriodEnd && (
                    <li><Icon name="calendar" size={17} />{status.cancelAtPeriodEnd ? "Zugang bis" : "Nächste Abrechnung am"} <b>{formatDateTime(status.currentPeriodEnd)}</b></li>
                  )}
                  {status.subscriptionStatus === "past_due" && (
                    <li><Icon name="alert" size={17} />Die letzte Zahlung ist fehlgeschlagen. Bitte aktualisiere deine Zahlungsmethode.</li>
                  )}
                  <li><Icon name="user" size={17} />Rechnungen, Zahlungsmethode und Kündigung verwaltest du im Kundenportal.</li>
                </ul>
                <button type="button" className="button button--primary button--large" disabled={busy} onClick={() => void redirect(api.openBillingPortal)}>
                  {busy ? "Portal wird geöffnet …" : "Abo verwalten"}{!busy && <Icon name="arrow-right" size={19} />}
                </button>
              </>
            ) : (
              <>
                <p className="billing-card__price">
                  {price ? (
                    <><strong>{price.split(" pro ")[0]}</strong><span> pro {price.split(" pro ")[1]}</span></>
                  ) : (
                    <strong>Monatsabo</strong>
                  )}
                </p>
                <p className="billing-card__lead">
                  {status && status.accessState === "trial"
                    ? `Die ersten ${status.trialDays} Tage sind kostenlos. Dein Abo startet sofort; die Testphase endet damit.`
                    : "Jederzeit kündbar. Deine Daten bleiben vollständig erhalten."}
                </p>
                {paymentsReady ? (
                  <button type="button" className="button button--primary button--large" disabled={busy} onClick={() => void redirect(api.startCheckout)}>
                    {busy ? "Weiter zu Stripe …" : "Jetzt Abo abschliessen"}{!busy && <Icon name="arrow-right" size={19} />}
                  </button>
                ) : (
                  <div className="notice notice--warning"><Icon name="info" size={20} /><div>Zahlungen sind noch nicht eingerichtet. Bitte melde dich beim Support, wenn du weitermachen möchtest.</div></div>
                )}
                <small className="billing-card__legal">Sichere Zahlung über Stripe. Du wirst zur Zahlungsseite weitergeleitet und kommst danach automatisch zurück.</small>
              </>
            )}
          </article>

          <article className="billing-card billing-card--benefits">
            <span className="eyebrow">Was im Abo enthalten ist</span>
            <ul className="billing-benefits">
              {BENEFITS.map((benefit) => (
                <li key={benefit.title}>
                  <span className="billing-benefits__icon"><Icon name={benefit.icon} size={20} /></span>
                  <div><strong>{benefit.title}</strong><p>{benefit.text}</p></div>
                </li>
              ))}
            </ul>
            <div className="billing-card__footer">
              <button type="button" className="text-button" onClick={() => void onRefresh()}><Icon name="refresh" size={16} /> Status aktualisieren</button>
              {expired && <button type="button" className="text-button" onClick={onDashboard}>Profil ansehen <Icon name="arrow-right" size={16} /></button>}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
