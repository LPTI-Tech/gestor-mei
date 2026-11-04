# Configuração e Padronização do Ambiente Antigravity — Gestor MEI

> **Produto:** Gestor MEI  
> **Desenvolvedora:** LPTI Tech  
> **Status do Ambiente:** Homologado & Consolidado  
> **Última Auditoria:** Novembro/2026  

---

## 1. Visão Geral

Este documento estabelece o guia oficial de padronização, governança e replicação do ambiente de desenvolvimento **Google Antigravity** para o projeto **Gestor MEI**.

O objetivo primordial é **eliminar a perda de contexto** entre diferentes sessões de trabalho e viabilizar a **replicação imediata** em diferentes máquinas (computador pessoal, computador do trabalho ou ambientes de equipe), garantindo que as regras de governança, o isolamento RBAC, o sistema visual executivo e o licenciamento SaaS permaneçam invioláveis e ativos em 100% das interações.

---

## 2. Auditoria das Skills Instaladas

O ambiente do Gestor MEI possui 5 skills especializadas. Todas foram auditadas quanto à sua estrutura, sintaxe YAML e capacidade de descoberta pelo Antigravity:

| Skill | Escopo Principal | Descoberta | Estrutura | Redundância / Precedência |
| :--- | :--- | :--- | :--- | :--- |
| `gestor-mei-core` | Arquitetura oficial, regras de negócio inegociáveis, catálogo dos 12 módulos homologados e roadmap. | Automática | Completa (`SKILL.md`, `examples`, `references`, `resources`) | Presente no Workspace e no Global. O Workspace tem prioridade (Precedência 1). |
| `gestor-mei-ui-system` | Diretrizes de UI/UX executivo SaaS Premium (Stripe/Asaas/Conta Azul), design tokens e proibição de layouts genéricos. | Automática | Completa (`SKILL.md`, `examples`, `references`, `resources`) | Presente no Workspace e no Global. O Workspace tem prioridade (Precedência 1). |
| `gestor-mei-rbac` | Blindagem permanente de perfis (`MASTER`, `OWNER`, `CONSULTOR`, `OPERATOR`), multi-tenant (`empresa_id`) e bloqueio financeiro. | Automática | Completa (`SKILL.md`, `examples`, `references`, `resources`) | Presente no Workspace e no Global. O Workspace tem prioridade (Precedência 1). |
| `gestor-mei-saas` | Especificação canônica da Sprint 9 (Planos START, DELIVERY PRO, FULL MEI, status, grace period e suspensão). | Automática | Completa (`SKILL.md`, `examples`, `references`, `resources`) | Presente no Workspace e no Global. O Workspace tem prioridade (Precedência 1). |
| `lpti-brand-guidelines` | Proteção da identidade visual, hierarquia de marca (LPTI Tech + Gestor MEI) e paleta cromática oficial. | Automática | Completa (`SKILL.md`, `examples`, `references`, `resources`) | Presente no Workspace e no Global. O Workspace tem prioridade (Precedência 1). |

### 2.1 Análise de Integridade e Descoberta

- **Workspace Level (`.agents/skills/`):** O Antigravity descobre as skills percorrendo do diretório atual até a raiz do repositório. Por estarem versionadas no repositório, qualquer clone carrega o conjunto completo de skills imediatamente.
- **Global Level (`~/.gemini/config/skills/`):** As 5 skills também foram instaladas globalmente, permitindo que sessões abertas fora da pasta raiz do projeto também tenham acesso ao contexto.
- **Regras Sempre Ativas (`GEMINI.md`):** O arquivo `GEMINI.md` na raiz do repositório atua como regra de governança `always_on`. Ele sintetiza as diretrizes fundamentais das 5 skills para garantir que, mesmo antes da ativação sob demanda de uma skill, o agente jamais viole as regras de negócio ou o isolamento financeiro.

---

## 3. Auditoria de MCPs (Model Context Protocol)

O protocolo MCP conecta o agente Antigravity a ferramentas e fontes de dados externas. O suporte no Antigravity aceita dois transportes:
1. **Stdio (Local):** Executáveis de linha de comando (`npx`, `python`, `node`, binários).
2. **Streamable HTTP (Remoto):** Endpoints HTTP(S) conformes com a especificação moderna MCP (geralmente sob rota `/mcp`).

### 3.1 Status dos MCPs Solicitados

| MCP Solicitado | Mecanismo Recomendado | Status de Instalação | Finalidade no Gestor MEI |
| :--- | :--- | :--- | :--- |
| **Google Developer Knowledge** | Plugin Oficial Antigravity | Disponível via Plugin (`google-developer-knowledge`) | Consulta autoritativa e atualizada sobre APIs Google Cloud, Gemini, Firebase e Web standards. |
| **GitHub** | MCP Server Stdio via `npx` | Configurável no `mcp_config.json` | Automação de PRs, issues e branches via GitHub API com token PAT. (*Nota: Git CLI local v2.56 já está disponível*). |
| **Chrome DevTools** | Plugin Oficial Antigravity | Disponível via Plugin (`chrome-devtools-plugin`) | Depuração de frontend, inspeção de console, rede e profiling de performance do React/MUI. |
| **Browser (Automação)** | Plugin Oficial ou MCP Stdio (Puppeteer) | Disponível via Plugin (`browse`) ou MCP Puppeteer | Navegação end-to-end, testes automatizados de fluxos (PDV, Delivery, Login) e capturas de tela. |

### 3.2 Configuração do `mcp_config.json`

O arquivo global está localizado em:
`%USERPROFILE%\.gemini\config\mcp_config.json`

Para ativar o MCP do GitHub e o MCP Puppeteer Browser no Windows, utilize a estrutura compatível abaixo:

```json
{
  "mcpServers": {
    "github": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx",
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "SEU_TOKEN_GITHUB_AQUI"
      }
    },
    "puppeteer-browser": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx",
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ]
    }
  }
}
```

> [!TIP]
> No Windows, o uso de `cmd.exe /c npx` evita restrições de política de execução do PowerShell (`PSSecurityException`) em scripts `.ps1`.

---

## 4. Estrutura de Pastas e Caminhos de Governança

```text
gestor-mei-main/
├── .agents/
│   └── skills/
│       ├── gestor-mei-core/          # Regras canônicas e módulos homologados
│       ├── gestor-mei-rbac/          # Blindagem de papéis e restrição OPERATOR
│       ├── gestor-mei-saas/          # Especificação de licenciamento Sprint 9
│       ├── gestor-mei-ui-system/     # Design system SaaS premium
│       └── lpti-brand-guidelines/    # Diretrizes de marca e créditos LPTI Tech
├── antigravity-backup/               # Backup autocontido para replicação
│   ├── config/                       # Cópias de GEMINI.md e templates MCP
│   ├── skills/                       # Cópias das 5 skills
│   ├── restore-environment.bat       # Script Windows para restauração em 1 clique
│   └── restore-environment.ps1       # Script PowerShell com bypass de execução
├── docs/
│   └── ANTIGRAVITY_SETUP.md          # Esta documentação oficial
├── GEMINI.md                         # Regras pátrias sempre ativas no workspace
└── mcp_config.template.json          # Template padrão de servidores MCP
```

---

## 5. Procedimento de Replicação em Outra Máquina (Trabalho)

Para configurar exatamente o mesmo ambiente em outro computador sem perda de contexto:

### Passo 1: Obter o Projeto
Clone o repositório ou copie a pasta do projeto `gestor-mei-main` para a máquina de destino.

### Passo 2: Executar a Restauração em 1 Clique
No Windows Explorer, navegue até a pasta `antigravity-backup` e dê dois cliques em:
👉 **`restore-environment.bat`**

O script executará automaticamente as seguintes tarefas:
1. Cria a pasta `~/.gemini/config/skills` caso não exista.
2. Copia todas as 5 skills para o diretório global do usuário.
3. Cria o `mcp_config.json` inicial em `~/.gemini/config/mcp_config.json` se ainda não houver um.
4. Sincroniza o diretório `.agents/skills` e o `GEMINI.md` no workspace.

### Passo 3: Configurar Chaves de MCP (Opcional)
Se for utilizar o MCP do GitHub:
1. Abra o arquivo `%USERPROFILE%\.gemini\config\mcp_config.json`.
2. Insira seu token de acesso pessoal em `GITHUB_PERSONAL_ACCESS_TOKEN`.
3. Reinicie o Antigravity.

---

## 6. Checklist de Reinstalação e Verificação Rápida

Ao abrir o Antigravity no novo computador, faça esta validação rápida:

- [ ] **Descoberta de Skills:** Verifique se as 5 skills aparecem na lista de skills disponíveis no chat ou no painel de configurações.
- [ ] **Leitura de Regras:** Ao iniciar uma conversa, o agente deve citar as diretrizes do `GEMINI.md` (RBAC, LPTI Tech, Gestor MEI).
- [ ] **Node.js e Git:** Execute `node -v` e `git -v` para certificar-se de que os runtimes básicos estão no PATH.
- [ ] **MCP Config:** Certifique-se de que o arquivo `%USERPROFILE%\.gemini\config\mcp_config.json` existe e está em formato JSON válido.
- [ ] **Módulos Intocados:** Certifique-se de que nenhum código do frontend (`frontend/src`) ou backend (`backend/app`) foi alterado durante a configuração de ambiente.

---
*Documento homologado pela LPTI Tech para governança do Gestor MEI.*
