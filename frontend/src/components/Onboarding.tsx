import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TrainingProfile } from "../types";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";
import { GoalsStep } from "./steps/GoalsStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { ScheduleStep } from "./steps/ScheduleStep";
import { EquipmentStep } from "./steps/EquipmentStep";
import { HealthStep } from "./steps/HealthStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { UpdateSection } from "./steps/types";

const STEP_STORAGE_KEY = "trainingsprofil-current-step-v1";

const STEPS = [
  { id: "goals", label: "Ziele", title: "Ziele und Sport", icon: "target" },
  { id: "experience", label: "Ausgangslage", title: "Erfahrung und Niveau", icon: "user" },
  { id: "schedule", label: "Zeit", title: "Woche und Verfügbarkeit", icon: "calendar" },
  { id: "equipment", label: "Ausstattung", title: "Orte und Equipment", icon: "dumbbell" },
  { id: "health", label: "Körper", title: "Beschwerden und Sicherheit", icon: "shield" },
  { id: "preferences", label: "Vorlieben", title: "Training und Erholung", icon: "heart" },
  { id: "review", label: "Überblick", title: "Prüfen und abschliessen", icon: "check-circle" },
];

interface OnboardingProps {
  profile: TrainingProfile;
  setProfile: Dispatch<SetStateAction<TrainingProfile>>;
  onExit: () => void;
  onComplete: () => void;
}

function getInitialStep() {
  const stored = Number(localStorage.getItem(STEP_STORAGE_KEY));
  return Number.isInteger(stored) && stored >= 0 && stored < STEPS.length ? stored : 0;
}

export function Onboarding({ profile, setProfile, onExit, onComplete }: OnboardingProps) {
  const initialStep = useMemo(getInitialStep, []);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [maxVisited, setMaxVisited] = useState(initialStep);
  const [error, setError] = useState("");
  const [savePulse, setSavePulse] = useState(false);

  const updateSection: UpdateSection = (section, patch) => {
    setProfile((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      [section]: { ...(current[section] as object), ...patch },
    } as TrainingProfile));
    setSavePulse(true);
  };

  useEffect(() => {
    localStorage.setItem(STEP_STORAGE_KEY, String(currentStep));
    document.title = `${STEPS[currentStep].label} · Trainingsprofil`;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setError("");
  }, [currentStep]);

  useEffect(() => {
    if (!savePulse) return;
    const timeout = window.setTimeout(() => setSavePulse(false), 900);
    return () => window.clearTimeout(timeout);
  }, [savePulse]);

  const validateStep = (index: number) => {
    if (index === 0) {
      if (!profile.goals.primaryGoal) return "Bitte wähle dein wichtigstes Trainingsziel.";
      if (profile.goals.sports.length === 0) return "Bitte wähle mindestens eine Aktivität für deinen Plan.";
    }
    if (index === 1) {
      if (!profile.identity.ageGroup) return "Bitte wähle deinen Altersbereich.";
      if (!profile.experience.level) return "Bitte schätze deine aktuelle Trainingserfahrung ein.";
    }
    if (index === 2 && profile.schedule.availableDays.length === 0) {
      return "Bitte wähle mindestens einen grundsätzlich möglichen Trainingstag.";
    }
    if (index === 3 && profile.environment.locations.length === 0) {
      return "Bitte wähle mindestens einen Trainingsort.";
    }
    if (index === 4) {
      if (profile.health.painFree === null) return "Bitte gib an, ob aktuell Beschwerden berücksichtigt werden sollen.";
      if (profile.health.painFree === false && profile.health.restrictions.length === 0) return "Bitte wähle mindestens einen betroffenen Körperbereich.";
      if (!profile.health.safetyConfirmedNone && profile.health.safetyFlags.length === 0) return "Bitte bestätige den Sicherheits-Check oder wähle einen zutreffenden Hinweis.";
    }
    if (index === 6) {
      if (!profile.consent.dataProcessing) return "Bitte bestätige die Verarbeitung der Angaben für das Trainingsprofil.";
      if (!profile.consent.healthAcknowledgement) return "Bitte bestätige den Hinweis zur medizinischen Abklärung.";
    }
    return "";
  };

  const goToStep = (index: number, force = false) => {
    if (!force && index > maxVisited) return;
    setCurrentStep(index);
  };

  const nextStep = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      requestAnimationFrame(() => document.querySelector(".form-error")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    if (currentStep === STEPS.length - 1) {
      localStorage.removeItem(STEP_STORAGE_KEY);
      onComplete();
      return;
    }

    const next = currentStep + 1;
    setMaxVisited((visited) => Math.max(visited, next));
    setCurrentStep(next);
  };

  const previousStep = () => {
    if (currentStep === 0) {
      onExit();
      return;
    }
    setCurrentStep((step) => step - 1);
  };

  const renderStep = () => {
    const commonProps = { profile, updateSection, setProfile };
    switch (currentStep) {
      case 0: return <GoalsStep {...commonProps} />;
      case 1: return <ExperienceStep {...commonProps} />;
      case 2: return <ScheduleStep {...commonProps} />;
      case 3: return <EquipmentStep {...commonProps} />;
      case 4: return <HealthStep {...commonProps} />;
      case 5: return <PreferencesStep {...commonProps} />;
      case 6: return <ReviewStep {...commonProps} onEditStep={(step) => goToStep(step, true)} />;
      default: return null;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="onboarding-page">
      <header className="onboarding-mobile-header">
        <button type="button" className="mobile-brand" onClick={onExit} aria-label="Zur Startseite">
          <span><BrandLogo compact /></span> trainingsprofil
        </button>
        <div className="mobile-step-count">{currentStep + 1}/{STEPS.length}</div>
      </header>

      <aside className="onboarding-sidebar">
        <button type="button" className="brand brand--sidebar" onClick={onExit} aria-label="Zur Startseite">
          <span className="brand__mark"><BrandLogo /></span>
          <span>trainingsprofil</span>
        </button>

        <div className="sidebar-intro">
          <span className="eyebrow">Dein Trainings-Check</span>
          <h2>Schritt für Schritt zu deinem Profil.</h2>
          <p>Dein Entwurf wird im Browser gesichert; mit Konto wird dein Profil in deinem Trainingsbereich gespeichert.</p>
        </div>

        <nav className="step-navigation" aria-label="Fortschritt Trainingsprofil">
          {STEPS.map((step, index) => {
            const active = index === currentStep;
            const complete = index < currentStep || index < maxVisited;
            const accessible = index <= maxVisited;
            return (
              <button
                type="button"
                key={step.id}
                className={`${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}
                onClick={() => goToStep(index)}
                disabled={!accessible}
                aria-current={active ? "step" : undefined}
              >
                <span className="step-navigation__number">{complete && !active ? <Icon name="check" size={14} /> : index + 1}</span>
                <span><strong>{step.label}</strong><small>{step.title}</small></span>
              </button>
            );
          })}
        </nav>

        <div className={`save-status ${savePulse ? "is-saving" : ""}`}>
          <span><Icon name={savePulse ? "refresh" : "save"} size={16} /></span>
          <div><strong>{savePulse ? "Wird gespeichert …" : "Entwurf gespeichert"}</strong><small>Profil wird nach Login serverseitig gespeichert</small></div>
        </div>
      </aside>

      <main className="onboarding-main">
        <div className="mobile-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        <div className="onboarding-topbar">
          <div>
            <span>Schritt {currentStep + 1} von {STEPS.length}</span>
            <strong>{STEPS[currentStep].title}</strong>
          </div>
          <button type="button" className="exit-button" onClick={onExit}>Speichern & schliessen <Icon name="x" size={16} /></button>
        </div>

        <div className="onboarding-content">
          {renderStep()}
          {error && <div className="form-error" role="alert"><Icon name="alert" size={19} /><span>{error}</span></div>}
        </div>

        <div className="onboarding-actions-placeholder" />
      </main>

      <footer className="onboarding-actions">
        <button type="button" className="button button--ghost action-back" onClick={previousStep}>
          <Icon name="arrow-left" size={18} />
          {currentStep === 0 ? "Zur Startseite" : "Zurück"}
        </button>
        <div className="onboarding-actions__status">
          <span style={{ width: `${progress}%` }} />
          <small>{Math.round(progress)}% abgeschlossen</small>
        </div>
        <button type="button" className="button button--primary action-next" onClick={nextStep}>
          {currentStep === STEPS.length - 1 ? "Trainingsprofil abschliessen" : "Weiter"}
          <Icon name={currentStep === STEPS.length - 1 ? "check" : "arrow-right"} size={18} />
        </button>
      </footer>
    </div>
  );
}
