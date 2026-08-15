import { AGE_GROUPS, EXPERIENCE_LEVELS, GENDERS, SPORTS } from "../../data/options";
import { Chip, ChoiceCard, Field, Notice, RangeField, SectionHeading } from "../ui";
import type { StepProps } from "./types";
import { toggleValue } from "./types";

export function ExperienceStep({ profile, updateSection }: StepProps) {
  const { identity, experience, goals } = profile;
  const activeSports = experience.currentActivities.length > 0
    ? experience.currentActivities
    : goals.sports;
  const showRunning = activeSports.some((item) => ["running", "trail", "triathlon"].includes(item));
  const showCycling = activeSports.some((item) => ["cycling", "triathlon"].includes(item));
  const showSwimming = activeSports.some((item) => ["swimming", "triathlon"].includes(item));

  return (
    <div className="step-content">
      <SectionHeading
        eyebrow="Deine Ausgangslage"
        title="Wo stehst du heute?"
        text="Wir fragen nur nach Informationen, die für Trainingsumfang, Übungsauswahl und Progression relevant sind."
      />

      <div className="form-section profile-panel">
        <div className="field-grid field-grid--2">
          <Field label="Wie dürfen wir dich nennen?" optional htmlFor="first-name">
            <input
              id="first-name"
              type="text"
              autoComplete="given-name"
              placeholder="Vorname"
              value={identity.firstName}
              onChange={(event) => updateSection("identity", { firstName: event.target.value })}
            />
          </Field>
          <Field label="Altersbereich" htmlFor="age-group">
            <select
              id="age-group"
              value={identity.ageGroup}
              onChange={(event) => updateSection("identity", { ageGroup: event.target.value })}
            >
              <option value="">Bitte wählen</option>
              {AGE_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </Field>
          <Field label="Geschlecht" hint="Optional; kann bei einzelnen physiologischen oder lebensphasenspezifischen Faktoren helfen." optional htmlFor="gender">
            <select
              id="gender"
              value={identity.gender}
              onChange={(event) => updateSection("identity", { gender: event.target.value })}
            >
              <option value="">Keine Auswahl</option>
              {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
            </select>
          </Field>
          <div className="field-grid field-grid--2 field-grid--nested">
            <Field label="Grösse" optional htmlFor="height">
              <div className="input-with-unit">
                <input
                  id="height"
                  inputMode="numeric"
                  placeholder="175"
                  value={identity.heightCm}
                  onChange={(event) => updateSection("identity", { heightCm: event.target.value.replace(/[^0-9]/g, "") })}
                />
                <span>cm</span>
              </div>
            </Field>
            <Field label="Gewicht" optional htmlFor="weight">
              <div className="input-with-unit">
                <input
                  id="weight"
                  inputMode="decimal"
                  placeholder="72"
                  value={identity.weightKg}
                  onChange={(event) => updateSection("identity", { weightKg: event.target.value.replace(/[^0-9.,]/g, "") })}
                />
                <span>kg</span>
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="form-section">
        <Field label="Wie würdest du deine Trainingserfahrung einschätzen?">
          <div className="choice-grid choice-grid--2">
            {EXPERIENCE_LEVELS.map((level) => (
              <ChoiceCard
                key={level.id}
                selected={experience.level === level.id}
                title={level.label}
                description={level.description}
                compact
                onClick={() => updateSection("experience", { level: level.id })}
              />
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section form-section--soft">
        <Field label="Wie viele Tage pro Woche bist du aktuell körperlich aktiv?">
          <RangeField
            value={experience.currentTrainingDays}
            min={0}
            max={7}
            onChange={(value) => updateSection("experience", { currentTrainingDays: value })}
            labelLeft="Noch gar nicht"
            labelRight="Täglich"
            valueLabel={`${experience.currentTrainingDays} ${experience.currentTrainingDays === 1 ? "Tag" : "Tage"} pro Woche`}
            ariaLabel="Aktuelle Trainingstage pro Woche"
          />
        </Field>
      </div>

      <div className="form-section">
        <div className="field-grid field-grid--2">
          <Field label="Seit wann trainierst du insgesamt?" optional htmlFor="history-years">
            <select
              id="history-years"
              value={experience.trainingHistoryYears}
              onChange={(event) => updateSection("experience", { trainingHistoryYears: event.target.value })}
            >
              <option value="">Bitte wählen</option>
              <option value="none">Noch keine Erfahrung</option>
              <option value="under_1">Weniger als 1 Jahr</option>
              <option value="1_3">1–3 Jahre</option>
              <option value="3_5">3–5 Jahre</option>
              <option value="5_plus">Mehr als 5 Jahre</option>
            </select>
          </Field>
          <Field label="Gab es zuletzt eine längere Pause?" optional htmlFor="recent-break">
            <select
              id="recent-break"
              value={experience.recentBreak}
              onChange={(event) => updateSection("experience", { recentBreak: event.target.value })}
            >
              <option value="">Bitte wählen</option>
              <option value="no">Nein, ich bin in meiner Routine</option>
              <option value="under_1m">Ja, bis zu 4 Wochen</option>
              <option value="1_3m">Ja, 1–3 Monate</option>
              <option value="3_6m">Ja, 3–6 Monate</option>
              <option value="6m_plus">Ja, länger als 6 Monate</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="form-section">
        <Field label="Was machst du aktuell?" hint="Übernimm deine Ziel-Sportarten oder passe die Auswahl an." optional>
          <div className="sport-grid">
            {SPORTS.map((sport) => (
              <Chip
                key={sport.id}
                selected={activeSports.includes(sport.id)}
                icon={sport.icon}
                onClick={() => updateSection("experience", {
                  currentActivities: toggleValue(activeSports, sport.id),
                })}
              >
                {sport.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      {(showRunning || showCycling || showSwimming) && (
        <div className="form-section volume-panel">
          <div className="inline-heading">
            <div><strong>Dein aktueller Ausdauerumfang</strong><small>Grobe Angaben genügen. Leere Felder bleiben einfach unberücksichtigt.</small></div>
          </div>
          <div className="field-grid field-grid--2">
            {showRunning && (
              <>
                <Field label="Laufkilometer pro Woche" optional htmlFor="run-km">
                  <div className="input-with-unit"><input id="run-km" inputMode="decimal" placeholder="25" value={experience.weeklyRunningKm} onChange={(event) => updateSection("experience", { weeklyRunningKm: event.target.value })} /><span>km</span></div>
                </Field>
                <Field label="Längster Lauf zuletzt" optional htmlFor="long-run">
                  <div className="input-with-unit"><input id="long-run" inputMode="decimal" placeholder="12" value={experience.longestRunKm} onChange={(event) => updateSection("experience", { longestRunKm: event.target.value })} /><span>km</span></div>
                </Field>
              </>
            )}
            {showCycling && (
              <Field label="Radstunden pro Woche" optional htmlFor="bike-hours">
                <div className="input-with-unit"><input id="bike-hours" inputMode="decimal" placeholder="3" value={experience.cyclingHours} onChange={(event) => updateSection("experience", { cyclingHours: event.target.value })} /><span>Std.</span></div>
              </Field>
            )}
            {showSwimming && (
              <Field label="Schwimmdistanz pro Woche" optional htmlFor="swim-meters">
                <div className="input-with-unit"><input id="swim-meters" inputMode="numeric" placeholder="2000" value={experience.swimmingMeters} onChange={(event) => updateSection("experience", { swimmingMeters: event.target.value })} /><span>m</span></div>
              </Field>
            )}
          </div>
        </div>
      )}

      <div className="form-section">
        <Field label="Wie sieht dein Training aktuell ungefähr aus?" optional htmlFor="current-routine">
          <textarea
            id="current-routine"
            rows={3}
            placeholder="Zum Beispiel: zweimal pro Woche laufen, am Wochenende Rad, unregelmässig Krafttraining …"
            value={experience.currentRoutine}
            onChange={(event) => updateSection("experience", { currentRoutine: event.target.value })}
          />
        </Field>
      </div>

      <Notice>
        Es geht nicht darum, dich zu bewerten. Die Angaben verhindern, dass ein Plan zu leicht, zu schwer oder zu schnell aufgebaut wird.
      </Notice>
    </div>
  );
}
