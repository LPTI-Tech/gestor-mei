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
| **Google Developer Knowledge** | Plugin Oficial Antigravity | ✅ **Instalado & Ativo** (`google-developer-knowledge` v1.0.2) | Consulta autoritativa e atualizada sobre APIs Google Cloud, Gemini, Firebase, Android, Antigravity e Web.dev standards. |
| **GitHub** | Remote MCP Oficial (GitHub Copilot) | ✅ **Conectado & Validado** (`https://api.githubcopilot.com/mcp/`) | Automação de PRs, issues, branches e commits diretamente na conta `LPTI-Tech` e repositório `LPTI-Tech/gestor-mei`. |
| **Chrome DevTools** | Servidor Local Stdio (`chrome-devtools-mcp`) | ✅ **Instalado, Ativo & Validado** (`chrome-devtools-mcp` v1.12.0) | Inspeção visual de DOM/CSS em tempo real, auditorias de acessibilidade (WCAG), métricas Core Web Vitals (LCP) e Lighthouse. |
| **Browser (Automação)** | Plugin Oficial ou MCP Stdio (Puppeteer) | ✅ **Instalado** (`browse` Browserbase) | Navegação end-to-end, testes automatizados de fluxos (PDV, Delivery, Login) e capturas de tela. |

#### 3.1.1 Detalhamento: Google Developer Knowledge MCP
- **Identificador de Catálogo:** `antigravity-plugins-official/plugin/google-developer-knowledge`
- **Diretório Local:** `%USERPROFILE%\.gemini\config\plugins\google-developer-knowledge\`
- **Endpoint do Servidor:** `https://developerknowledge.googleapis.com/mcp` (Streamable HTTP)
- **Ferramentas MCP Expostas:**
  1. `answer_query`: Síntese conceitual de arquitetura e guias fundamentados na documentação oficial.
  2. `search_documents`: Busca granular de comandos CLI, flags de configuração e parâmetros de APIs.
  3. `get_documents`: Recuperação do conteúdo Markdown integral de páginas documentais.
- **Skill Associada:** `retrieving-developer-knowledge` (ativa no ambiente).
- **Escopo e Cobertura:** Cobre oficialmente Google Cloud, Gemini AI, Antigravity, Firebase, Android, Flutter, Chrome e padrões Web (`web.dev`). Para frameworks abertos de terceiros (React 18, Vite, Material UI v5, FastAPI, SQLAlchemy e PostgreSQL), a consulta de documentação é complementada em tempo real via `search_web` oficial (ex: `react.dev`, `mui.com`, `fastapi.tiangolo.com`).
- **Autenticação:** O servidor aceita Google Application Default Credentials (`gcloud auth application-default login`) ou API Key do Google Cloud (`X-Goog-Api-Key` ou variável de ambiente `DEVELOPERKNOWLEDGE_API_KEY`).

#### 3.1.2 Detalhamento: Chrome DevTools MCP (Oficial)
- **Identificador:** `chrome-devtools` (`chrome-devtools-mcp` v1.12.0 da equipe do Google Chrome)
- **Plugin Oficial Associado:** `antigravity-plugins-official/plugin/chrome-devtools-plugin`
- **Skills Carregadas:** `chrome-devtools`, `a11y-debugging`, `debug-optimize-lcp`, `memory-leak-debugging`, `cookie-debugging` e `troubleshooting`.
- **Comando de Execução:** `cmd.exe /c npx -y chrome-devtools-mcp@latest --headless=false`
- **Ferramentas Expostas (32 ferramentas):** `list_pages`, `navigate_page`, `new_page`, `take_snapshot`, `evaluate_script`, `get_css_styles`, `lighthouse_audit`, `performance_analyze_insight`, `take_heapsnapshot`, `take_screenshot`, `click`, `fill`, etc.
- **Autenticação:** Nenhuma necessária (comunicação local segura via Chrome DevTools Protocol / CDP).
- **Validação Operacional:** Validado com sucesso conectando ao Google Chrome Stable (v156), navegando na porta `http://localhost:5173`, extraindo snapshot completo da árvore de acessibilidade do DOM e inspecionando a tela de Login/Dashboard.

### 3.2 Configuração do `mcp_config.json`

O arquivo global está localizado em:
`%USERPROFILE%\.gemini\config\mcp_config.json`

Estrutura ativa e homologada:

```json
{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer github_pat_..."
      }
    },
    "chrome-devtools": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx",
        "-y",
        "chrome-devtools-mcp@latest",
        "--headless=false"
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

### Passo 3: Configurar Plugins e Chaves de MCP (Opcional)
1. **Google Developer Knowledge:**
   No Antigravity, acesse *Customizations > Marketplace* e confirme a presença do plugin **Google Developer Knowledge** (`antigravity-plugins-official/plugin/google-developer-knowledge`). Caso deseje autenticação direta no GCP, execute `gcloud auth application-default login` ou exporte a variável `DEVELOPERKNOWLEDGE_API_KEY`.
2. **GitHub MCP:**
   Se for utilizar o MCP do GitHub, abra o arquivo `%USERPROFILE%\.gemini\config\mcp_config.json`, insira seu token em `GITHUB_PERSONAL_ACCESS_TOKEN` e reinicie o Antigravity.


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
