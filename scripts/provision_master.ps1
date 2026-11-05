# ==============================================================================
# GESTOR MEI - Provisionamento Seguro do Usuário MASTER (PowerShell)
# Sprint Security 1 - Fase 1
# ==============================================================================

$projectRoot = Split-Path -Parent $PSScriptRoot
$venvPython = "$projectRoot\backend\.venv\Scripts\python.exe"

Set-Location "$projectRoot\backend"

if (Test-Path $venvPython) {
    & $venvPython -m app.scripts.provision_master $args
} else {
    python -m app.scripts.provision_master $args
}
