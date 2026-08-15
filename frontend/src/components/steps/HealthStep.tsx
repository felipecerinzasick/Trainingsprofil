import { BODY_REGIONS, CONDITIONS, SAFETY_QUESTIONS, SYMPTOMS } from "../../data/options";
import { createRestriction } from "../../utils/profile";
import type { BodyRestriction, RestrictionStrategy } from "../../types";
import { Icon } from "../Icon";
import { Chip, ChoiceCard, Field, Notice, RangeField, SectionHeading, Toggle } from "../ui";
import type { StepProps } from "./types";
import { toggleValue } from "./types";

const STRATEGIES: Array<{ id: RestrictionStrategy; label: string; description: string }> = [
  { id: "avoid", label: "Bereich vorerst nicht belasten", description: "Übungen mit direkter Belastung dieses Bereichs ausschliessen" },
  { id: "adapt", label: "Übungen anpassen", description: "Belastung, Bewegungsumfang oder Variante reduzieren" },
  { id: "monitor", label: "Nur beobachten", description: "Training möglich; Rückmeldung während der Einheiten beachten" },
];

const SIDE_OPTIONS = [
  { id: "left", label: "Links" },
  { id: "right", label: "Rechts" },
  { id: "both", label: "Beidseitig" },
  { id: "not_applicable", label: "Nicht relevant" },
] as const;

function regionLabel(regionId: string) {
  return BODY_REGIONS.find((region) => region.id === regionId)?.label ?? regionId;
}

export function HealthStep({ profile, updateSection, setProfile }: StepProps) {
  const { health } = profile;
  const selectedRegions = health.restrictions.map((restriction) => restriction.region);
  const selectedSafetyIds = health.safetyFlags.filter((flag) => flag.value).map((flag) => flag.id);

  const setPainFree = (painFree: boolean) => {
    setProfile((current) => ({
      ...current,
      health: {
        ...current.health,
        painFree,
        restrictions: painFree ? [] : current.health.restrictions,
      },
    }));
  };

  const toggleRegion = (region: string) => {
    setProfile((current) => {
      const exists = current.health.restrictions.some((restriction) => restriction.region === region);
      return {
        ...current,
        health: {
          ...current.health,
          painFree: false,
          restrictions: exists
            ? current.health.restrictions.filter((restriction) => restriction.region !== region)
            : [...current.health.restrictions, createRestriction(region)],
        },
      };
    });
  };

  const updateRestriction = (id: string, patch: Partial<BodyRestriction>) => {
    setProfile((current) => ({
      ...current,
      health: {
        ...current.health,
        restrictions: current.health.restrictions.map((restriction) =>
          restriction.id === id ? { ...restriction, ...patch } : restriction,
        ),
      },
    }));
  };

  const removeRestriction = (id: string) => {
    setProfile((current) => ({
      ...current,
      health: {
        ...current.health,
        restrictions: current.health.restrictions.filter((restriction) => restriction.id !== id),
      },
    }));
  };

  const toggleSafetyFlag = (id: string) => {
    setProfile((current) => {
      const selected = current.health.safetyFlags.some((flag) => flag.id === id && flag.value);
      return {
        ...current,
        health: {
          ...current.health,
          safetyConfirmedNone: false,
          safetyFlags: selected
            ? current.health.safetyFlags.filter((flag) => flag.id !== id)
            : [...current.health.safetyFlags.filter((flag) => flag.id !== id), { id, value: true }],
        },
      };
    });
  };

  const toggleCondition = (condition: string) => {
    const none = "Keine bekannte Erkrankung";
    if (condition === none) {
      updateSection("health", { conditions: health.conditions.includes(none) ? [] : [none] });
      return;
    }
    updateSection("health", {
      conditions: toggleValue(health.conditions.filter((item) => item !== none), condition),
    });
  };

  return (
    <div className="step-content">
      <SectionHeading
        eyebrow="Sicher und passend"
        title="Was soll dein Plan berücksichtigen?"
        text="Beschwerden werden nicht diagnostiziert. Sie werden so erfasst, dass Übungen später vermieden, angepasst oder besonders beobachtet werden können."
      />

      <div className="form-section">
        <Field label="Bist du aktuell im Alltag und beim Training beschwerdefrei?">
          <div className="choice-grid choice-grid--2 health-choice-grid">
            <ChoiceCard
              selected={health.painFree === true}
              title="Ja, aktuell beschwerdefrei"
              description="Keine Schmerzen oder relevanten Bewegungseinschränkungen"
              icon="check-circle"
              onClick={() => setPainFree(true)}
            />
            <ChoiceCard
              selected={health.painFree === false}
              title="Nein, etwas soll berücksichtigt werden"
              description="Schmerz, Steifheit, Instabilität oder andere Einschränkung"
              icon="shield"
              onClick={() => setPainFree(false)}
            />
          </div>
        </Field>
      </div>

      {health.painFree === false && (
        <>
          <div className="form-section body-picker-panel">
            <div className="body-picker-panel__intro">
              <div>
                <span className="eyebrow">Körperbereiche</span>
                <h3>Wo bestehen Beschwerden oder Einschränkungen?</h3>
                <p>Wähle alle betroffenen Bereiche. Details folgen direkt darunter.</p>
              </div>
              <span className="selection-count">{selectedRegions.length} gewählt</span>
            </div>
            <div className="body-picker">
              <div className="body-silhouette" aria-hidden="true">
                <svg viewBox="0 0 180 360">
                  <circle cx="90" cy="33" r="22" />
                  <path d="M69 61c-11 16-17 38-16 63l5 73 16 55-8 92h20l8-87 8 87h20l-8-92 16-55 5-73c1-25-5-47-16-63-13 8-37 8-50 0Z" />
                  <path d="m54 91-28 91 16 5 30-77M126 91l28 91-16 5-30-77" />
                </svg>
                <span className="body-silhouette__pulse body-silhouette__pulse--shoulder" />
                <span className="body-silhouette__pulse body-silhouette__pulse--back" />
                <span className="body-silhouette__pulse body-silhouette__pulse--knee" />
              </div>
              <div className="body-region-grid">
                {BODY_REGIONS.map((region) => (
                  <button
                    type="button"
                    key={region.id}
                    className={selectedRegions.includes(region.id) ? "is-selected" : ""}
                    aria-pressed={selectedRegions.includes(region.id)}
                    onClick={() => toggleRegion(region.id)}
                  >
                    <span>{region.label}</span>
                    <i><Icon name="check" size={13} /></i>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {health.restrictions.length === 0 && (
            <Notice tone="warning">Wähle mindestens einen betroffenen Körperbereich, damit der Plan weiss, was berücksichtigt werden soll.</Notice>
          )}

          <div className="restriction-list">
            {health.restrictions.map((restriction, index) => (
              <article className="restriction-card" key={restriction.id}>
                <header className="restriction-card__header">
                  <div className="restriction-card__index">{index + 1}</div>
                  <div><span>Einschränkung</span><h3>{regionLabel(restriction.region)}</h3></div>
                  <button type="button" className="icon-button" onClick={() => removeRestriction(restriction.id)} aria-label={`${regionLabel(restriction.region)} entfernen`}><Icon name="x" size={18} /></button>
                </header>

                <div className="restriction-card__body">
                  <Field label="Welche Seite ist betroffen?">
                    <div className="segmented segmented--wrap">
                      {SIDE_OPTIONS.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={restriction.side === option.id ? "is-selected" : ""}
                          aria-pressed={restriction.side === option.id}
                          onClick={() => updateRestriction(restriction.id, { side: option.id })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Wie stark ist es typischerweise?">
                    <RangeField
                      value={restriction.intensity}
                      min={0}
                      max={10}
                      onChange={(value) => updateRestriction(restriction.id, { intensity: value })}
                      labelLeft="0 · nichts"
                      labelRight="10 · sehr stark"
                      valueLabel={`${restriction.intensity} von 10`}
                      ariaLabel={`Intensität ${regionLabel(restriction.region)}`}
                    />
                  </Field>

                  <Field label="Wie äussert es sich?" hint="Mehrfachauswahl möglich">
                    <div className="chip-group">
                      {SYMPTOMS.map((symptom) => (
                        <Chip
                          key={symptom.id}
                          selected={restriction.symptoms.includes(symptom.id)}
                          onClick={() => updateRestriction(restriction.id, {
                            symptoms: toggleValue(restriction.symptoms, symptom.id),
                          })}
                        >
                          {symptom.label}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <div className="field-grid field-grid--2">
                    <Field label="Seit wann?" optional htmlFor={`duration-${restriction.id}`}>
                      <select
                        id={`duration-${restriction.id}`}
                        value={restriction.duration}
                        onChange={(event) => updateRestriction(restriction.id, { duration: event.target.value })}
                      >
                        <option value="">Bitte wählen</option>
                        <option value="days">Seit einigen Tagen</option>
                        <option value="weeks">Seit einigen Wochen</option>
                        <option value="months">Seit einigen Monaten</option>
                        <option value="chronic">Länger / wiederkehrend</option>
                      </select>
                    </Field>
                    <Field label="Fachlich abgeklärt?" optional htmlFor={`clearance-${restriction.id}`}>
                      <select
                        id={`clearance-${restriction.id}`}
                        value={restriction.professionalClearance}
                        onChange={(event) => updateRestriction(restriction.id, { professionalClearance: event.target.value as BodyRestriction["professionalClearance"] })}
                      >
                        <option value="not_needed">Noch nicht / nicht erforderlich</option>
                        <option value="yes">Ja, Training ist freigegeben</option>
                        <option value="no">Nein, Training wurde eingeschränkt</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Was löst die Beschwerden aus?" optional htmlFor={`triggers-${restriction.id}`}>
                    <textarea
                      id={`triggers-${restriction.id}`}
                      rows={2}
                      placeholder="Zum Beispiel: Überkopfbewegungen, lange Läufe, tiefe Kniebeugen …"
                      value={restriction.triggers}
                      onChange={(event) => updateRestriction(restriction.id, { triggers: event.target.value })}
                    />
                  </Field>

                  <Field label="Wie soll der Plan damit umgehen?">
                    <div className="strategy-grid">
                      {STRATEGIES.map((strategy) => (
                        <ChoiceCard
                          key={strategy.id}
                          selected={restriction.strategy === strategy.id}
                          title={strategy.label}
                          description={strategy.description}
                          compact
                          onClick={() => updateRestriction(restriction.id, { strategy: strategy.id })}
                        />
                      ))}
                    </div>
                  </Field>

                  <Field label="Weitere Hinweise" optional htmlFor={`restriction-notes-${restriction.id}`}>
                    <textarea
                      id={`restriction-notes-${restriction.id}`}
                      rows={2}
                      placeholder="Diagnose, Empfehlung der Physiotherapie, gut verträgliche Bewegungen …"
                      value={restriction.notes}
                      onChange={(event) => updateRestriction(restriction.id, { notes: event.target.value })}
                    />
                  </Field>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="form-section safety-panel">
        <div className="safety-panel__heading">
          <span className="safety-panel__icon"><Icon name="shield" size={23} /></span>
          <div>
            <h3>Kurzer Sicherheits-Check</h3>
            <p>Trifft aktuell etwas davon auf dich zu? Diese Auswahl ist kein medizinischer Befund.</p>
          </div>
        </div>
        <div className="safety-list">
          {SAFETY_QUESTIONS.map((question) => (
            <Toggle
              key={question.id}
              checked={selectedSafetyIds.includes(question.id)}
              onChange={() => toggleSafetyFlag(question.id)}
              label={question.label}
            />
          ))}
        </div>
        <div className="safety-none">
          <Toggle
            checked={health.safetyConfirmedNone}
            onChange={(checked) => updateSection("health", {
              safetyConfirmedNone: checked,
              safetyFlags: checked ? [] : health.safetyFlags,
            })}
            label="Nichts davon trifft aktuell auf mich zu"
            description="Bestätigt, dass du die Punkte gelesen hast"
          />
        </div>
        {selectedSafetyIds.length > 0 && (
          <Notice tone="warning">
            Für eine produktive Anwendung sollte bei diesen Angaben vor intensiven Trainingsvorschlägen eine fachliche Freigabe oder ein gesonderter Sicherheitsprozess vorgesehen werden.
          </Notice>
        )}
      </div>

      <div className="form-section">
        <Field label="Bestehen bekannte gesundheitliche Besonderheiten?" hint="Mehrfachauswahl möglich" optional>
          <div className="chip-group">
            {CONDITIONS.map((condition) => (
              <Chip
                key={condition}
                selected={health.conditions.includes(condition)}
                onClick={() => toggleCondition(condition)}
              >
                {condition}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section">
        <div className="field-grid field-grid--2">
          <Field label="Medikamente oder medizinische Hinweise" optional htmlFor="medication-notes">
            <textarea
              id="medication-notes"
              rows={3}
              placeholder="Nur angeben, wenn es für Belastung oder Erholung relevant ist."
              value={health.medicationsNotes}
              onChange={(event) => updateSection("health", { medicationsNotes: event.target.value })}
            />
          </Field>
          <Field label="Was sollten wir sonst wissen?" optional htmlFor="health-notes">
            <textarea
              id="health-notes"
              rows={3}
              placeholder="Zum Beispiel Sturzrisiko, frühere Verletzung, gute oder schlecht verträgliche Belastungen …"
              value={health.healthNotes}
              onChange={(event) => updateSection("health", { healthNotes: event.target.value })}
            />
          </Field>
        </div>
      </div>

      <Notice icon="info">
        Dieser Trainings-Check ersetzt keine medizinische Diagnose. Akute, ungeklärte oder zunehmende Beschwerden gehören vor dem Training fachlich abgeklärt.
      </Notice>
    </div>
  );
}
