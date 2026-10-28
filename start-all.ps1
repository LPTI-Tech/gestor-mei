Write-Host "Iniciando GESTOR MEI (Backend + Frontend)..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\start-backend.ps1"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\start-frontend.ps1"

Write-Host "Serviços iniciados com sucesso!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API / Swagger: http://localhost:8001/docs" -ForegroundColor Yellow
