import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { api, ApiError } from "../api/client";
import type { AuthUser, PlanBlock, PlanRecord, PlanSession } from "../api/types";
import { AppHeader } from "./AppHeader";
import { Icon } from "./Icon";

interface PlanPageProps {
  user: AuthUser;
  record: PlanRecord;
  onHome: () => void;
  onDashboard: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}


const PHASE_LABELS: Record<string, string> = {
  foundation: "Grundlagenphase",
  build: "Aufbauphase",
  peak: "Spezifische Phase",
  taper: "Entlastungsphase",
  maintenance: "Erhaltungsphase",
  return: "Behutsamer Wiedereinstieg",
};

const formatDate = (value: string, long = false) => new Intl.DateTimeFormat("de-CH", long
  ? { weekday: "long", day: "2-digit", month: "long", year: "numeric" }
  : { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));

function SessionBlock({ block }: { block: PlanBlock }) {
  return (
    <section className="session-block">
      <div className="session-block__heading">
        <h4>{block.title}</h4>
        {block.instructions && <p>{block.instructions}</p>}
      </div>

      {block.exercises && block.exercises.length > 0 && (
        <div className="exercise-list">
          {block.exercises.map((exercise, index) => (
            <article className="exercise-row" key={`${exercise.exerciseId ?? exercise.name}-${index}`}>
              <div className="exercise-row__number">{String(index + 1).padStart(2, "0")}</div>
              <div className="exercise-row__main">
                <span>{exercise.pattern}</span>
                <h5>{exercise.name}</h5>
                <small>{[exercise.primaryMuscle, ...(exercise.equipment ?? [])].filter(Boolean).join(" · ")}</small>
              </div>
              <div className="exercise-dose">
                <strong>{exercise.sets} × {exercise.reps}</strong>
                <span>{exercise.targetRpe}{exercise.restSeconds ? ` · ${exercise.restSeconds} Sek. Pause` : ""}</span>
                {exercise.tempo && <small>Tempo {exercise.tempo}</small>}
              </div>
              <div className="exercise-guidance">
                {exercise.progression && <p>{exercise.progression}</p>}
                {(exercise.notes ?? []).map((note) => <small key={note}><Icon name="info" size={14} />{note}</small>)}
                {(exercise.alternatives ?? []).length > 0 && <small><b>Alternativen:</b> {exercise.alternatives?.map((item) => item.name).join(", ")}</small>}
              </div>
            </article>
          ))}
        </div>
      )}

      {block.items && block.items.length > 0 && (
        <div className="endurance-list">
          {block.items.map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h5>{item.title}</h5><p>{item.details}</p></div>
              <strong>{item.dose}</strong>
              <small>{item.intensity}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SessionCard({ session }: { session: PlanSession }) {
  const [open, setOpen] = useState(true);
  return (
    <article className={`session-card ${open ? "is-open" : ""}`}>
      <button type="button" className="session-card__summary" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div className="session-date">
          <span>{session.weekday.slice(0, 2)}</span>
          <strong>{new Date(`${session.date}T12:00:00`).getDate()}</strong>
          <small>{new Intl.DateTimeFormat("de-CH", { month: "short" }).format(new Date(`${session.date}T12:00:00`))}</small>
        </div>
        <div className="session-summary__copy">
          <span>{session.discipline}</span>
          <h3>{session.title}</h3>
          <p>{session.objective}</p>
        </div>
        <div className="session-summary__meta">
          <strong><Icon name="clock" size={17} /> {session.durationMinutes} Min.</strong>
          <span>{session.intensity.rpe}</span>
          <Icon name="chevron-down" size={19} />
        </div>
      </button>

      {open && (
        <div className="session-card__body">
          <div className="session-intensity-grid">
            <span><small>Belastung</small><strong>{session.intensity.rpe || "nach Gefühl"}</strong></span>
            <span><small>Bereich</small><strong>{session.intensity.zone || "moderat"}</strong></span>
            <span><small>Sprechtest</small><strong>{session.intensity.talkTest || "kontrolliert"}</strong></span>
            <span><small>Equipment</small><strong>{session.equipment?.join(", ") || "kein spezielles"}</strong></span>
          </div>

          {session.coachNote && <div className="coach-callout"><Icon name="spark" size={19} /><div><strong>Coaching-Hinweis</strong><p>{session.coachNote}</p></div></div>}
          {session.blocks.map((block, index) => <SessionBlock key={`${block.title}-${index}`} block={block} />)}

          {(session.adaptations ?? []).length > 0 && (
            <div className="adaptation-callout">
              <Icon name="shield" size={21} />
              <div><strong>Persönliche Anpassungen</strong><ul>{session.adaptations?.map((item) => <li key={item}>{item}</li>)}</ul></div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function PlanPage({ user, record, onHome, onDashboard, onEditProfile, onLogout }: PlanPageProps) {
  const plan = record.plan;
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const week = useMemo(() => plan.weeks.find((item) => item.weekNumber === selectedWeek) ?? plan.weeks[0], [plan.weeks, selectedWeek]);

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await api.downloadPlanPdf(record.id, plan.title);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Das PDF konnte nicht erstellt werden.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="plan-page">
      <AppHeader
        user={user}
        onHome={onHome}
        onDashboard={onDashboard}
        onLogout={onLogout}
        action={<button type="button" className="button button--soft button--small" onClick={() => void download()} disabled={downloading}><Icon name="download" size={17} /> {downloading ? "PDF wird erstellt …" : "PDF herunterladen"}</button>}
      />

      <main>
        <section className="plan-hero">
          <div className="page-shell plan-hero__inner">
            <button type="button" className="text-button" onClick={onDashboard}><Icon name="arrow-left" size={17} /> Alle Pläne</button>
            <div className="plan-hero__content">
              <div>
                <span className="eyebrow"><Icon name="spark" size={16} /> Persönlicher Trainingsplan</span>
                <h1>{plan.title}</h1>
                <p>{plan.subtitle}</p>
                <div className="plan-hero__tags">
                  <span><Icon name="calendar" size={16} /> {formatDate(plan.startsOn)}–{formatDate(plan.endsOn)}</span>
                  <span><Icon name="clock" size={16} /> {plan.sessionsPerWeek} Einheiten pro Woche</span>
                  <span><Icon name="target" size={16} /> {plan.athleteSnapshot.goal}</span>
                </div>
              </div>
              <div className="plan-score-card">
                <span><Icon name="shield" size={23} /></span>
                <small>Planstatus</small>
                <strong>{plan.safety.status === "ready" ? "Planbereit" : plan.safety.status}</strong>
                <p>{plan.qualityChecks.eligibleExercisePool} passende Übungen im gefilterten Pool</p>
              </div>
            </div>
            {error && <div className="dashboard-error"><Icon name="alert" size={18} />{error}</div>}
          </div>
        </section>

        <section className="plan-overview page-shell">
          <div className="plan-overview__main">
            <span className="eyebrow">So ist dein Block aufgebaut</span>
            <h2>{plan.durationWeeks} Wochen mit klarer Progression und regelmässiger Entlastung.</h2>
            <div className="overview-facts">
              <span><small>Start</small><strong>{formatDate(plan.startsOn, true)}</strong></span>
              <span><small>Ziel</small><strong>{plan.athleteSnapshot.goal}</strong></span>
              <span><small>Erfahrung</small><strong>{plan.athleteSnapshot.experience}</strong></span>
              <span><small>Phase</small><strong>{PHASE_LABELS[plan.phase] ?? plan.phase}</strong></span>
            </div>
          </div>
          <aside className="plan-principles">
            <h3>Leitlinien für den Block</h3>
            <ul>{plan.principles.map((item) => <li key={item}><Icon name="check-circle" size={17} />{item}</li>)}</ul>
          </aside>
        </section>

        {(plan.planNotes.length > 0 || plan.athleteSnapshot.restrictionSummary.length > 0) && (
          <section className="personal-notes page-shell">
            <div><Icon name="shield" size={23} /><span><small>Berücksichtigt</small><strong>Deine persönlichen Rahmenbedingungen</strong></span></div>
            <ul>{[...plan.planNotes, ...plan.athleteSnapshot.restrictionSummary].filter((value, index, list) => list.indexOf(value) === index).map((item) => <li key={item}>{item}</li>)}</ul>
            <button type="button" className="text-button" onClick={onEditProfile}>Profil bearbeiten <Icon name="arrow-right" size={16} /></button>
          </section>
        )}

        <section className="week-section page-shell">
          <div className="week-section__heading">
            <div><span className="eyebrow">Wochenplan</span><h2>Woche {week.weekNumber}: {week.theme}</h2><p>{week.coachNote}</p></div>
            <div className="week-load"><span style={{ "--week-load": `${Math.min(100, Math.round(week.loadFactor * 80))}%` } as CSSProperties} /><small>Zielumfang</small><strong>{week.targetMinutes} Min.</strong></div>
          </div>

          <div className="week-tabs" role="tablist" aria-label="Trainingswoche wählen">
            {plan.weeks.map((item) => (
              <button key={item.weekNumber} type="button" role="tab" aria-selected={item.weekNumber === week.weekNumber} className={item.weekNumber === week.weekNumber ? "is-active" : ""} onClick={() => setSelectedWeek(item.weekNumber)}>
                <span>W{item.weekNumber}</span><small>{item.theme}</small>
              </button>
            ))}
          </div>

          <div className="week-summary-strip">
            <span><Icon name="calendar" size={18} /><strong>{week.sessions.length}</strong> Einheiten</span>
            <span><Icon name="clock" size={18} /><strong>{week.targetMinutes}</strong> Minuten</span>
            <span><Icon name="pulse" size={18} /><strong>{Math.round(week.loadFactor * 100)}%</strong> Belastungsfaktor</span>
            <p>{week.recoveryGuidance}</p>
          </div>

          <div className="session-list">
            {week.sessions.map((session) => <SessionCard key={session.id} session={session} />)}
          </div>
        </section>

        <section className="progression-section page-shell">
          <div><span className="eyebrow">Progression</span><h2>Wie du von Woche zu Woche vorgehst.</h2></div>
          <ol>{plan.progressionNotes.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol>
        </section>

        <section className="plan-disclaimer page-shell">
          <Icon name="info" size={21} />
          <div><strong>Wichtiger Hinweis</strong><p>{plan.safety.disclaimer}</p></div>
        </section>
      </main>
    </div>
  );
}
