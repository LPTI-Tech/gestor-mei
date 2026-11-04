@echo off
title GESTOR MEI - Inicializador
echo ===================================================
echo             INICIANDO GESTOR MEI
echo ===================================================
echo.
echo [1/3] Iniciando Servidor Backend (FastAPI :8001)...
start "GESTOR MEI - Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"
ping 127.0.0.1 -n 3 >nul

echo [2/3] Iniciando Servidor Frontend (Vite :5173)...
start "GESTOR MEI - Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"
ping 127.0.0.1 -n 4 >nul

echo [3/3] Abrindo no Google Chrome...
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:5173"
) else (
    start "" "http://localhost:5173"
)

echo.
echo Tudo pronto! O GESTOR MEI foi aberto no navegador.
echo Frontend: http://localhost:5173
echo Swagger Docs: http://localhost:8001/docs
