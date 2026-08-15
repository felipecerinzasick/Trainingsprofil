# Trainingsprofil – Full-Stack MVP

Dieses Projekt verbindet den bestehenden **Trainings-Check** mit einer vollständigen lokalen Anwendung:

- responsive React-Oberfläche für Desktop und Smartphone
- Registrierung und Anmeldung
- gespeichertes Trainingsprofil pro Benutzerkonto
- regelbasierte, reproduzierbare Trainingsplan-Engine
- Filterung anhand von Equipment, Beschwerden und Bewegungsrestriktionen
- gespeicherte Trainingspläne im persönlichen Dashboard
- formatierte Planansicht im Browser
- PDF-Export jedes Plans
- SQLite-Datenbank für die lokale Entwicklung
- automatisierte Backend-Tests und zwei vollständige Beispielpläne

> **Am einfachsten:** Verwende diesen gesamten Ordner als neues Projektverzeichnis. Er enthält bereits das aktualisierte Frontend und die Übungsdatenbank. Du musst die zuvor gespeicherten Einzeldateien nicht manuell zusammenführen.

## Was bereits funktioniert

Der lokale Ablauf ist vollständig verbunden:

1. Eine Person füllt den Trainings-Check aus.
2. Sie erstellt ein Konto oder meldet sich an.
3. Das Profil wird serverseitig gespeichert.
4. Die Sicherheitslogik prüft Red Flags und Einschränkungen.
5. Die Engine erzeugt einen 4-, 8-, 12- oder 16-Wochen-Plan.
6. Der Plan wird im Benutzerkonto gespeichert.
7. Der Plan kann online in der lokal laufenden Web-App geöffnet und als PDF heruntergeladen werden.

„Online“ bedeutet im aktuellen Entwicklungsstand: über den Browser auf deinem Computer. Für einen öffentlich erreichbaren Dienst muss das Projekt später auf einen Server beziehungsweise eine Cloud-Plattform bereitgestellt werden. Die dafür noch erforderlichen Schritte stehen in [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md).

---

# 1. Voraussetzungen

Installiere auf deinem Computer:

- **Visual Studio Code**
- **Python 3.11 oder neuer**
- **Node.js 22.12 oder neuer**
- Git ist hilfreich, aber für den ersten lokalen Test nicht zwingend erforderlich.

Prüfe im Terminal:

```bash
python3 --version
node --version
npm --version
```

Unter Windows kann der Python-Befehl stattdessen `py` lauten:

```powershell
py --version
```

## Empfohlene VS-Code-Erweiterungen

Beim Öffnen des Projekts schlägt VS Code die Erweiterungen aus `.vscode/extensions.json` vor:

- Python
- Python Debugger
- Ruff
- Prettier

---

# 2. Projekt in VS Code öffnen

Entpacke den ZIP-Ordner beispielsweise auf deinen Desktop. Öffne danach **den Ordner `trainingsplan-fullstack` selbst** in VS Code.

Auf macOS oder Linux:

```bash
cd ~/Desktop/trainingsplan-fullstack
code .
```

Unter Windows PowerShell, falls der Ordner auf dem Desktop liegt:

```powershell
cd "$HOME\Desktop\trainingsplan-fullstack"
code .
```

Alternativ: **VS Code → File/Datei → Open Folder/Ordner öffnen**.

---

# 3. Einmalige Installation

## Variante A – über die mitgelieferten Setup-Skripte

### macOS / Linux

Öffne in VS Code ein Terminal und führe aus:

```bash
bash scripts/setup.sh
```

### Windows PowerShell

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup.ps1
```

Nach dem Setup in VS Code einmal `Cmd/Ctrl + Shift + P` öffnen, **Python: Select Interpreter** wählen und den Interpreter aus `backend/.venv` auswählen. Das ist insbesondere für den Debug-Button wichtig.

Die Skripte:

- erstellen `backend/.venv`
- installieren die Python-Abhängigkeiten
- installieren die Frontend-Abhängigkeiten mit `npm install`
- legen lokale `.env`-Dateien aus den Beispielen an, falls noch keine bestehen

## Variante B – manuell

### Backend

macOS / Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Windows PowerShell:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

### Frontend

In einem zweiten Terminal:

```bash
cd frontend
npm install
```

macOS / Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

---

# 4. Anwendung starten

Du brauchst zwei laufende Terminals.

## Terminal 1 – Backend/API

macOS / Linux:

```bash
cd backend
source .venv/bin/activate
python run.py
```

Windows PowerShell:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py
```

Das Backend läuft danach unter:

- API: `http://127.0.0.1:8000`
- interaktive API-Dokumentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

## Terminal 2 – Frontend

```bash
cd frontend
npm run dev
```

Öffne danach:

```text
http://127.0.0.1:5173
```

## Starten über VS Code Tasks

Öffne die Befehlspalette mit `Cmd/Ctrl + Shift + P` und wähle:

```text
Tasks: Run Task
```

Verfügbare Aufgaben:

- `Setup: complete project`
- `Backend: run API`
- `Frontend: run Vite`
- `Dev: run frontend + backend`
- `Backend: tests`
- `Frontend: typecheck`
- `Frontend: production build`
- `Project: run all checks`

---

# 5. Erster Funktionstest

Führe den kompletten Weg einmal selbst durch:

1. Öffne die Landingpage.
2. Starte den Trainings-Check.
3. Wähle ein Ziel, zum Beispiel Marathon, allgemeine Kraft oder gesundes Älterwerden.
4. Wähle Trainingstage, Dauer, Ort und Equipment.
5. Erfasse testweise eine Einschränkung, zum Beispiel Schulterbeschwerden mit der Strategie „vermeiden“.
6. Schliesse das Profil ab.
7. Erstelle ein neues Konto.
8. Wähle einen 4-Wochen-Plan für den ersten Test.
9. Öffne den Plan im Dashboard.
10. Wechsle zwischen den Wochen und öffne einzelne Einheiten.
11. Lade den Plan als PDF herunter.
12. Melde dich ab und wieder an. Profil und Plan sollten weiterhin vorhanden sein.

## Test des Sicherheitsblocks

Erfasse testweise eine aktive Red Flag wie Brustschmerz, ungeklärten Schwindel oder Bewusstseinsverlust. Die Engine muss die automatische Planerstellung mit dem Code `MEDICAL_CLEARANCE_REQUIRED` blockieren.

Danach die Testangabe wieder entfernen.

---

# 6. Automatisierte Tests

## Backend

macOS / Linux:

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Windows PowerShell:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

Die Tests decken unter anderem ab:

- Registrierung und geschützte Endpunkte
- Speichern des Trainingsprofils
- Planerstellung und Persistenz
- PDF-Download
- Equipment-Filter
- Schulterrestriktion
- Marathon-Progression
- Triathlon-Mix
- Trailrunning-spezifische Einheiten
- Blockierung bei medizinischen Red Flags

## Frontend

```bash
cd frontend
npm run typecheck
npm run build
```

---

# 7. Daten und Zurücksetzen

Standardmässig liegt die lokale SQLite-Datenbank hier:

```text
backend/data/trainingsplan.db
```

Zum vollständigen Zurücksetzen der lokalen Benutzer, Profile und Pläne:

1. Backend stoppen.
2. Datei `backend/data/trainingsplan.db` löschen.
3. Backend neu starten.

Die Tabellen werden automatisch neu erstellt.

Der Browser speichert zusätzlich einen lokalen Profilentwurf. Diesen kannst du über die Reset-Funktion in der App oder über die Browser-Entwicklertools unter Local Storage löschen.

---

# 8. Konfiguration

## Backend: `backend/.env`

```dotenv
TRAINING_ENVIRONMENT=development
TRAINING_DATABASE_URL=sqlite:///./data/trainingsplan.db
TRAINING_JWT_SECRET_KEY=replace-with-a-long-random-secret-before-deployment
TRAINING_ACCESS_TOKEN_EXPIRE_MINUTES=720
TRAINING_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Für den lokalen Test funktionieren die Defaults. Vor jeder echten Bereitstellung muss mindestens der JWT-Schlüssel ersetzt werden.

Einen starken Schlüssel kannst du beispielsweise erzeugen mit:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

## Frontend: `frontend/.env`

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
```

---

# 9. Wie die Planlogik arbeitet

Die Engine ist bewusst **deterministisch und regelbasiert**. Dieselben Eingaben ergeben strukturell denselben Plan. Der Kernablauf ist:

```text
validiertes Trainingsprofil
        ↓
Sicherheitsprüfung / Red-Flag-Gate
        ↓
Beschwerden → blockierte oder anzupassende Bewegungsmuster
        ↓
verfügbares Equipment einschließlich Equipment-Implikationen
        ↓
Zieltyp, Sportfokus, Erfahrung, Alter, Zeit und Trainingstage
        ↓
Wochenstruktur und Einheiten-Blueprints
        ↓
Ranking passender Übungen aus 1'396 Varianten
        ↓
Sätze, Wiederholungen, RPE, Pausen und Progression
        ↓
Plan-JSON + Datenbankeintrag + PDF
```

Die relevante Dokumentation findest du in:

- [`docs/PLAN_ENGINE.md`](docs/PLAN_ENGINE.md)
- [`docs/API.md`](docs/API.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/training-plan.schema.json`](docs/training-plan.schema.json)
- [`QA_REPORT.md`](QA_REPORT.md)

---

# 10. Wichtige Grenzen dieses MVP

Der aktuelle Stand ist für **lokale Entwicklung und Produkttests**, nicht für den öffentlichen Betrieb mit echten Gesundheitsdaten.

Noch nicht produktionsreif sind unter anderem:

- keine E-Mail-Verifizierung
- kein Passwort-zurücksetzen-Prozess
- Zugriffstoken derzeit im Browser-Local-Storage
- keine Refresh-Token oder aktive Sitzungsverwaltung
- SQLite statt PostgreSQL
- keine Datenbankmigrationen
- keine produktive Datenschutzerklärung oder versionierte Einwilligung
- keine administrative Oberfläche
- keine Abrechnung
- keine professionelle sportmedizinische Validierung aller Regeln
- keine öffentliche Bereitstellung, Domain oder TLS-Konfiguration

Vor einer öffentlichen Freischaltung unbedingt [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) abarbeiten.

---

# 11. Projektstruktur

```text
trainingsplan-fullstack/
├── .vscode/                    VS-Code-Tasks, Debug-Konfiguration, Erweiterungen
├── backend/
│   ├── app/
│   │   ├── api/                Auth-, Profil- und Plan-Endpunkte
│   │   ├── data/               deutsche Übungsdatenbank
│   │   ├── schemas/            Pydantic-Eingabe-/Ausgabemodelle
│   │   ├── services/           Planlogik, Restriktionen, Safety und PDF
│   │   ├── database.py         SQLAlchemy-Verbindung
│   │   ├── models.py           Benutzer-, Profil- und Planmodelle
│   │   └── main.py             FastAPI-Anwendung
│   ├── scripts/                Erzeugung der Beispielpläne
│   ├── tests/                  automatisierte Tests
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── api/                API-Client und Plan-Typen
│   │   ├── components/         Landingpage, Onboarding, Konto, Dashboard, Plan
│   │   ├── data/               Auswahloptionen und Equipment
│   │   ├── utils/              lokale Profilentwürfe
│   │   └── App.tsx
│   ├── training-profile.schema.json
│   └── package.json
├── sample-output/              zwei generierte JSON-/PDF-Beispielpläne
├── docs/                       technische Dokumentation und Plan-Schema
├── scripts/                    Setup- und Prüfskripte
├── ARCHITECTURE.md
├── PRODUCTION_CHECKLIST.md
└── README.md
```
