@echo off
title Restaurador Antigravity — Gestor MEI
echo ==========================================================
echo   RESTAURACAO DO AMBIENTE ANTIGRAVITY — GESTOR MEI
echo ==========================================================
echo.
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0restore-environment.ps1"
echo.
pause
