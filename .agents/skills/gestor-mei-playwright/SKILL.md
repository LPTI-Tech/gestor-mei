---
name: gestor-mei-playwright
description: >-
  Automação e homologação autônoma do Gestor MEI utilizando Playwright MCP.
  Ative esta skill sempre que o usuário solicitar testes de jornadas, validação de fluxos,
  testes de login, navegação autônoma, inspeção de telas, validação de RBAC multi-tenant
  ou verificação de integridade sem necessidade de escrita manual de scripts .spec.ts.
---

# Gestor MEI — Playwright MCP Autonomous Testing Skill

Esta skill capacita o agente **Antigravity** a executar navegações autônomas, testes E2E, inspeção de acessibilidade e auditorias no **Gestor MEI** utilizando o servidor oficial **Playwright MCP** (`@playwright/mcp`), eliminando completamente a dependência de scripts manuais `.spec.ts`.

---

## 🚀 1. Arquitetura da Solução

O ecossistema de testes autônomos opera em 3 camadas integradas:

```
+-------------------------------------------------------------+
|                 Antigravity Assistant (AI)                  |
+-------------------------------------------------------------+
                             |
                             v
+-------------------------------------------------------------+
|       Motor Playwright MCP (scripts/playwright_mcp_engine.py)|
|        - Protocolo JSON-RPC 2.0 via Stdio                    |
|        - Leitura Segura de Credenciais (.env.test)           |
|        - Captura de Screenshots & Snapshots de Acessibilidade|
+-------------------------------------------------------------+
                             |
                             v
+-------------------------------------------------------------+
|         Servidor Playwright MCP (@playwright/mcp)            |
|       - Chromium / Headless Shell em ms-playwright          |
|       - Execução em http://localhost:5173                   |
|       - Backend API em http://localhost:8001                |
+-------------------------------------------------------------+
```

---

## 🔐 2. Governança de Credenciais & Segredos

- As credenciais de teste são lidas **exclusivamente** de `.env.test` na raiz do projeto.
- `.env.test` é ignorado no versionamento git via `.gitignore` (`.env*`).
- O template padrão com os campos necessários está documentado em `.env.test.example`.
- **Nunca insira senhas ou tokens hardcoded em scripts ou prompts.**

### Variáveis Padrão:
```ini
TEST_BASE_URL=http://localhost:5173
TEST_API_URL=http://localhost:8001
TEST_MASTER_EMAIL=master@lptitech.com.br
TEST_MASTER_PASSWORD=master123
TEST_OWNER_EMAIL=admin@gestormei.com.br
TEST_OWNER_PASSWORD=admin123
TEST_OPERATOR_EMAIL=operador@gestormei.com.br
TEST_OPERATOR_PASSWORD=operador123
TEST_CONSULTOR_EMAIL=consultor@lptitech.com.br
TEST_CONSULTOR_PASSWORD=consultor123
```

---

## 🧪 3. Cenários Oficiais Homologados

O motor possui 6 cenários oficiais pré-construídos e validados:

1. **CENÁRIO 01 — MASTER Login:** Autenticação do superadministrador global (`master@lptitech.com.br`), verificação da identidade `Plataforma MASTER` e acesso irrestrito.
2. **CENÁRIO 02 — MASTER → DR Restaurante → Modo Suporte LPTI:** Navegação pelo Painel do Consultor (`/consultor`), localização do cliente `DR Restaurante` e acionamento do `Diagnóstico Consultivo`.
3. **CENÁRIO 03 — MASTER → Criar Empresa + OWNER:** Provisionamento de nova empresa cliente e de seu respectivo proprietário titular (`OWNER`), garantindo isolamento por `empresa_id`.
4. **CENÁRIO 04 — OWNER Login:** Autenticação do titular MEI (`admin@gestormei.com.br`), validação do perfil `Proprietário (OWNER)` e visualização completa dos 12 módulos homologados.
5. **CENÁRIO 05 — OWNER → Cadastro de Produto:** Acesso a `/produtos`, abertura do modal "Novo Produto / Serviço", preenchimento de precificação (Preço de Venda e Custo) e estoque inicial (60 un), validação da persistência no catálogo.
6. **CENÁRIO 06 — Produto → Venda → Baixa de Estoque:** Acesso ao PDV (`/vendas`), inserção de item no carrinho, finalização da venda e conferência da movimentação refletida no módulo de Estoque (`/estoque`).

---

## 💻 4. Como Executar Testes Autonomamente

O agente pode acionar o motor de execução via linha de comando ou chamadas programáticas:

### Execução de Todos os Cenários:
```bash
python scripts/playwright_mcp_engine.py --all
```

### Execução de Cenário Específico (1 a 6):
```bash
python scripts/playwright_mcp_engine.py --scenario 1
python scripts/playwright_mcp_engine.py --scenario 2
python scripts/playwright_mcp_engine.py --scenario 3
python scripts/playwright_mcp_engine.py --scenario 4
python scripts/playwright_mcp_engine.py --scenario 5
python scripts/playwright_mcp_engine.py --scenario 6
```

### Execução em Modo Headless (Background):
```bash
python scripts/playwright_mcp_engine.py --all --headless
```

---

## 📸 5. Evidências e Auditoria

Todas as execuções geram automaticamente screenshots em alta resolução salvos em:
`docs/homologacao/evidencias/`

- `cenario_01_master_login.png`: Tela pós-login da gestão MASTER.
- `cenario_02_master_suporte_dr.png`: Diagnóstico e suporte do DR Restaurante.
- `cenario_03_empresa_criada.png`: Confirmação do provisionamento da nova empresa.
- `cenario_04_owner_login.png`: Dashboard executivo e menu do OWNER.
- `cenario_05_produto_cadastrado.png`: Catálogo com o novo item persistido.
- `cenario_06_baixa_estoque.png`: Painel de estoque com movimentação refletida.
