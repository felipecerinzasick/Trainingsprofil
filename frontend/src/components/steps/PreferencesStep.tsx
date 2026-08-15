import { BARRIERS, TRAINING_STYLES } from "../../data/options";
import { Chip, Field, Notice, RangeField, SectionHeading } from "../ui";
import type { StepProps } from "./types";

export function PreferencesStep({ profile, updateSection, setProfile }: StepProps) {
  const { preferences, recovery } = profile;

  const toggleStyle = (list: "likedStyles" | "dislikedStyles", id: string) => {
    setProfile((current) => {
      const selected = current.preferences[list].includes(id);
      const otherList = list === "likedStyles" ? "dislikedStyles" : "likedStyles";
      return {
        ...current,
        preferences: {
          ...current.preferences,
          [list]: selected
            ? current.preferences[list].filter((item) => item !== id)
            : [...current.preferences[list], id],
          [otherList]: current.preferences[otherList].filter((item) => item !== id),
        },
      };
    });
  };

  return (
    <div className="step-content">
      <SectionHeading
        eyebrow="Damit du dranbleibst"
        title="Wie trainierst du am liebsten?"
        text="Der beste Plan ist nicht nur fachlich sinnvoll. Er muss sich auch gut genug anfühlen, damit du ihn langfristig umsetzt."
      />

      <div className="form-section preference-panel preference-panel--like">
        <Field label="Was macht dir eher Spass?" hint="Mehrfachauswahl möglich" optional>
          <div className="style-grid">
            {TRAINING_STYLES.map((style) => (
              <Chip
                key={style.id}
                selected={preferences.likedStyles.includes(style.id)}
                icon={style.icon}
                onClick={() => toggleStyle("likedStyles", style.id)}
              >
                {style.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section preference-panel preference-panel--dislike">
        <Field label="Was möchtest du eher vermeiden?" hint="Diese Auswahl senkt später die Priorität entsprechender Einheiten." optional>
          <div className="style-grid">
            {TRAINING_STYLES.map((style) => (
              <Chip
                key={style.id}
                selected={preferences.dislikedStyles.includes(style.id)}
                icon={style.icon}
                onClick={() => toggleStyle("dislikedStyles", style.id)}
              >
                {style.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section">
        <div className="field-grid field-grid--2">
          <Field label="Wie soll der Plan mit dir sprechen?">
            <div className="segmented segmented--vertical-mobile" role="group" aria-label="Kommunikationsstil">
              {[
                { id: "supportive", label: "Motivierend" },
                { id: "balanced", label: "Ausgewogen" },
                { id: "direct", label: "Direkt" },
                { id: "technical", label: "Detailliert" },
              ].map((tone) => (
                <button
                  type="button"
                  key={tone.id}
                  className={preferences.coachingTone === tone.id ? "is-selected" : ""}
                  aria-pressed={preferences.coachingTone === tone.id}
                  onClick={() => updateSection("preferences", { coachingTone: tone.id })}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Drinnen oder draussen?">
            <div className="segmented segmented--vertical-mobile" role="group" aria-label="Indoor oder Outdoor">
              {[
                { id: "indoor", label: "Lieber drinnen" },
                { id: "balanced", label: "Beides" },
                { id: "outdoor", label: "Lieber draussen" },
              ].map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={preferences.indoorOutdoor === option.id ? "is-selected" : ""}
                  aria-pressed={preferences.indoorOutdoor === option.id}
                  onClick={() => updateSection("preferences", { indoorOutdoor: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="form-section form-section--soft">
        <Field label="Wie viel Abwechslung wünschst du dir?">
          <RangeField
            value={preferences.variety}
            min={1}
            max={5}
            onChange={(value) => updateSection("preferences", { variety: value })}
            labelLeft="Feste Routine"
            labelRight="Viel Abwechslung"
            valueLabel={[
              "Sehr konstante Routine",
              "Eher wiederholbar",
              "Ausgewogene Mischung",
              "Regelmässige Variation",
              "Möglichst abwechslungsreich",
            ][preferences.variety - 1]}
            ariaLabel="Gewünschte Trainingsabwechslung"
          />
        </Field>
      </div>

      <div className="form-section">
        <div className="field-grid field-grid--2">
          <Field label="Gibt es Übungen, die du nicht machen möchtest?" optional htmlFor="excluded-exercises">
            <textarea
              id="excluded-exercises"
              rows={3}
              placeholder="Zum Beispiel Burpees, Sprünge, Übungen auf dem Boden …"
              value={preferences.excludedExercises}
              onChange={(event) => updateSection("preferences", { excludedExercises: event.target.value })}
            />
          </Field>
          <Field label="Was macht regelmässiges Training für dich am schwierigsten?" optional htmlFor="barrier">
            <select
              id="barrier"
              value={preferences.adherenceBarrier}
              onChange={(event) => updateSection("preferences", { adherenceBarrier: event.target.value })}
            >
              <option value="">Bitte wählen</option>
              {BARRIERS.map((barrier) => <option key={barrier} value={barrier}>{barrier}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="recovery-section">
        <div className="recovery-section__heading">
          <span className="eyebrow">Erholung und Belastbarkeit</span>
          <h3>Wie fühlt sich dein Alltag gerade an?</h3>
          <p>Diese Angaben können später beeinflussen, wie schnell Belastung gesteigert wird.</p>
        </div>

        <div className="recovery-grid">
          <div className="recovery-card">
            <Field label="Schlaf pro Nacht">
              <RangeField
                value={recovery.sleepHours}
                min={4}
                max={10}
                step={0.5}
                onChange={(value) => updateSection("recovery", { sleepHours: value })}
                labelLeft="4 Std."
                labelRight="10 Std."
                valueLabel={`${recovery.sleepHours.toString().replace(".", ",")} Stunden`}
                ariaLabel="Durchschnittliche Schlafdauer"
              />
            </Field>
          </div>
          <div className="recovery-card">
            <Field label="Schlafqualität">
              <RangeField
                value={recovery.sleepQuality}
                min={1}
                max={5}
                onChange={(value) => updateSection("recovery", { sleepQuality: value })}
                labelLeft="Schlecht"
                labelRight="Sehr gut"
                valueLabel={`${recovery.sleepQuality} von 5`}
                ariaLabel="Schlafqualität"
              />
            </Field>
          </div>
          <div className="recovery-card">
            <Field label="Aktuelles Stressniveau">
              <RangeField
                value={recovery.stressLevel}
                min={1}
                max={5}
                onChange={(value) => updateSection("recovery", { stressLevel: value })}
                labelLeft="Niedrig"
                labelRight="Sehr hoch"
                valueLabel={`${recovery.stressLevel} von 5`}
                ariaLabel="Aktuelles Stressniveau"
              />
            </Field>
          </div>
          <div className="recovery-card">
            <Field label="Gefühlte Erholung">
              <RangeField
                value={recovery.recoveryFeeling}
                min={1}
                max={5}
                onChange={(value) => updateSection("recovery", { recoveryFeeling: value })}
                labelLeft="Erschöpft"
                labelRight="Sehr erholt"
                valueLabel={`${recovery.recoveryFeeling} von 5`}
                ariaLabel="Gefühlte Erholung"
              />
            </Field>
          </div>
        </div>

        <Field label="Wie viel sitzt du an einem typischen Tag?" optional htmlFor="sedentary-hours">
          <select
            id="sedentary-hours"
            value={recovery.sedentaryHours}
            onChange={(event) => updateSection("recovery", { sedentaryHours: event.target.value })}
          >
            <option value="">Bitte wählen</option>
            <option value="under_4">Weniger als 4 Stunden</option>
            <option value="4_6">4–6 Stunden</option>
            <option value="6_8">6–8 Stunden</option>
            <option value="8_10">8–10 Stunden</option>
            <option value="10_plus">Mehr als 10 Stunden</option>
          </select>
        </Field>
      </div>

      <Notice icon="heart">
        Vorlieben sind kein „Nice-to-have“: Ein etwas weniger perfekter Plan, den du gern umsetzt, ist wertvoller als ein idealer Plan, den du meidest.
      </Notice>
    </div>
  );
}
