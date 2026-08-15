#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

printf '\n[1/2] Backend vorbereiten\n'
cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements-dev.txt
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "backend/.env wurde angelegt."
fi

printf '\n[2/2] Frontend vorbereiten\n'
cd "$ROOT_DIR/frontend"
npm install
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "frontend/.env wurde angelegt."
fi

printf '\nSetup abgeschlossen.\n'
printf 'Backend: cd backend && source .venv/bin/activate && python run.py\n'
printf 'Frontend: cd frontend && npm run dev\n\n'
