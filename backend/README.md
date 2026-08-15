# Backend

FastAPI-Backend für Benutzerkonten, Trainingsprofile, Planerstellung, Speicherung und PDF-Export.

## Lokal starten

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
python run.py
```

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
python run.py
```

API-Dokumentation:

```text
http://127.0.0.1:8000/docs
```

## Tests

```bash
pytest -q
```

## Wichtige Module

- `app/services/plan_engine.py` – Wochenstruktur und Gesamtplan
- `app/services/session_builders.py` – konkrete Trainingseinheiten
- `app/services/exercise_catalog.py` – Equipment- und Übungsfilter
- `app/services/restrictions.py` – Beschwerden und Anpassungen
- `app/services/safety.py` – Red-Flag-Gate
- `app/services/pdf_renderer.py` – PDF

Die vollständige Dokumentation liegt in `../README.md` und `../docs/`.
