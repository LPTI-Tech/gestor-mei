Write-Host "Iniciando GESTOR MEI (Backend + Frontend)..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "$PSScriptRoot\start-backend.ps1"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "$PSScriptRoot\start-frontend.ps1"

Write-Host "Aguardando inicialização dos serviços..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Abre no Google Chrome
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (Test-Path $chromePath) {
    Start-Process $chromePath -ArgumentList "http://localhost:5173"
} else {
    Start-Process "http://localhost:5173"
}

Write-Host "Serviços iniciados com sucesso!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API / Swagger: http://localhost:8001/docs" -ForegroundColor Yellow
