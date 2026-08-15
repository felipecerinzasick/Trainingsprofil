import { PREFERRED_TIMES, WEEKDAYS } from "../../data/options";
import { Icon } from "../Icon";
import { Chip, Field, Notice, SectionHeading } from "../ui";
import type { StepProps } from "./types";
import { toggleValue } from "./types";

const DURATIONS = [20, 30, 45, 60, 75, 90];

export function ScheduleStep({ profile, updateSection }: StepProps) {
  const { schedule } = profile;
  const dayMismatch = schedule.availableDays.length > 0 && schedule.desiredSessions > schedule.availableDays.length;

  return (
    <div className="step-content">
      <SectionHeading
        eyebrow="Dein echter Alltag"
        title="Wann kann Training wirklich stattfinden?"
        text="Ein guter Plan beginnt mit realistischen Zeitfenstern – nicht mit einer perfekten Woche, die es nie gibt."
      />

      <div className="form-section form-section--soft schedule-number-panel">
        <Field label="Wie viele Einheiten möchtest du pro Woche einplanen?">
          <div className="number-selector" role="group" aria-label="Gewünschte Einheiten pro Woche">
            {[1, 2, 3, 4, 5, 6, 7].map((number) => (
              <button
                type="button"
                key={number}
                className={schedule.desiredSessions === number ? "is-selected" : ""}
                aria-pressed={schedule.desiredSessions === number}
                onClick={() => updateSection("schedule", { desiredSessions: number })}
              >
                {number}
              </button>
            ))}
          </div>
          <p className="selection-summary">
            <Icon name="calendar" size={18} />
            <span><strong>{schedule.desiredSessions} {schedule.desiredSessions === 1 ? "Einheit" : "Einheiten"}</strong> pro Woche</span>
          </p>
        </Field>
      </div>

      <div className="form-section">
        <Field label="An welchen Tagen ist Training grundsätzlich möglich?" hint="Mehr Auswahl schafft Flexibilität; der Plan muss nicht jeden gewählten Tag nutzen.">
          <div className="weekday-grid">
            {WEEKDAYS.map((day) => {
              const selected = schedule.availableDays.includes(day.id);
              return (
                <button
                  type="button"
                  key={day.id}
                  className={selected ? "is-selected" : ""}
                  aria-pressed={selected}
                  onClick={() => updateSection("schedule", {
                    availableDays: toggleValue(schedule.availableDays, day.id),
                  })}
                >
                  <span>{day.short}</span>
                  <small>{day.label}</small>
                  <i><Icon name="check" size={13} /></i>
                </button>
              );
            })}
          </div>
        </Field>
        {dayMismatch && (
          <Notice tone="warning">
            Du möchtest mehr Einheiten als verfügbare Tage. Das ist möglich, wenn an einzelnen Tagen zwei kurze Einheiten infrage kommen; ansonsten wähle einen weiteren Tag oder reduziere die Anzahl.
          </Notice>
        )}
      </div>

      <div className="form-section">
        <Field label="Wie lange darf eine typische Einheit dauern?" hint="Lange Ausdauereinheiten können später separat geplant werden.">
          <div className="duration-grid" role="group" aria-label="Typische Trainingsdauer">
            {DURATIONS.map((duration) => (
              <button
                type="button"
                key={duration}
                className={schedule.sessionDuration === duration ? "is-selected" : ""}
                aria-pressed={schedule.sessionDuration === duration}
                onClick={() => updateSection("schedule", { sessionDuration: duration })}
              >
                <Icon name="clock" size={18} />
                <strong>{duration}</strong>
                <small>Min.</small>
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section">
        <Field label="Welche Tageszeiten funktionieren für dich?" optional>
          <div className="chip-group">
            {PREFERRED_TIMES.map((time) => (
              <Chip
                key={time.id}
                selected={schedule.preferredTimes.includes(time.id)}
                icon="clock"
                onClick={() => updateSection("schedule", {
                  preferredTimes: toggleValue(schedule.preferredTimes, time.id),
                })}
              >
                {time.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="form-section">
        <div className="field-grid field-grid--2">
          <Field label="Wann möchtest du starten?" optional htmlFor="plan-start">
            <input
              id="plan-start"
              type="date"
              value={schedule.planStartDate}
              onChange={(event) => updateSection("schedule", { planStartDate: event.target.value })}
            />
          </Field>
          <Field label="Was macht deine Woche unregelmässig?" optional htmlFor="schedule-notes">
            <textarea
              id="schedule-notes"
              rows={3}
              placeholder="Schichtarbeit, Reisen, Kinderbetreuung, wechselnde Wochen …"
              value={schedule.scheduleNotes}
              onChange={(event) => updateSection("schedule", { scheduleNotes: event.target.value })}
            />
          </Field>
        </div>
      </div>

      <Notice icon="refresh">
        Der spätere Plan sollte Einheiten verschieben und verkürzen können, ohne dass die ganze Woche „gescheitert“ ist.
      </Notice>
    </div>
  );
}
