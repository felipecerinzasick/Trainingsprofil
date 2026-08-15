import { PRIMARY_GOALS, SPORTS } from "../../data/options";
import { Icon } from "../Icon";
import { Chip, ChoiceCard, Field, Notice, SectionHeading, Toggle } from "../ui";
import type { StepProps } from "./types";
import { toggleValue } from "./types";

export function GoalsStep({ profile, updateSection, setProfile }: StepProps) {
  const { goals } = profile;
  const eventVisible = goals.primaryGoal === "event" || goals.event.enabled;

  const selectPrimaryGoal = (goalId: string) => {
    setProfile((current) => ({
      ...current,
      goals: {
        ...current.goals,
        primaryGoal: goalId,
        secondaryGoals: current.goals.secondaryGoals.filter((item) => item !== goalId),
        event: {
          ...current.goals.event,
          enabled: goalId === "event" ? true : current.goals.event.enabled,
        },
      },
    }));
  };

  return (
    <div className="step-content">
      <SectionHeading
        eyebrow="Dein Ausgangspunkt"
        title="Was möchtest du erreichen?"
        text="Wähle zuerst dein wichtigstes Ziel. Weitere Ziele kannst du danach ergänzen."
      />

      <div className="choice-grid choice-grid--goals">
        {PRIMARY_GOALS.map((goal) => (
          <ChoiceCard
            key={goal.id}
            selected={goals.primaryGoal === goal.id}
            title={goal.label}
            description={goal.description}
            icon={goal.icon}
            onClick={() => selectPrimaryGoal(goal.id)}
          />
        ))}
      </div>

      <div className="form-section">
        <Field label="Was ist dir zusätzlich wichtig?" hint="Mehrfachauswahl möglich" optional>
          <div className="chip-group">
            {PRIMARY_GOALS.filter((goal) => goal.id !== goals.primaryGoal).map((goal) => (
              <Chip
                key={goal.id}
                selected={goals.secondaryGoals.includes(goal.id)}
                icon={goal.icon}
                onClick={() => updateSection("goals", {
                  secondaryGoals: toggleValue(goals.secondaryGoals, goal.id),
                })}
              >
                {goal.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section">
        <Field label="Welche Aktivitäten sollen im Plan vorkommen?" hint="Wähle alles aus, was relevant ist.">
          <div className="sport-grid">
            {SPORTS.map((sport) => (
              <Chip
                key={sport.id}
                selected={goals.sports.includes(sport.id)}
                icon={sport.icon}
                onClick={() => updateSection("goals", {
                  sports: toggleValue(goals.sports, sport.id),
                })}
              >
                {sport.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      {goals.primaryGoal !== "event" && (
        <div className="form-section form-section--soft">
          <Toggle
            checked={goals.event.enabled}
            onChange={(enabled) => updateSection("goals", {
              event: { ...goals.event, enabled },
            })}
            label="Ich habe zusätzlich ein konkretes Datum oder Event"
            description="Zum Beispiel einen Lauf, eine Wanderung oder eine persönliche Challenge"
          />
        </div>
      )}

      {eventVisible && (
        <div className="form-section event-panel">
          <div className="inline-heading">
            <span className="inline-heading__icon"><Icon name="flag" size={21} /></span>
            <div><strong>Dein konkretes Ziel</strong><small>Hilft später bei Umfang, Periodisierung und Belastungssteuerung.</small></div>
          </div>
          <div className="field-grid field-grid--2">
            <Field label="Art des Ziels" htmlFor="event-type">
              <select
                id="event-type"
                value={goals.event.type}
                onChange={(event) => updateSection("goals", {
                  event: { ...goals.event, type: event.target.value },
                })}
              >
                <option value="">Bitte wählen</option>
                <option value="running">Strassenlauf / Marathon</option>
                <option value="trail">Trailrun</option>
                <option value="triathlon">Triathlon</option>
                <option value="cycling">Radrennen / Radtour</option>
                <option value="hiking">Wanderung / Trekking</option>
                <option value="strength">Kraftziel / Test</option>
                <option value="other">Anderes Ziel</option>
              </select>
            </Field>
            <Field label="Datum" htmlFor="event-date">
              <input
                id="event-date"
                type="date"
                value={goals.event.date}
                onChange={(event) => updateSection("goals", {
                  event: { ...goals.event, date: event.target.value },
                })}
              />
            </Field>
            <Field label="Name des Events" optional htmlFor="event-name">
              <input
                id="event-name"
                type="text"
                placeholder="z. B. Zürich Marathon"
                value={goals.event.name}
                onChange={(event) => updateSection("goals", {
                  event: { ...goals.event, name: event.target.value },
                })}
              />
            </Field>
            <Field label="Distanz / Format" optional htmlFor="event-distance">
              <input
                id="event-distance"
                type="text"
                placeholder="z. B. 42,2 km oder Sprintdistanz"
                value={goals.event.distance}
                onChange={(event) => updateSection("goals", {
                  event: { ...goals.event, distance: event.target.value },
                })}
              />
            </Field>
          </div>
          <Field label="Zielzeit oder persönliches Ziel" optional htmlFor="target-time">
            <input
              id="target-time"
              type="text"
              placeholder="z. B. ankommen, unter 4 Stunden, ohne Gehpausen"
              value={goals.event.targetTime}
              onChange={(event) => updateSection("goals", {
                event: { ...goals.event, targetTime: event.target.value },
              })}
            />
          </Field>
        </div>
      )}

      <div className="form-section">
        <Field
          label="Warum ist dir dieses Ziel wichtig?"
          hint="Ein kurzer Satz hilft später, den Plan und die Kommunikation passend auszurichten."
          optional
          htmlFor="motivation"
        >
          <textarea
            id="motivation"
            rows={3}
            placeholder="Zum Beispiel: Ich möchte mich im Alltag wieder kräftiger fühlen …"
            value={goals.motivation}
            onChange={(event) => updateSection("goals", { motivation: event.target.value })}
          />
        </Field>
      </div>

      <Notice>
        Du musst noch keine Trainingsbegriffe kennen. Beschreibe dein Ziel so, wie du es selbst sagen würdest.
      </Notice>
    </div>
  );
}
