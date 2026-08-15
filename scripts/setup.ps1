$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "`n[1/2] Backend vorbereiten" -ForegroundColor Cyan
Set-Location (Join-Path $Root "backend")
py -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "backend/.env wurde angelegt."
}

Write-Host "`n[2/2] Frontend vorbereiten" -ForegroundColor Cyan
Set-Location (Join-Path $Root "frontend")
npm install
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "frontend/.env wurde angelegt."
}

Write-Host "`nSetup abgeschlossen." -ForegroundColor Green
Write-Host "Backend: cd backend; .\.venv\Scripts\Activate.ps1; python run.py"
Write-Host "Frontend: cd frontend; npm run dev`n"
