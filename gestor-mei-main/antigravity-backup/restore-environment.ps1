# ==============================================================================
# SCRIPT DE RESTAURAÇÃO AUTOMÁTICA DO AMBIENTE ANTIGRAVITY — GESTOR MEI
# ==============================================================================
# Executar este script em uma nova máquina (ex: computador do trabalho) para
# configurar instantaneamente todas as Skills, regras do GEMINI.md e MCPs.

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  RESTAURAÇÃO DO AMBIENTE ANTIGRAVITY — GESTOR MEI        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = $PSScriptRoot
$backupSkills = "$scriptDir\skills"
$backupConfig = "$scriptDir\config"

$userGemini = "$HOME\.gemini"
$globalSkills = "$userGemini\config\skills"
$globalConfig = "$userGemini\config"

# 1. Configuração Global do Antigravity
Write-Host "[1/4] Configurando diretório global em $globalSkills..." -ForegroundColor Yellow
if (-not (Test-Path $globalSkills)) {
    New-Item -ItemType Directory -Path $globalSkills -Force | Out-Null
}
Copy-Item -Path "$backupSkills\*" -Destination $globalSkills -Recurse -Force
Write-Host "  -> 5 Skills copiadas para a configuração global com sucesso!" -ForegroundColor Green

# 2. Configuração do mcp_config.json global se não existir
$targetMcp = "$globalConfig\mcp_config.json"
if (-not (Test-Path $targetMcp)) {
    Write-Host "[2/4] Criando mcp_config.json global..." -ForegroundColor Yellow
    Copy-Item -Path "$backupConfig\mcp_config.template.json" -Destination $targetMcp -Force
    Write-Host "  -> mcp_config.json criado a partir do template." -ForegroundColor Green
} else {
    Write-Host "[2/4] mcp_config.json já existe em $targetMcp (preservado)." -ForegroundColor Green
}

# 3. Configuração do Workspace Local (.agents/skills)
$workspaceRoot = (Get-Item "$scriptDir\..").FullName
$wsSkills = "$workspaceRoot\.agents\skills"

Write-Host "[3/4] Configurando workspace local em $workspaceRoot..." -ForegroundColor Yellow
if (-not (Test-Path $wsSkills)) {
    New-Item -ItemType Directory -Path $wsSkills -Force | Out-Null
}
Copy-Item -Path "$backupSkills\*" -Destination $wsSkills -Recurse -Force
Copy-Item -Path "$backupConfig\GEMINI.md" -Destination "$workspaceRoot\GEMINI.md" -Force
Write-Host "  -> Workspace .agents/skills e GEMINI.md atualizados com sucesso!" -ForegroundColor Green

# 4. Verificação de subdiretório aninhado (se houver)
$nestedWorkspace = "$workspaceRoot\gestor-mei-main"
if (Test-Path $nestedWorkspace) {
    Write-Host "[4/4] Sincronizando subpasta aninhada $nestedWorkspace..." -ForegroundColor Yellow
    $nestedSkills = "$nestedWorkspace\.agents\skills"
    if (-not (Test-Path $nestedSkills)) {
        New-Item -ItemType Directory -Path $nestedSkills -Force | Out-Null
    }
    Copy-Item -Path "$backupSkills\*" -Destination $nestedSkills -Recurse -Force
    Copy-Item -Path "$backupConfig\GEMINI.md" -Destination "$nestedWorkspace\GEMINI.md" -Force
    Write-Host "  -> Subpasta aninhada sincronizada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[4/4] Subpasta aninhada não encontrada (etapa ignorada)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  AMBIENTE ANTIGRAVITY RESTAURADO COM SUCESSO!            " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Skills ativas:" -ForegroundColor Cyan
Write-Host "  - gestor-mei-core"
Write-Host "  - gestor-mei-ui-system"
Write-Host "  - gestor-mei-rbac"
Write-Host "  - gestor-mei-saas"
Write-Host "  - lpti-brand-guidelines"
Write-Host ""
