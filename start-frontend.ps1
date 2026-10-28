Write-Host "=============================================" -ForegroundColor Green
Write-Host "  GESTOR MEI - Iniciando Servidor Frontend    " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

if (Test-Path "C:\Program Files\nodejs") {
    $env:PATH = "C:\Program Files\nodejs;$env:APPDATA\npm;$env:PATH"
}

Set-Location "$PSScriptRoot\frontend"
npm run dev
