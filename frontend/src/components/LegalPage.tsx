import { useEffect } from "react";
import type { AuthUser } from "../api/types";
import { AppHeader } from "./AppHeader";
import { Icon } from "./Icon";

interface LegalPageProps {
  user?: AuthUser | null;
  onHome: () => void;
  onDashboard?: () => void;
  onLogout?: () => void;
}

const SECTIONS = [
  { id: "anbieter", label: "Anbieter & Kontakt" },
  { id: "datenschutz", label: "Datenschutz" },
  { id: "zahlungen", label: "Preise, Abo & Zahlung" },
  { id: "hinweis", label: "Trainings- und Gesundheitshinweis" },
  { id: "rechte", label: "Deine Rechte" },
];

/** Static page with the privacy statement, payment terms and the medical disclaimer. */
export function LegalPage({ user, onHome, onDashboard, onLogout }: LegalPageProps) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // The page is usually opened from the bottom of the landing page; start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <div className="legal-page">
      <AppHeader user={user} onHome={onHome} onDashboard={user ? onDashboard : undefined} onLogout={user ? onLogout : undefined} />
      <main className="legal-main page-shell">
        <header className="legal-hero">
          <button type="button" className="text-button" onClick={onHome}><Icon name="arrow-left" size={17} /> Zur Startseite</button>
          <span className="eyebrow"><Icon name="lock" size={16} /> Datenschutz &amp; Rechtliches</span>
          <h1>Was mit deinen Angaben passiert – und was Trainingsprofil ist und nicht ist.</h1>
          <p>Hier findest du gebündelt, wer den Dienst betreibt, welche Daten gespeichert werden, wie Preise und Zahlung funktionieren und welche Grenzen automatisch erstellte Trainingspläne haben.</p>
        </header>

        <div className="legal-layout">
          <nav className="legal-toc" aria-label="Inhalt">
            <strong>Inhalt</strong>
            {SECTIONS.map((section) => (
              <button key={section.id} type="button" onClick={() => scrollTo(section.id)}>{section.label}</button>
            ))}
          </nav>

          <div className="legal-content">
            <section className="legal-section" id="anbieter">
              <h2>Anbieter &amp; Kontakt</h2>
              <p>Trainingsprofil ist ein Web-Dienst, der aus einem persönlichen Trainingsprofil regelbasiert Trainingsblöcke erstellt. Die Anwendung befindet sich im Aufbau (MVP).</p>
              <div className="legal-callout">
                <Icon name="info" size={19} />
                <p>Vollständige Anbieterangaben (Impressum), eine Support-Adresse und die verantwortliche Stelle im Sinne des Datenschutzrechts werden vor dem öffentlichen Start ergänzt. Bis dahin erreichst du uns über den Kontakt, den du zu diesem Dienst erhalten hast.</p>
              </div>
            </section>

            <section className="legal-section" id="datenschutz">
              <h2>Datenschutzerklärung</h2>
              <h3>Welche Daten gespeichert werden</h3>
              <ul>
                <li><strong>Kontodaten:</strong> E-Mail-Adresse, Vorname und ein Passwort-Hash (Argon2). Bei Anmeldung mit Google erhalten wir E-Mail-Adresse und Namen von Google; ein Passwort wird dann nicht gespeichert.</li>
                <li><strong>Trainingsprofil:</strong> deine Angaben aus dem Trainings-Check, darunter Ziele, Erfahrung, Zeitfenster, Ausstattung sowie gesundheitsbezogene Angaben wie Beschwerden und Einschränkungen. Diese Angaben sind nötig, damit Übungen gefiltert und Belastungen angepasst werden können.</li>
                <li><strong>Trainingspläne:</strong> jeder erstellte Plan inklusive einer Kopie des Profils zum Zeitpunkt der Erstellung, damit spätere Profiländerungen bestehende Pläne nicht verändern.</li>
                <li><strong>Abo- und Kaufstatus:</strong> eine Stripe-Kundennummer, der Status eines Plus-Abos und welche Trainingsblöcke einzeln freigeschaltet wurden. Zahlungsdaten wie Kartennummern sehen und speichern wir nicht.</li>
              </ul>
              <h3>Wofür die Daten verwendet werden</h3>
              <p>Ausschliesslich zur Bereitstellung des Dienstes: Erstellung, Speicherung und Anzeige deiner Trainingspläne, PDF-Ausgabe, Verwaltung deines Kontos sowie Abwicklung von Abo und Einzelkauf. Eine Weitergabe zu Werbezwecken oder ein Verkauf deiner Daten findet nicht statt. Gesundheitsangaben werden nicht für Analysen oder Marketing verwendet.</p>
              <h3>Dienstleister</h3>
              <ul>
                <li><strong>Render</strong> (Hosting und Datenbank, Region Frankfurt): Betrieb der Anwendung und Speicherung der oben genannten Daten.</li>
                <li><strong>Stripe</strong> (Zahlungsabwicklung): verarbeitet Zahlungsdaten für Plus und Einzelkäufe auf eigenen Seiten. Wir übermitteln dazu deine E-Mail-Adresse, deinen Vornamen und eine interne Konto-Kennung.</li>
                <li><strong>Google</strong> (optional): nur, wenn du dich mit deinem Google-Konto anmeldest.</li>
              </ul>
              <h3>Browser-Speicher</h3>
              <p>Der Trainings-Check speichert deinen Entwurf im lokalen Speicher deines Browsers, damit du ihn später fortsetzen kannst, auch ohne Konto. Nach der Anmeldung wird dort ein Zugangstoken abgelegt. Es werden keine Tracking-Cookies und keine Analyse-Dienste eingesetzt.</p>
              <h3>Speicherdauer</h3>
              <p>Konto, Profil und Pläne bleiben gespeichert, bis du sie löschst oder die Löschung deines Kontos anfragst. Einzelne Pläne kannst du jederzeit im persönlichen Bereich löschen.</p>
            </section>

            <section className="legal-section" id="zahlungen">
              <h2>Preise, Abo &amp; Zahlung</h2>
              <ul>
                <li><strong>Kostenlos:</strong> Konto, Trainings-Check und eine Vorschau jedes Plans (die ersten zwei Wochen), ohne zeitliche Begrenzung.</li>
                <li><strong>Plus:</strong> 9,99 € pro Monat oder 59,99 € pro Jahr. Schaltet alle Wochen aller Pläne und den PDF-Export frei. Das Abo verlängert sich automatisch um den gewählten Zeitraum und kann jederzeit zum Ende des laufenden Zeitraums im Stripe-Kundenportal gekündigt werden.</li>
                <li><strong>Einzelner Trainingsblock:</strong> 24,99 € einmalig. Schaltet genau einen Plan dauerhaft frei, ohne Folgekosten.</li>
              </ul>
              <p>Alle Preise verstehen sich inklusive Mehrwertsteuer. Die Zahlung erfolgt über Stripe; Rechnungen und Zahlungsmethoden verwaltest du dort. Da der vollständige Plan sofort nach dem Kauf bereitgestellt wird, erlischt ein gesetzliches Widerrufsrecht für digitale Inhalte mit deiner ausdrücklichen Zustimmung beim Kauf. Bei technischen Problemen melde dich bitte, wir finden eine Lösung.</p>
            </section>

            <section className="legal-section" id="hinweis">
              <h2>Trainings- und Gesundheitshinweis</h2>
              <p>Trainingspläne von Trainingsprofil sind allgemeine, regelbasiert erstellte Trainingsempfehlungen. Sie ersetzen keine medizinische Diagnose, Behandlung, Physiotherapie oder persönliche Betreuung durch eine Fachperson.</p>
              <ul>
                <li>Bei Schmerzen, akuten Beschwerden, Schwangerschaft, Herz-Kreislauf-Erkrankungen, Vorerkrankungen oder Unsicherheit solltest du vor Trainingsbeginn ärztlichen oder fachlichen Rat einholen.</li>
                <li>Bei bestimmten Angaben im Sicherheits-Check wird kein Plan automatisch erstellt. Das ist beabsichtigt und dient deiner Sicherheit.</li>
                <li>Höre auf deinen Körper: Brich eine Einheit ab, wenn Schmerzen, Schwindel, Atemnot oder Brustschmerzen auftreten, und lass die Ursache abklären.</li>
              </ul>
              <p>Die Nutzung der Pläne erfolgt eigenverantwortlich. Hinweise zu Anpassungen in den Plänen beruhen auf deinen eigenen Angaben und können eine individuelle Beurteilung nicht ersetzen.</p>
            </section>

            <section className="legal-section" id="rechte">
              <h2>Deine Rechte</h2>
              <p>Du kannst jederzeit Auskunft über deine gespeicherten Daten verlangen sowie deren Berichtigung, Export oder Löschung anfragen. Trainingspläne löschst du selbst im persönlichen Bereich; Profil und Konto löschen wir auf Anfrage vollständig. Wenn du der Meinung bist, dass die Verarbeitung deiner Daten gegen geltendes Recht verstösst, kannst du dich an die zuständige Datenschutz-Aufsichtsbehörde wenden.</p>
              <p className="legal-fineprint">Stand: November 2026. Diese Seite ist eine kompakte Fassung für die Testphase des Dienstes. Vor der öffentlichen Skalierung werden Impressum, vollständige Datenschutzerklärung, AGB, Widerrufsbelehrung und Löschprozess rechtlich finalisiert.</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
