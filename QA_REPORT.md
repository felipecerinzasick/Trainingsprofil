# QA-Bericht

Stand: 15.08.2026

## Backend

Ausgeführt:

```text
PYTHONPATH=. pytest -q
```

Ergebnis:

```text
10 passed
```

Abgedeckte Szenarien:

- Registrierung und Bearer-Authentifizierung
- geschützte Plan-Endpunkte
- Trainingsprofil speichern und laden
- Plan erzeugen, speichern, öffnen, auflisten und löschen
- PDF über die authentifizierte API laden
- Marathon-Wochenstruktur und Entlastung
- Triathlon mit Schwimmen, Radfahren, Laufen, Kraft und Koppeleinheit
- Trailrunning-spezifische Einheiten
- Equipment-Subset-Prüfung
- Schulterrestriktion
- direkte Armübungen bei `upper_arm + avoid` ausschliessen
- strukturierter Safety-Block bei ungeklärten Red Flags
- Plan-JSON gegen das veröffentlichte JSON-Schema validieren

Zusätzlich wurde die laufende FastAPI-Anwendung mit einem temporären SQLite-Datensatz gestartet und der Health-Endpunkt erfolgreich über HTTP aufgerufen.

## Plan-JSON

Beide mitgelieferten Beispielpläne wurden gegen `docs/training-plan.schema.json` validiert:

```text
beispiel-trainingsplan-marathon.json: OK
beispiel-trainingsplan-aktive-seniorin.json: OK
```

## PDF

Geprüfte Beispiel-PDFs:

- Marathon: 14 Seiten
- aktive Seniorin: 14 Seiten

PDF-Preflight:

- öffnbar
- nicht verschlüsselt
- kein XFA
- textbasiert, nicht gescannt

Die gerenderten Cover-, Tabellen- und Schlussseiten wurden visuell auf Lesbarkeit, sichtbare Tabellenüberschriften und abgeschnittene Inhalte geprüft.

Zusätzlicher Stresstest:

- 16-Wochen-Marathonplan
- 80 Einheiten
- 50 PDF-Seiten
- PDF erfolgreich erzeugt, geöffnet und gerendert
- Schlussseite ohne abgeschnittene Inhalte

## Frontend

Die TypeScript-Quellen wurden mit `tsc -b` statisch geprüft. Dabei wurden temporäre lokale Deklarations-Stubs für React und Vite verwendet, weil in der isolierten Erstellungsumgebung keine npm-Pakete aus dem Registry heruntergeladen werden konnten. Die Stubs wurden anschliessend entfernt und sind nicht Teil des Projekts.

Nicht in dieser Umgebung abgeschlossen:

- reales `npm install`
- Vite-Produktions-Build mit den echten npm-Paketen
- Browser-End-to-End-Test der neu verbundenen Konto-, Dashboard- und Planansicht

Diese drei Prüfungen sind deshalb die ersten Schritte auf dem Zielcomputer:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Danach den Ablauf aus `docs/LOCAL_ACCEPTANCE_TEST.md` durchführen.
