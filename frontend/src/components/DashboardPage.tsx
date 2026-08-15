import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { AuthUser, PlanListItem } from "../api/types";
import type { TrainingProfile } from "../types";
import { PRIMARY_GOALS } from "../data/options";
import { AppHeader } from "./AppHeader";
import { Icon } from "./Icon";

interface DashboardPageProps {
  user: AuthUser;
  profile: TrainingProfile;
  onHome: () => void;
  onEditProfile: () => void;
  onOpenPlan: (id: string) => void;
  onGenerate: (duration: number) => void;
  onLogout: () => void;
  generating?: boolean;
  generationError?: string;
}

const formatDate = (value: string) => new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));

export function DashboardPage({ user, profile, onHome, onEditProfile, onOpenPlan, onGenerate, onLogout, generating, generationError }: DashboardPageProps) {
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(profile.goals.event.enabled ? 12 : 8);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setPlans(await api.listPlans());
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Die Trainingspläne konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const goal = useMemo(
    () => PRIMARY_GOALS.find((item) => item.id === profile.goals.primaryGoal)?.label ?? "Profil noch nicht vollständig",
    [profile.goals.primaryGoal],
  );

  const remove = async (plan: PlanListItem) => {
    if (!window.confirm(`Möchtest du „${plan.title}“ wirklich löschen?`)) return;
    try {
      await api.deletePlan(plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Der Plan konnte nicht gelöscht werden.");
    }
  };

  return (
    <div className="dashboard-page">
      <AppHeader user={user} onHome={onHome} onDashboard={() => undefined} onLogout={onLogout} />
      <main className="dashboard-main page-shell">
        <section className="dashboard-welcome">
          <div>
            <span className="eyebrow"><Icon name="spark" size={16} /> Persönlicher Trainingsbereich</span>
            <h1>{user.firstName ? `Hallo ${user.firstName}.` : "Willkommen."} Was möchtest du als Nächstes erreichen?</h1>
            <p>Dein Profil bildet die Grundlage. Jeder neue Trainingsblock wird daraus neu gefiltert und geplant.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={onEditProfile}><Icon name="edit" size={17} /> Profil bearbeiten</button>
        </section>

        <section className="dashboard-grid">
          <article className="profile-card">
            <div className="profile-card__top">
              <span className="profile-card__icon"><Icon name="user" size={24} /></span>
              <span className="status-pill status-pill--ready"><i /> planbereit</span>
            </div>
            <small>Aktuelles Trainingsprofil</small>
            <h2>{goal}</h2>
            <div className="profile-card__facts">
              <span><Icon name="calendar" size={17} /><b>{profile.schedule.desiredSessions}</b> Einheiten pro Woche</span>
              <span><Icon name="clock" size={17} /><b>{profile.schedule.sessionDuration}</b> Minuten je Einheit</span>
              <span><Icon name="dumbbell" size={17} /><b>{profile.environment.equipmentIds.length}</b> Equipment-Merkmale</span>
              <span><Icon name="shield" size={17} /><b>{profile.health.restrictions.length}</b> Einschränkungen erfasst</span>
            </div>
            <button type="button" className="text-button" onClick={onEditProfile}>Angaben prüfen oder ändern <Icon name="arrow-right" size={16} /></button>
          </article>

          <article className="generate-card">
            <span className="generate-card__orb"><Icon name="spark" size={29} /></span>
            <div>
              <span className="eyebrow">Neuen Block erstellen</span>
              <h2>Aus deinem Profil wird ein konkreter Wochenplan.</h2>
              <p>Wähle die Blocklänge. Eventpläne profitieren meist von 12 oder 16 Wochen; allgemeine Kraft- und Gesundheitsziele oft von 8 Wochen.</p>
            </div>
            <div className="duration-picker" role="radiogroup" aria-label="Planlänge">
              {[4, 8, 12, 16].map((weeks) => (
                <button key={weeks} type="button" role="radio" aria-checked={duration === weeks} className={duration === weeks ? "is-active" : ""} onClick={() => setDuration(weeks)}>
                  <strong>{weeks}</strong><span>Wochen</span>
                </button>
              ))}
            </div>
            {generationError && <div className="dashboard-error"><Icon name="alert" size={18} />{generationError}</div>}
            <button type="button" className="button button--primary button--large" onClick={() => onGenerate(duration)} disabled={generating}>
              {generating ? "Plan wird berechnet …" : "Trainingsplan erstellen"}
              {!generating && <Icon name="arrow-right" size={19} />}
            </button>
          </article>
        </section>

        <section className="plans-section">
          <div className="plans-section__heading">
            <div><span className="eyebrow">Deine Bibliothek</span><h2>Gespeicherte Trainingspläne</h2></div>
            <button type="button" className="text-button" onClick={() => void load()}><Icon name="refresh" size={16} /> Aktualisieren</button>
          </div>

          {error && <div className="dashboard-error"><Icon name="alert" size={18} />{error}</div>}
          {loading ? (
            <div className="plans-empty"><span className="loading-orb" /><h3>Pläne werden geladen …</h3></div>
          ) : plans.length === 0 ? (
            <div className="plans-empty">
              <span><Icon name="calendar" size={29} /></span>
              <h3>Noch kein Trainingsplan gespeichert.</h3>
              <p>Erstelle oben deinen ersten Block. Er erscheint danach automatisch hier.</p>
            </div>
          ) : (
            <div className="plan-card-grid">
              {plans.map((plan) => (
                <article className="plan-card" key={plan.id}>
                  <div className="plan-card__top">
                    <span className="plan-card__icon"><Icon name={plan.sportFocus === "strength" ? "dumbbell" : plan.sportFocus === "triathlon" ? "triathlon" : "run"} size={22} /></span>
                    <span className="status-pill"><i /> {plan.status === "active" ? "aktiv" : plan.status}</span>
                  </div>
                  <small>{plan.durationWeeks} Wochen · {formatDate(plan.startDate)}–{formatDate(plan.endDate)}</small>
                  <h3>{plan.title}</h3>
                  <p>{plan.goalLabel}</p>
                  <div className="plan-card__actions">
                    <button type="button" className="button button--soft button--small" onClick={() => onOpenPlan(plan.id)}>Plan öffnen <Icon name="arrow-right" size={16} /></button>
                    <button type="button" className="icon-button" aria-label={`${plan.title} löschen`} onClick={() => void remove(plan)}><Icon name="x" size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
