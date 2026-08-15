# Frontend

React-/TypeScript-Oberfläche des Full-Stack-MVP.

Enthalten sind:

- Landingpage
- siebenstufiger Trainings-Check
- lokaler Profilentwurf
- Registrierung und Anmeldung
- persönliches Dashboard
- Planbibliothek
- formatierte Wochen- und Einheitenansicht
- PDF-Download über die Backend-API

## Lokal starten

Vom Ordner `frontend` aus:

```bash
npm install
cp .env.example .env   # Windows: Copy-Item .env.example .env
npm run dev
```

Danach `http://127.0.0.1:5173` öffnen.

Das Backend muss parallel auf `http://127.0.0.1:8000` laufen.

## Befehle

```bash
npm run dev        # Entwicklungsserver
npm run typecheck  # TypeScript-Prüfung
npm run build      # Produktions-Build
npm run preview    # erzeugten Build lokal ansehen
```

## Zentrale Dateien

- `src/App.tsx` – Routing und Verknüpfung des gesamten Ablaufs
- `src/api/client.ts` – Auth-, Profil-, Plan- und PDF-Aufrufe
- `src/api/types.ts` – Plan-Typen
- `src/components/Onboarding.tsx` – Trainings-Check
- `src/components/AuthPage.tsx` – Konto
- `src/components/DashboardPage.tsx` – gespeicherte Pläne
- `src/components/PlanPage.tsx` – Planansicht
- `training-profile.schema.json` – Profilformat

Die vollständige Installations- und Testanleitung liegt eine Ebene höher in `../README.md`.
