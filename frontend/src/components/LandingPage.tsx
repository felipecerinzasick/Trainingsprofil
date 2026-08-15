import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";

interface LandingPageProps {
  onStart: () => void;
  hasDraft: boolean;
  onResume: () => void;
  onAccount: () => void;
  accountLabel?: string;
}

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Trainingsprofil Startseite">
      <span className="brand__mark"><BrandLogo /></span>
    </a>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual" aria-label="Dein Coach begleitet dein Trainingsprofil">
      <div className="hero-visual__glow" />
      <img className="hero-visual__coach" src="/dein_coach.png" alt="Dein Coach" />

      <div className="float-card float-card--goal">
        <span className="float-card__icon float-card__icon--lime"><Icon name="flag" size={18} /></span>
        <div><small>Ziel</small><strong>Halbmarathon</strong></div>
        <span className="status-dot" />
      </div>
      <div className="float-card float-card--week">
        <div className="mini-calendar">
          {["M", "D", "M", "D", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`} className={index === 1 || index === 3 || index === 5 ? "is-active" : ""}>{day}</span>
          ))}
        </div>
        <strong>3 Einheiten passen</strong>
        <small>in diese Woche</small>
      </div>
      <div className="float-card float-card--adapt">
        <span className="float-card__icon float-card__icon--peach"><Icon name="shield" size={18} /></span>
        <div><small>Berücksichtigt</small><strong>Knie sensibel</strong></div>
      </div>
      <div className="hero-visual__badge"><Icon name="spark" size={16} /> persönlich statt pauschal</div>
    </div>
  );
}

export function LandingPage({ onStart, hasDraft, onResume, onAccount, accountLabel }: LandingPageProps) {
  const scrollToHow = () => document.getElementById("so-funktionierts")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="landing" id="top">
      <header className="landing-nav">
        <div className="page-shell landing-nav__inner">
          <Brand />
          <nav aria-label="Hauptnavigation">
            <a href="#fuer-wen">Für wen?</a>
            <a href="#so-funktionierts">So funktioniert’s</a>
            <a href="#datenschutz">Deine Daten</a>
          </nav>
          <div className="landing-nav__actions">
            <button type="button" className="button button--small button--ghost" onClick={onAccount}>
              <Icon name="user" size={16} /> {accountLabel ?? "Anmelden"}
            </button>
            <button className="button button--small button--dark" onClick={hasDraft ? onResume : onStart}>
              {hasDraft ? "Profil fortsetzen" : "Profil starten"}
              <Icon name="arrow-right" size={17} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero page-shell">
          <div className="hero__copy">
            <div className="hero__eyebrow"><span /><Icon name="spark" size={16} /> Dein persönlicher Trainings-Check</div>
            <h1>Dein Plan beginnt nicht mit einem Standardprogramm. <em>Sondern mit dir.</em></h1>
            <p className="hero__lead">
              Erzähle uns von deinen Zielen, deinem Alltag, deiner Ausstattung und deinem Körper. Daraus kann später ein Trainingsplan entstehen, der wirklich zu dir passt.
            </p>
            <div className="hero__actions">
              <button className="button button--primary button--large" onClick={hasDraft ? onResume : onStart}>
                {hasDraft ? "Trainingsprofil fortsetzen" : "Trainingsprofil starten"}
                <Icon name="arrow-right" size={20} />
              </button>
              <button className="button button--ghost button--large" onClick={scrollToHow}>
                So funktioniert’s
              </button>
            </div>
            <div className="hero__meta">
              <span><Icon name="clock" size={17} /> etwa 6–8 Minuten</span>
              <span><Icon name="save" size={17} /> Profil und Pläne im Konto</span>
              <span><Icon name="shield" size={17} /> jederzeit anpassbar</span>
            </div>
          </div>
          <HeroVisual />
        </section>

        <section className="trust-strip">
          <div className="page-shell trust-strip__inner">
            <p>Ein Trainingsprofil für echte Menschen und echte Ziele</p>
            <div>
              <span><Icon name="run" size={19} /> Ausdauer</span>
              <span><Icon name="dumbbell" size={19} /> Kraft</span>
              <span><Icon name="mobility" size={19} /> Beweglichkeit</span>
              <span><Icon name="heart" size={19} /> Gesundheit</span>
            </div>
          </div>
        </section>

        <section className="audience-section page-shell" id="fuer-wen">
          <div className="split-heading">
            <div>
              <span className="eyebrow">Ein Profil, viele Wege</span>
              <h2>Trainieren, wie es zu deinem Ziel und Alltag passt.</h2>
            </div>
            <p>
              Nicht jeder braucht denselben Plan. Der Trainings-Check erfasst Ziel, Erfahrung, Belastbarkeit, Zeitfenster und Ausstattung, damit daraus ein sinnvoller Trainingsblock entstehen kann.
            </p>
          </div>

          <div className="audience-grid">
            <article className="audience-card audience-card--runner">
              <div className="audience-card__top">
                <span className="audience-card__icon"><Icon name="run" size={28} /></span>
                <span className="audience-card__tag">Auf ein Ziel hintrainieren</span>
              </div>
              <h3>Dein nächstes Ausdauerziel</h3>
              <p>Ob erster Lauf, Marathon oder Trailrun: Dein Plan verbindet Ausdauertraining, Kraft und Erholung so, dass er zu deinem aktuellen Niveau und deinem Alltag passt.</p>
              <ul>
                <li><Icon name="check" size={15} /> Ziel, Distanz und Zieldatum</li>
                <li><Icon name="check" size={15} /> aktueller Wochenumfang</li>
                <li><Icon name="check" size={15} /> verfügbare Trainingstage</li>
              </ul>
            </article>

            <article className="audience-card audience-card--tri">
              <div className="audience-card__top">
                <span className="audience-card__icon"><Icon name="triathlon" size={28} /></span>
                <span className="audience-card__tag">Vielseitig trainieren</span>
              </div>
              <h3>Mehrere Sportarten, ein Plan</h3>
              <p>Schwimmen, Radfahren, Laufen und Krafttraining werden so kombiniert, dass Belastung, Fortschritt und Regeneration sinnvoll aufeinander abgestimmt sind.</p>
              <ul>
                <li><Icon name="check" size={15} /> Sportarten und Erfahrung</li>
                <li><Icon name="check" size={15} /> Zugang zu Trainingsorten und Equipment</li>
                <li><Icon name="check" size={15} /> Zeitfenster und persönliche Präferenzen</li>
              </ul>
            </article>

            <article className="audience-card audience-card--healthy">
              <div className="audience-card__top">
                <span className="audience-card__icon"><Icon name="heart" size={28} /></span>
                <span className="audience-card__tag">Gesundheit und Alltag</span>
              </div>
              <h3>Stark, beweglich und belastbar bleiben</h3>
              <p>Für alle, die Kraft, Gleichgewicht und Beweglichkeit erhalten oder verbessern möchten – unabhängig von Alter, Erfahrung oder Ausgangsniveau.</p>
              <ul>
                <li><Icon name="check" size={15} /> aktueller Trainingsstand und Belastbarkeit</li>
                <li><Icon name="check" size={15} /> Beschwerden und Einschränkungen</li>
                <li><Icon name="check" size={15} /> sichere und individuell skalierbare Einheiten</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="how-section" id="so-funktionierts">
          <div className="page-shell">
            <div className="center-heading">
              <span className="eyebrow">Einfach und verständlich</span>
              <h2>Sieben kurze Schritte. Keine Fachbegriffe nötig.</h2>
              <p>Du siehst jederzeit, wo du bist, kannst zurückspringen und dein Profil später weiterbearbeiten.</p>
            </div>

            <div className="process-grid">
              <article>
                <span className="process-number">01</span>
                <div className="process-icon"><Icon name="target" size={25} /></div>
                <h3>Du beschreibst dein Ziel</h3>
                <p>Gesund bleiben, stärker werden, Ausdauer verbessern oder gezielt auf einen Wettkampf hinarbeiten.</p>
              </article>
              <article>
                <span className="process-number">02</span>
                <div className="process-icon"><Icon name="calendar" size={25} /></div>
                <h3>Wir verstehen deinen Alltag</h3>
                <p>Trainingstage, verfügbare Zeit, Erfahrung, Orte und vorhandenes Equipment werden realistisch erfasst.</p>
              </article>
              <article>
                <span className="process-number">03</span>
                <div className="process-icon"><Icon name="shield" size={25} /></div>
                <h3>Dein Körper wird berücksichtigt</h3>
                <p>Beschwerden, sensible Bereiche und Übungen, die du vermeiden möchtest, werden strukturiert hinterlegt.</p>
              </article>
              <article>
                <span className="process-number">04</span>
                <div className="process-icon"><Icon name="spark" size={25} /></div>
                <h3>Das Profil ist planbereit</h3>
                <p>Die Angaben werden in einer klaren Datenstruktur zusammengefasst und können an die Planlogik übergeben werden.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="equipment-showcase page-shell">
          <div className="equipment-showcase__copy">
            <span className="eyebrow">Nur Übungen, die möglich sind</span>
            <h2>Vom Wohnzimmer bis zum voll ausgestatteten Studio.</h2>
            <p>
              Wähle zuerst eine einfache Ausstattung und passe sie bei Bedarf im Detail an. So muss niemand eine endlose Geräteliste durchsuchen – und trotzdem gehen keine wichtigen Informationen verloren.
            </p>
            <div className="feature-list">
              <span><Icon name="check-circle" size={20} /> Schnellauswahl für typische Setups</span>
              <span><Icon name="check-circle" size={20} /> 92 Geräte aus der Übungsdatenbank</span>
              <span><Icon name="check-circle" size={20} /> durchsuchbare Detailauswahl</span>
            </div>
          </div>
          <div className="equipment-demo" aria-hidden="true">
            <div className="equipment-demo__header">
              <div><small>Deine Ausstattung</small><strong>Home-Gym</strong></div>
              <span>6 ausgewählt</span>
            </div>
            <div className="equipment-demo__chips">
              <span><Icon name="dumbbell" size={17} /> Kurzhanteln <Icon name="check" size={13} /></span>
              <span><Icon name="check" size={17} /> Kettlebell <Icon name="check" size={13} /></span>
              <span><Icon name="check" size={17} /> Trainingsbank <Icon name="check" size={13} /></span>
              <span><Icon name="check" size={17} /> Klimmzugstange <Icon name="check" size={13} /></span>
              <span><Icon name="check" size={17} /> Widerstandsband <Icon name="check" size={13} /></span>
              <span className="is-muted"><Icon name="plus" size={16} /> Gerät hinzufügen</span>
            </div>
            <div className="equipment-demo__result">
              <span className="result-orb"><Icon name="spark" size={24} /></span>
              <div><strong>436 passende Übungen</strong><small>könnten mit diesem Setup gefiltert werden</small></div>
            </div>
          </div>
        </section>

        <section className="privacy-section" id="datenschutz">
          <div className="page-shell privacy-card">
            <div className="privacy-card__icon"><Icon name="lock" size={32} /></div>
            <div className="privacy-card__copy">
              <span className="eyebrow">Datenschutz und Einordnung</span>
              <h2>Deine Angaben werden für dein Konto und deine Trainingspläne gespeichert.</h2>
              <p>
                Wenn du ein Konto erstellst oder einen Plan generierst, speichern wir deine Kontoangaben, dein Trainingsprofil und deine Trainingspläne in der angebundenen Datenbank. Browser-Entwürfe dienen nur dazu, den Check fortzusetzen, bevor du dich anmeldest.
              </p>
              <div className="privacy-card__legal" id="hinweis">
                <article>
                  <strong>Datenschutzerklärung kurz</strong>
                  <p>Die Daten werden zur Bereitstellung des Trainingsprofils, der Planerstellung, Speicherung im Dashboard und PDF-Ausgabe verarbeitet. Hosting und Datenbank laufen über Render. Eine Weitergabe zu Werbung oder Verkauf findet nicht statt. Du kannst Berichtigung, Export oder Löschung deiner Konto- und Profildaten anfragen.</p>
                </article>
                <article>
                  <strong>Hinweis</strong>
                  <p>Trainingspläne ersetzen keine medizinische Diagnose, Behandlung oder persönliche Betreuung. Bei Schmerzen, akuten Beschwerden, Schwangerschaft, Vorerkrankungen oder Unsicherheit solltest du vor Trainingsbeginn fachlichen Rat einholen.</p>
                </article>
              </div>
              <p className="privacy-card__fineprint">
                Diese Hinweise sind eine kompakte MVP-Datenschutzerklärung. Vor öffentlicher Skalierung sollten Impressum, vollständige Datenschutzerklärung, Löschprozess und Support-Kontakt rechtlich finalisiert werden.
              </p>
            </div>
            <div className="privacy-points">
              <span><Icon name="check" size={16} /> serverseitig gespeichert</span>
              <span><Icon name="check" size={16} /> exportierbar</span>
              <span><Icon name="check" size={16} /> löschbar auf Anfrage</span>
              <span><Icon name="check" size={16} /> keine medizinische Diagnose</span>
            </div>
          </div>
        </section>

        <section className="final-cta page-shell">
          <div className="final-cta__content">
            <span className="eyebrow">Bereit?</span>
            <h2>Ein guter Trainingsplan kennt zuerst den Menschen dahinter.</h2>
            <p>Starte deinen Trainings-Check und lege die Grundlage für einen Plan, den du auch wirklich umsetzen kannst.</p>
            <button className="button button--primary button--large" onClick={hasDraft ? onResume : onStart}>
              {hasDraft ? "Profil fortsetzen" : "Trainingsprofil starten"}
              <Icon name="arrow-right" size={20} />
            </button>
          </div>
          <div className="final-cta__orbit" aria-hidden="true"><span /><span /><span /></div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="page-shell landing-footer__inner">
          <Brand />
          <p>Trainingsprofil speichert Konto, Profil und Pläne zur Bereitstellung des Dienstes. Trainingshinweise sind allgemeine Empfehlungen und keine medizinische Beratung.</p>
          <div><a href="#datenschutz">Datenschutzerklärung</a><a href="#hinweis">Disclaimer</a><a href="#top">Nach oben</a></div>
        </div>
      </footer>
    </div>
  );
}
