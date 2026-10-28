Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  GESTOR MEI - Iniciando Servidor Backend     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\backend"

$venvPython = "$PSScriptRoot\backend\.venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    Write-Host "Usando ambiente virtual: $venvPython" -ForegroundColor Green
    & $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
} else {
    Write-Host "Ambiente virtual não encontrado. Tentando python global..." -ForegroundColor Yellow
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
}
