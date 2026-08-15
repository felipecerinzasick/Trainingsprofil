import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { AuthResponse } from "../api/types";
import { Icon } from "./Icon";

interface AuthPageProps {
  defaultMode?: "register" | "login";
  firstName?: string;
  onSuccess: (result: AuthResponse) => void | Promise<void>;
  onBack: () => void;
  profileReady?: boolean;
}

export function AuthPage({ defaultMode = "register", firstName = "", onSuccess, onBack, profileReady }: AuthPageProps) {
  const [mode, setMode] = useState<"register" | "login">(defaultMode);
  const [form, setForm] = useState({ firstName, email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = mode === "register"
        ? await api.register(form)
        : await api.login({ email: form.email, password: form.password });
      await onSuccess(result);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Die Anmeldung ist fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-page__header page-shell">
        <button type="button" className="brand" onClick={onBack}>
          <span className="brand__mark"><Icon name="leaf" size={22} /></span>
          <span>trainingsprofil</span>
        </button>
        <button type="button" className="button button--ghost button--small" onClick={onBack}>
          <Icon name="arrow-left" size={17} /> Zurück
        </button>
      </header>

      <main className="auth-layout page-shell">
        <section className="auth-intro">
          <span className="eyebrow"><Icon name="spark" size={16} /> Dein persönlicher Bereich</span>
          <h1>{profileReady ? "Speichere dein Profil und erstelle deinen Plan." : "Deine Pläne. Sicher an einem Ort."}</h1>
          <p>
            Mit einem Konto kannst du dein Trainingsprofil speichern, neue Trainingsblöcke erstellen,
            bestehende Pläne öffnen und jeden Plan als PDF herunterladen.
          </p>
          <div className="auth-benefits">
            <span><Icon name="save" size={20} /><div><strong>Profil behalten</strong><small>Später weiterbearbeiten, statt neu zu beginnen.</small></div></span>
            <span><Icon name="calendar" size={20} /><div><strong>Pläne online verfügbar</strong><small>Alle erstellten Trainingsblöcke im persönlichen Dashboard.</small></div></span>
            <span><Icon name="download" size={20} /><div><strong>PDF-Export</strong><small>Sauber formatiert für Smartphone, Ausdruck oder Reise.</small></div></span>
          </div>
          <div className="auth-local-note"><Icon name="info" size={18} /> Lokaler Entwicklungsmodus: Die Daten liegen zunächst nur in deiner SQLite-Datei auf diesem Computer.</div>
        </section>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-tabs" role="tablist" aria-label="Anmeldung wählen">
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : ""} onClick={() => { setMode("register"); setError(""); }}>Konto erstellen</button>
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(""); }}>Anmelden</button>
          </div>

          <form onSubmit={submit}>
            <span className="auth-card__icon"><Icon name={mode === "register" ? "user" : "lock"} size={26} /></span>
            <h2 id="auth-title">{mode === "register" ? "Dein Konto erstellen" : "Willkommen zurück"}</h2>
            <p>{mode === "register" ? "Ein Schritt noch, dann kann dein erster Trainingsplan entstehen." : "Öffne dein Profil und deine gespeicherten Trainingspläne."}</p>

            {mode === "register" && (
              <label className="auth-field">
                <span>Vorname</span>
                <input value={form.firstName} autoComplete="given-name" onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="Felipe" />
              </label>
            )}
            <label className="auth-field">
              <span>E-Mail-Adresse</span>
              <input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="du@beispiel.ch" />
            </label>
            <label className="auth-field">
              <span>Passwort</span>
              <input type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === "register" ? "Mindestens 8 Zeichen" : "Dein Passwort"} />
            </label>

            {error && <div className="auth-error" role="alert"><Icon name="alert" size={18} />{error}</div>}

            <button type="submit" className="button button--primary button--large auth-submit" disabled={busy}>
              {busy ? "Wird verarbeitet …" : mode === "register" ? "Konto erstellen und fortfahren" : "Anmelden"}
              {!busy && <Icon name="arrow-right" size={19} />}
            </button>
            <small className="auth-card__legal">Dieser MVP enthält noch keine produktive Datenschutzerklärung oder E-Mail-Verifizierung.</small>
          </form>
        </section>
      </main>
    </div>
  );
}
