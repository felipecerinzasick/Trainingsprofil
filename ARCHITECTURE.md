# Architektur

## Ziel des MVP

Die Anwendung soll aus einem kundenfreundlichen Trainingsprofil einen nachvollziehbaren Trainingsblock erzeugen, diesen einem Benutzerkonto zuordnen und sowohl als Webansicht als auch als PDF bereitstellen.

Die Architektur trennt bewusst vier Verantwortlichkeiten:

1. **Erfassung** – React-Onboarding
2. **Validierung und Sicherheit** – Pydantic und Safety Gate
3. **Planung** – deterministische Plan- und Übungslogik
4. **Ausgabe und Speicherung** – SQLAlchemy, Browseransicht und ReportLab-PDF

## Komponenten

### Frontend

Technologien:

- React
- TypeScript
- Vite
- responsives CSS ohne externes UI-Framework

Wichtige Bereiche:

- `frontend/src/components/Onboarding.tsx` – siebenstufiger Trainings-Check
- `frontend/src/components/AuthPage.tsx` – Registrierung und Anmeldung
- `frontend/src/components/DashboardPage.tsx` – Profilübersicht und Planbibliothek
- `frontend/src/components/PlanPage.tsx` – formatierte Wochen- und Einheitenansicht
- `frontend/src/api/client.ts` – HTTP-Client und PDF-Download
- `frontend/src/api/types.ts` – TypeScript-Typen des Planformats

### Backend

Technologien:

- FastAPI
- Pydantic
- SQLAlchemy
- Argon2-Passworthashing
- signierte JWT-Zugriffstoken
- ReportLab für PDF-Ausgabe

Wichtige Bereiche:

- `backend/app/api/auth.py` – Registrierung, Anmeldung und aktueller Benutzer
- `backend/app/api/profile.py` – Trainingsprofil lesen, speichern und löschen
- `backend/app/api/plans.py` – Plan erstellen, auflisten, öffnen, löschen und als PDF ausgeben
- `backend/app/services/safety.py` – medizinische Red Flags und Generierungsfreigabe
- `backend/app/services/restrictions.py` – Beschwerden in Filter- und Anpassungsregeln übersetzen
- `backend/app/services/exercise_catalog.py` – Übungsdatenbank laden, Equipment erweitern und Übungen ranken
- `backend/app/services/plan_engine.py` – Zieltyp, Wochenstruktur, Progression und Terminierung
- `backend/app/services/session_builders.py` – Kraft-, Lauf-, Trail-, Rad-, Schwimm-, Wander-, Mobility- und Triathlon-Einheiten
- `backend/app/services/pdf_renderer.py` – formatierte A4-Ausgabe

## Datenfluss

```text
Browser
  │
  │ TrainingProfile JSON
  ▼
FastAPI / Pydantic
  │
  ├── Safety Gate ──────── blockiert bei ungeklärten Red Flags
  │
  ├── Restriction Compiler
  │       ├── blockierte Bewegungsmuster
  │       ├── blockierte Muskelregionen
  │       ├── High-Impact-Regel
  │       └── Anpassungshinweise
  │
  ├── Equipment Expansion
  │       ├── Nutzerauswahl
  │       ├── Trainingsorte
  │       └── konservative Equipment-Implikationen
  │
  ├── Plan Engine
  │       ├── Ziel-/Disziplin-Erkennung
  │       ├── Wochentage und Einheiten-Blueprints
  │       ├── Belastungswellen und Entlastungswochen
  │       └── sportartspezifische Einheiten
  │
  ├── Exercise Ranking
  │       ├── Equipment vollständig verfügbar
  │       ├── Restriktionen eingehalten
  │       ├── Schwierigkeit passend
  │       ├── Coaching-Bedarf zulässig
  │       └── Priorität / Bewegungsmuster / Vorlieben
  │
  ▼
TrainingPlan JSON
  │
  ├── SQLite/PostgreSQL
  ├── React-Planansicht
  └── ReportLab-PDF
```

## Datenmodell

### `users`

- eindeutige E-Mail-Adresse
- Argon2-Passworthash
- Vorname
- Aktivstatus
- Zeitstempel

### `training_profiles`

- genau ein aktuelles Profil pro Benutzer
- Schema-Version
- vollständiger Profil-JSON-Body
- Zeitstempel

### `training_plans`

- beliebig viele Pläne pro Benutzer
- Titel, Ziel, Fokus, Zeitraum und Status
- Profil-Snapshot zum Erstellungszeitpunkt
- vollständiger Plan-JSON-Body
- Zeitstempel

Der Profil-Snapshot ist wichtig: Ein später geändertes Profil verändert bereits erzeugte Pläne nicht rückwirkend.

## Sicherheitsmodell des MVP

- Passwörter werden mit Argon2 gehasht und nie im Klartext gespeichert.
- Jeder geschützte Endpunkt verlangt ein signiertes Bearer-Token.
- Pläne werden immer zusätzlich nach `user_id` gefiltert; eine fremde Plan-ID reicht nicht für Zugriff.
- Die automatische Planerstellung wird bei ausgewählten ungeklärten Red Flags blockiert.
- Einschränkungen werden sowohl im Übungsfilter als auch als sichtbare Anpassungshinweise berücksichtigt.

Für den Produktivbetrieb muss die Token-Strategie auf sichere HttpOnly-Cookies beziehungsweise eine belastbare Session-/Refresh-Token-Architektur umgestellt werden.

## Warum die Engine zunächst regelbasiert ist

Die erste Version verwendet keine freie Textgenerierung als alleinige Planinstanz. Vorteile:

- reproduzierbares Verhalten
- testbare Sicherheitsregeln
- eindeutige Verbindung zur Übungsdatenbank
- nachvollziehbare Equipment- und Beschwerdefilter
- stabile JSON-Struktur für Web und PDF
- einfacher Vergleich verschiedener Engine-Versionen

Später kann ein Sprachmodell für Erklärungen, Coaching-Ton oder Varianten eingesetzt werden. Die harte Safety-, Equipment- und Restriktionsschicht sollte trotzdem deterministisch bleiben.

## Skalierungspfad

### Lokale Entwicklung

- Vite Dev Server
- FastAPI/Uvicorn
- SQLite
- PDF on demand

### Erste öffentlich erreichbare Testversion

- statischer Frontend-Build hinter TLS
- FastAPI als Container/Service
- PostgreSQL
- Datenbankmigrationen
- verwaltete Secrets
- sichere Authentifizierung
- Monitoring und Backups

### Spätere Produktversion

- mehrere Plan-Engine-Versionen
- fachliche Regelverwaltung
- Übungsmedien/CDN
- Kalender- und Wearable-Integration
- Plananpassung anhand absolvierter Einheiten
- Hintergrundjobs für PDF/E-Mail
- Abonnements und Rollenverwaltung
