import { useState } from "react";
import { EQUIPMENT } from "../data/equipment";
import { PRIMARY_GOALS, SPORTS } from "../data/options";
import type { TrainingProfile } from "../types";
import { downloadProfile } from "../utils/profile";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";

interface CompletePageProps {
  profile: TrainingProfile;
  onEdit: () => void;
  onReset: () => void;
  onGenerate: (durationWeeks: number) => void;
  generating?: boolean;
  generationError?: string;
  accountReady?: boolean;
  onAccount?: () => void;
}

export function CompletePage({ profile, onEdit, onReset, onGenerate, generating, generationError, accountReady, onAccount }: CompletePageProps) {
  const [showGenerate, setShowGenerate] = useState(false);
  const [duration, setDuration] = useState(profile.goals.event.enabled ? 12 : 8);
  const goal = PRIMARY_GOALS.find((item) => item.id === profile.goals.primaryGoal)?.label ?? "Persönliches Trainingsziel";
  const sports = profile.goals.sports.map((id) => SPORTS.find((item) => item.id === id)?.label ?? id);
  const equipmentCount = profile.environment.equipmentIds.filter((id) => {
    const item = EQUIPMENT.find((entry) => entry.id === id);
    return item && !item.defaultAvailable;
  }).length;

  return (
    <div className="complete-page">
      <header className="complete-header page-shell">
        <button type="button" className="brand" onClick={onEdit}>
          <span className="brand__mark"><BrandLogo /></span>
          <span>trainingsprofil</span>
        </button>
        <div className="complete-header__actions">
          {accountReady && onAccount && <button type="button" className="button button--soft button--small" onClick={onAccount}><Icon name="user" size={16} /> Mein Bereich</button>}
          <button type="button" className="button button--ghost button--small" onClick={onEdit}><Icon name="edit" size={16} /> Profil bearbeiten</button>
        </div>
      </header>

      <main className="complete-main page-shell">
        <section className="complete-hero">
          <div className="complete-badge">
            <span><Icon name="check" size={28} /></span>
            <i /><i /><i />
          </div>
          <span className="eyebrow">Trainingsprofil abgeschlossen</span>
          <h1>{profile.identity.firstName ? `${profile.identity.firstName}, dein Profil ist bereit.` : "Dein Profil ist bereit."}</h1>
          <p>Deine Ziele, Trainingsmöglichkeiten, Ausstattung und persönlichen Einschränkungen sind strukturiert erfasst. Daraus kann jetzt dein erster Trainingsblock entstehen.</p>

          <div className="complete-actions">
            <button type="button" className="button button--primary button--large" onClick={() => setShowGenerate(true)}>
              Trainingsplan erstellen <Icon name="arrow-right" size={19} />
            </button>
            <button type="button" className="button button--ghost button--large" onClick={() => downloadProfile(profile)}>
              <Icon name="download" size={18} /> Profildaten exportieren
            </button>
          </div>
        </section>

        <section className="complete-summary">
          <article>
            <span><Icon name="target" size={22} /></span>
            <small>Hauptziel</small>
            <strong>{goal}</strong>
            <p>{sports.join(" · ")}</p>
          </article>
          <article>
            <span><Icon name="calendar" size={22} /></span>
            <small>Deine Woche</small>
            <strong>{profile.schedule.desiredSessions} Einheiten</strong>
            <p>typisch {profile.schedule.sessionDuration} Minuten</p>
          </article>
          <article>
            <span><Icon name="dumbbell" size={22} /></span>
            <small>Ausstattung</small>
            <strong>{equipmentCount > 0 ? `${equipmentCount} Geräte` : "Körpergewicht"}</strong>
            <p>{profile.environment.locations.length} Trainingsort{profile.environment.locations.length === 1 ? "" : "e"}</p>
          </article>
          <article>
            <span><Icon name="shield" size={22} /></span>
            <small>Berücksichtigung</small>
            <strong>{profile.health.restrictions.length === 0 ? "Beschwerdefrei" : `${profile.health.restrictions.length} Einschränkung${profile.health.restrictions.length === 1 ? "" : "en"}`}</strong>
            <p>für die Übungsfilterung erfasst</p>
          </article>
        </section>

        <section className="complete-next">
          <div>
            <span className="eyebrow">Was jetzt passiert</span>
            <h2>Vom Profil zum strukturierten Trainingsplan.</h2>
          </div>
          <ol>
            <li><span>1</span><div><strong>Passende Übungen filtern</strong><p>Equipment, Körperbereiche, Ausschlüsse und Sicherheitsregeln werden angewendet.</p></div></li>
            <li><span>2</span><div><strong>Wochenstruktur bauen</strong><p>Ziel, Erfahrung, Trainingstage, Dauer und Erholung werden zusammengeführt.</p></div></li>
            <li><span>3</span><div><strong>Belastung progressiv planen</strong><p>Umfang und Intensität entwickeln sich über Aufbau- und Entlastungswochen.</p></div></li>
            <li><span>4</span><div><strong>Online und als PDF sichern</strong><p>Mit einem Konto bleibt der Plan im Dashboard und kann heruntergeladen werden.</p></div></li>
          </ol>
        </section>

        <div className="complete-footer-actions">
          <button type="button" className="text-button" onClick={onEdit}><Icon name="edit" size={16} /> Angaben ändern</button>
          <button type="button" className="text-button text-button--danger" onClick={() => {
            if (window.confirm("Möchtest du das aktuelle Trainingsprofil wirklich löschen und neu beginnen?")) onReset();
          }}><Icon name="refresh" size={16} /> Neues Profil beginnen</button>
        </div>
      </main>

      {showGenerate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !generating && setShowGenerate(false)}>
          <div className="handoff-modal generate-modal" role="dialog" aria-modal="true" aria-labelledby="generate-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="icon-button handoff-modal__close" onClick={() => setShowGenerate(false)} aria-label="Dialog schliessen" disabled={generating}><Icon name="x" size={18} /></button>
            <span className="handoff-modal__icon"><Icon name="spark" size={28} /></span>
            <span className="eyebrow">Trainingsblock erstellen</span>
            <h2 id="generate-title">Wie weit soll dein erster Plan reichen?</h2>
            <p>Du kannst später jederzeit einen neuen Block aus deinem aktualisierten Profil erstellen.</p>
            <div className="duration-picker duration-picker--modal" role="radiogroup" aria-label="Planlänge">
              {[4, 8, 12, 16].map((weeks) => (
                <button key={weeks} type="button" role="radio" aria-checked={duration === weeks} className={duration === weeks ? "is-active" : ""} onClick={() => setDuration(weeks)} disabled={generating}>
                  <strong>{weeks}</strong><span>Wochen</span>
                </button>
              ))}
            </div>
            <div className="generate-recommendation"><Icon name="info" size={17} /> {profile.goals.event.enabled ? "Für ein Wettkampfziel sind 12–16 Wochen meist die bessere Ausgangsbasis." : "Für Kraft, Gesundheit und allgemeinen Aufbau sind 8 Wochen ein guter erster Block."}</div>
            {generationError && <div className="auth-error"><Icon name="alert" size={18} /><div><strong>Plan konnte noch nicht erstellt werden.</strong><p>{generationError}</p></div></div>}
            <div className="handoff-modal__actions">
              <button type="button" className="button button--primary button--large" onClick={() => onGenerate(duration)} disabled={generating}>
                {generating ? "Plan wird berechnet …" : `${duration}-Wochen-Plan erstellen`}
                {!generating && <Icon name="arrow-right" size={18} />}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setShowGenerate(false)} disabled={generating}>Zurück</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
