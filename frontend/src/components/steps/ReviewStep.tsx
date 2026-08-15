import type { CSSProperties, ReactNode } from "react";
import { EQUIPMENT } from "../../data/equipment";
import { BODY_REGIONS, PRIMARY_GOALS, SAFETY_QUESTIONS, SPORTS, TRAINING_STYLES, WEEKDAYS } from "../../data/options";
import { Icon } from "../Icon";
import { Notice, SectionHeading } from "../ui";
import type { StepProps } from "./types";

interface ReviewStepProps extends StepProps {
  onEditStep: (step: number) => void;
}

function labelsFromIds(ids: string[], options: Array<{ id: string; label: string }>) {
  return ids.map((id) => options.find((option) => option.id === id)?.label ?? id);
}

function SummaryCard({ title, icon, onEdit, children }: { title: string; icon: string; onEdit: () => void; children: ReactNode }) {
  return (
    <article className="summary-card">
      <header>
        <span className="summary-card__icon"><Icon name={icon} size={20} /></span>
        <h3>{title}</h3>
        <button type="button" onClick={onEdit}><Icon name="edit" size={16} /> Bearbeiten</button>
      </header>
      <div className="summary-card__body">{children}</div>
    </article>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="summary-row"><span>{label}</span><strong>{children || "—"}</strong></div>;
}

export function ReviewStep({ profile, updateSection, onEditStep }: ReviewStepProps) {
  const { goals, identity, experience, schedule, environment, health, preferences, recovery, consent } = profile;
  const primaryGoal = PRIMARY_GOALS.find((goal) => goal.id === goals.primaryGoal)?.label ?? "Noch nicht gewählt";
  const secondaryGoals = labelsFromIds(goals.secondaryGoals, PRIMARY_GOALS);
  const sports = labelsFromIds(goals.sports, SPORTS);
  const weekdays = labelsFromIds(schedule.availableDays, WEEKDAYS.map((day) => ({ id: day.id, label: day.label })));
  const equipment = environment.equipmentIds
    .map((id) => EQUIPMENT.find((item) => item.id === id))
    .filter((item) => item && !item.defaultAvailable)
    .map((item) => item!.label);
  const likedStyles = labelsFromIds(preferences.likedStyles, TRAINING_STYLES);
  const safetyFlags = health.safetyFlags
    .filter((flag) => flag.value)
    .map((flag) => SAFETY_QUESTIONS.find((question) => question.id === flag.id)?.label ?? flag.id);

  const completionChecks = [
    Boolean(goals.primaryGoal),
    Boolean(identity.ageGroup),
    Boolean(experience.level),
    schedule.availableDays.length > 0,
    environment.locations.length > 0,
    health.painFree !== null && (health.painFree || health.restrictions.length > 0),
    health.safetyConfirmedNone || safetyFlags.length > 0,
  ];
  const completion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  return (
    <div className="step-content review-step">
      <SectionHeading
        eyebrow="Fast geschafft"
        title={identity.firstName ? `${identity.firstName}, passt das so für dich?` : "Passt das so für dich?"}
        text="Prüfe die wichtigsten Angaben. Über „Bearbeiten“ springst du direkt zum passenden Schritt zurück."
      />

      <div className="profile-readiness">
        <div className="profile-readiness__ring" style={{ "--completion": `${completion * 3.6}deg` } as CSSProperties}>
          <span>{completion}%</span>
        </div>
        <div>
          <strong>Dein Profil ist planbereit</strong>
          <p>Die Kerninformationen für Ziel, Belastung, Verfügbarkeit, Ausstattung und Einschränkungen sind strukturiert erfasst.</p>
        </div>
        <span className="profile-readiness__badge"><Icon name="spark" size={16} /> Bereit zur Übergabe</span>
      </div>

      <div className="summary-grid">
        <SummaryCard title="Ziel und Sport" icon="target" onEdit={() => onEditStep(0)}>
          <SummaryRow label="Hauptziel">{primaryGoal}</SummaryRow>
          <SummaryRow label="Weitere Ziele">{secondaryGoals.join(", ")}</SummaryRow>
          <SummaryRow label="Aktivitäten">{sports.join(", ")}</SummaryRow>
          {goals.event.enabled && (
            <SummaryRow label="Konkretes Ziel">
              {[goals.event.name, goals.event.distance, goals.event.date].filter(Boolean).join(" · ") || "Event vorgesehen"}
            </SummaryRow>
          )}
        </SummaryCard>

        <SummaryCard title="Ausgangslage" icon="user" onEdit={() => onEditStep(1)}>
          <SummaryRow label="Altersbereich">{identity.ageGroup}</SummaryRow>
          <SummaryRow label="Erfahrung">{
            experience.level === "new" ? "Beginnt gerade" :
            experience.level === "returning" ? "Wiedereinstieg" :
            experience.level === "regular" ? "Trainiert regelmässig" :
            experience.level === "experienced" ? "Erfahren" : "—"
          }</SummaryRow>
          <SummaryRow label="Aktuell aktiv">{experience.currentTrainingDays} Tage pro Woche</SummaryRow>
          {(experience.weeklyRunningKm || experience.cyclingHours || experience.swimmingMeters) && (
            <SummaryRow label="Ausdauerumfang">
              {[
                experience.weeklyRunningKm && `${experience.weeklyRunningKm} Lauf-km/Woche`,
                experience.cyclingHours && `${experience.cyclingHours} Radstunden/Woche`,
                experience.swimmingMeters && `${experience.swimmingMeters} Schwimmmeter/Woche`,
              ].filter(Boolean).join(" · ")}
            </SummaryRow>
          )}
        </SummaryCard>

        <SummaryCard title="Zeit und Woche" icon="calendar" onEdit={() => onEditStep(2)}>
          <SummaryRow label="Einheiten">{schedule.desiredSessions} pro Woche</SummaryRow>
          <SummaryRow label="Verfügbare Tage">{weekdays.join(", ")}</SummaryRow>
          <SummaryRow label="Typische Dauer">{schedule.sessionDuration} Minuten</SummaryRow>
          <SummaryRow label="Start">{schedule.planStartDate || "Flexibel"}</SummaryRow>
        </SummaryCard>

        <SummaryCard title="Orte und Equipment" icon="dumbbell" onEdit={() => onEditStep(3)}>
          <SummaryRow label="Trainingsorte">{
            environment.locations.map((location) => (
              location === "home" ? "Zu Hause" : location === "gym" ? "Fitnessstudio" : location === "outdoor" ? "Draussen" : "Schwimmbad"
            )).join(", ")
          }</SummaryRow>
          <SummaryRow label="Ausstattung">{equipment.length === 0 ? "Körpergewicht" : `${equipment.length} Geräte gewählt`}</SummaryRow>
          {equipment.length > 0 && <div className="summary-tags">{equipment.slice(0, 8).map((item) => <span key={item}>{item}</span>)}{equipment.length > 8 && <span>+{equipment.length - 8}</span>}</div>}
        </SummaryCard>

        <SummaryCard title="Körper und Sicherheit" icon="shield" onEdit={() => onEditStep(4)}>
          <SummaryRow label="Beschwerden">{health.painFree ? "Aktuell beschwerdefrei" : `${health.restrictions.length} Bereich${health.restrictions.length === 1 ? "" : "e"} erfasst`}</SummaryRow>
          {health.restrictions.map((restriction) => (
            <div className="restriction-summary" key={restriction.id}>
              <strong>{BODY_REGIONS.find((region) => region.id === restriction.region)?.label ?? restriction.region}</strong>
              <span>{restriction.intensity}/10 · {restriction.strategy === "avoid" ? "vermeiden" : restriction.strategy === "adapt" ? "anpassen" : "beobachten"}</span>
            </div>
          ))}
          <SummaryRow label="Sicherheits-Check">{health.safetyConfirmedNone ? "Keine Angabe trifft zu" : `${safetyFlags.length} Hinweis${safetyFlags.length === 1 ? "" : "e"}`}</SummaryRow>
        </SummaryCard>

        <SummaryCard title="Vorlieben und Erholung" icon="heart" onEdit={() => onEditStep(5)}>
          <SummaryRow label="Gern">{likedStyles.join(", ")}</SummaryRow>
          <SummaryRow label="Abwechslung">{preferences.variety} von 5</SummaryRow>
          <SummaryRow label="Schlaf">{recovery.sleepHours.toString().replace(".", ",")} Std. · Qualität {recovery.sleepQuality}/5</SummaryRow>
          <SummaryRow label="Stress">{recovery.stressLevel} von 5</SummaryRow>
        </SummaryCard>
      </div>

      {safetyFlags.length > 0 && (
        <Notice tone="warning">
          Dein Profil enthält Sicherheitsangaben, die vor intensiver Trainingsplanung fachlich geprüft werden sollten. Der Prototyp erzeugt daraus keine Diagnose.
        </Notice>
      )}

      <div className="consent-panel">
        <div className="consent-panel__heading">
          <span className="consent-panel__icon"><Icon name="lock" size={23} /></span>
          <div><h3>Zum Abschluss</h3><p>Diese Checkboxen sind Platzhalter für die spätere produktive Einwilligungsstrecke.</p></div>
        </div>

        <label className={`checkbox-row ${consent.dataProcessing ? "is-checked" : ""}`}>
          <input
            type="checkbox"
            checked={consent.dataProcessing}
            onChange={(event) => updateSection("consent", { dataProcessing: event.target.checked })}
          />
          <span className="custom-checkbox"><Icon name="check" size={14} /></span>
          <span><strong>Ich stimme der Verarbeitung meiner Angaben zur Erstellung meines Trainingsprofils zu.</strong><small>Für die produktive Version muss hier die konkrete Datenschutzerklärung verlinkt werden.</small></span>
        </label>

        <label className={`checkbox-row ${consent.healthAcknowledgement ? "is-checked" : ""}`}>
          <input
            type="checkbox"
            checked={consent.healthAcknowledgement}
            onChange={(event) => updateSection("consent", { healthAcknowledgement: event.target.checked })}
          />
          <span className="custom-checkbox"><Icon name="check" size={14} /></span>
          <span><strong>Mir ist bewusst, dass Trainingsvorschläge keine medizinische Diagnose oder Behandlung ersetzen.</strong><small>Bei akuten oder ungeklärten Beschwerden lasse ich die Belastung fachlich abklären.</small></span>
        </label>

        <label className={`checkbox-row ${consent.optionalContact ? "is-checked" : ""}`}>
          <input
            type="checkbox"
            checked={consent.optionalContact}
            onChange={(event) => updateSection("consent", { optionalContact: event.target.checked })}
          />
          <span className="custom-checkbox"><Icon name="check" size={14} /></span>
          <span><strong>Ich darf optional zu Rückfragen zum Trainingsprofil kontaktiert werden.</strong><small>Optional und für die Erstellung des Profils nicht erforderlich.</small></span>
        </label>
      </div>

      <Notice tone="success" icon="save">
        In dieser Frontend-Demo bleibt dein Profil lokal im Browser. Beim Abschluss wird noch nichts an einen Server gesendet.
      </Notice>
    </div>
  );
}
