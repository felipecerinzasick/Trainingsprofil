import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { ExerciseDetail } from "../api/types";
import { Icon } from "./Icon";

interface ExerciseDetailModalProps {
  exerciseId: string;
  fallbackName: string;
  onClose: () => void;
}

const PATTERN_ICONS: Record<string, string> = {
  cardio: "run",
  locomotion: "run",
  mobility: "mobility",
  jump: "bolt",
  throw: "bolt",
  olympic: "bolt",
};

const FRAME_INTERVAL_MS = 1100;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function ExerciseAnimation({ detail }: { detail: ExerciseDetail }) {
  const images = detail.media?.images ?? [];
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!playing || images.length < 2 || failed) return;
    const timer = window.setInterval(() => setFrame((value) => (value + 1) % images.length), FRAME_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, images.length, failed]);

  if (images.length === 0 || failed) {
    return (
      <div className="exercise-figure exercise-figure--empty">
        <span><Icon name={PATTERN_ICONS[detail.patternId] ?? "dumbbell"} size={34} /></span>
        <strong>Noch keine Abbildung</strong>
        <small>Für diese Übung liegt noch kein freies Bildmaterial vor. Die Beschreibung unten hilft bei der Ausführung.</small>
      </div>
    );
  }

  return (
    <div className="exercise-figure">
      <button
        type="button"
        className="exercise-figure__stage"
        onClick={() => setPlaying((value) => !value)}
        aria-label={playing ? "Animation anhalten" : "Animation abspielen"}
      >
        {images.map((src, index) => (
          <img
            key={src}
            src={src}
            alt={index === 0 ? `${detail.name}: Ausgangsposition` : `${detail.name}: Endposition`}
            className={index === frame ? "is-visible" : ""}
            loading={index === 0 ? "eager" : "lazy"}
            onError={() => setFailed(true)}
          />
        ))}
        <span className="exercise-figure__badge">{frame === 0 ? "Ausgangsposition" : "Endposition"}</span>
        <span className="exercise-figure__play"><Icon name={playing ? "x" : "arrow-right"} size={14} /> {playing ? "Pause" : "Abspielen"}</span>
      </button>
      {images.length > 1 && (
        <div className="exercise-figure__frames" role="tablist" aria-label="Bewegungsphase">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={frame === index}
              className={frame === index ? "is-active" : ""}
              onClick={() => { setFrame(index); setPlaying(false); }}
            >
              <img src={src} alt="" aria-hidden="true" />
              <span>{index === 0 ? "Start" : "Ende"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExerciseDetailModal({ exerciseId, fallbackName, onClose }: ExerciseDetailModalProps) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setDetail(null);
    api.getExercise(exerciseId)
      .then((result) => { if (!cancelled) setDetail(result); })
      .catch((reason) => {
        if (cancelled) return;
        setError(reason instanceof ApiError ? reason.message : "Die Übungsdetails konnten nicht geladen werden.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [exerciseId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const media = detail?.media ?? null;
  const showsVariant = media !== null && media.match !== "exact" && media.sourceName;

  return (
    <div className="modal-backdrop modal-backdrop--sheet" role="presentation" onMouseDown={onClose}>
      <div className="exercise-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button exercise-modal__close" onClick={onClose} aria-label="Übungsdetails schliessen"><Icon name="x" size={18} /></button>

        <header className="exercise-modal__header">
          <span className="eyebrow">{detail?.pattern ?? "Übung"}</span>
          <h2 id="exercise-title">{detail?.name ?? fallbackName}</h2>
          {detail?.nameEn && detail.nameEn !== detail.name && <small>{detail.nameEn}</small>}
        </header>

        {loading && (
          <div className="exercise-modal__loading"><span className="loading-orb" /><p>Übungsdetails werden geladen …</p></div>
        )}

        {error && !loading && (
          <div className="auth-error" role="alert"><Icon name="alert" size={18} />{error}</div>
        )}

        {detail && (
          <div className="exercise-modal__body">
            <ExerciseAnimation detail={detail} />

            <dl className="exercise-facts">
              <div><dt>Hauptmuskel</dt><dd>{detail.primaryMuscle ?? "–"}</dd></div>
              {detail.secondaryMuscles.length > 0 && <div><dt>Beteiligt</dt><dd>{detail.secondaryMuscles.join(", ")}</dd></div>}
              <div><dt>Equipment</dt><dd>{detail.equipment.join(", ")}</dd></div>
              <div><dt>Schwierigkeit</dt><dd>{detail.difficulty ?? "–"}</dd></div>
              <div><dt>Ausführung</dt><dd>{detail.unilateral ? "Einseitig, beide Seiten trainieren" : "Beidseitig"}</dd></div>
              {detail.trainingGoals.length > 0 && <div><dt>Geeignet für</dt><dd>{detail.trainingGoals.join(", ")}</dd></div>}
            </dl>

            <section className="exercise-section">
              <h3><Icon name="check-circle" size={18} /> Worauf du achten solltest</h3>
              <ul>{detail.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
              {detail.requiresCoaching && <p className="exercise-section__note"><Icon name="alert" size={15} /> Technisch anspruchsvoll: Lass die Ausführung am besten einmal von einer Fachperson prüfen.</p>}
              {detail.notes.map((note) => <p key={note} className="exercise-section__note"><Icon name="info" size={15} /> {note}</p>)}
            </section>

            {media && media.instructions.length > 0 && (
              <section className="exercise-section">
                <h3><Icon name="steps" size={18} /> Schritt für Schritt <span className="exercise-section__lang">{media.instructionsLanguage === "en" ? "Englisch" : media.instructionsLanguage.toUpperCase()}</span></h3>
                <ol>{media.instructions.map((step, index) => <li key={`${index}-${step.slice(0, 20)}`}>{step}</li>)}</ol>
              </section>
            )}

            {media && (
              <footer className="exercise-modal__source">
                {showsVariant && <p>Die Abbildung zeigt die verwandte Grundform «{media.sourceName}».</p>}
                <p>
                  Abbildungen und Schritt-für-Schritt-Anleitung: {media.attribution.url
                    ? <a href={media.attribution.url} target="_blank" rel="noreferrer">{media.attribution.name}</a>
                    : media.attribution.name}
                  {media.attribution.license ? ` · ${media.attribution.license}` : ""}
                </p>
              </footer>
            )}
          </div>
        )}

        <div className="exercise-modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Schliessen</button>
        </div>
      </div>
    </div>
  );
}
