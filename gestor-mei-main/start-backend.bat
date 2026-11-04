@echo off
title GESTOR MEI - Backend
cd /d "%~dp0backend"
echo Iniciando Servidor Backend na porta 8001...
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

