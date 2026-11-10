---
name: playwright-mcp
description: >-
  Guia oficial de automação e testes autônomos ponta a ponta (E2E) do Gestor MEI utilizando o Playwright MCP Server.
  Ative esta skill sempre que precisar testar, validar, homologar ou navegar de forma autônoma pela aplicação sem a
  necessidade de criar scripts manuais .spec.ts.
---

# Playwright MCP — Guia de Automação e Testes Autônomos (Gestor MEI)

Este guia define como o **Antigravity** interage de forma autônoma com o **Gestor MEI** utilizando o **Playwright MCP Server** oficial (`@playwright/mcp`).

---

## 🛠️ 1. O que é o Playwright MCP?

O Playwright MCP é um servidor compatível com o **Model Context Protocol** que permite ao agente controlar um navegador web de forma programática e orientada a acessibilidade. 

Em vez de depender de scripts `.spec.ts` estáticos:
- O agente consulta a árvore de acessibilidade da página (`browser_snapshot`).
- Identifica elementos através de referências semânticas (`ref=e...`).
- Interage com cliques, digitação e submissões (`browser_click`, `browser_type`, `browser_fill_form`).
- Valida o estado real do sistema em tempo de execução.

---

## 🧰 2. Catálogo de Ferramentas Playwright MCP

| Ferramenta | Propósito | Exemplo de Uso |
| :--- | :--- | :--- |
| `browser_navigate` | Navega até uma URL especificada | `{"url": "https://gestor-mei.vercel.app"}` |
| `browser_snapshot` | Retorna a árvore semântica da página em YAML com refs | `{"mode": "full"}` |
| `browser_click` | Clica em um elemento semântico pelo `ref` | `{"ref": "e12"}` |
| `browser_type` | Digita texto em um campo ativo ou pelo `ref` | `{"ref": "e15", "text": "master@lptitech.com.br"}` |
| `browser_fill_form` | Preenche múltiplos campos de uma vez | `{"fields": [{"ref": "e1", "value": "..."}, ...]}` |
| `browser_press_key` | Pressiona teclas do teclado (Enter, Tab, Esc) | `{"key": "Enter"}` |
| `browser_wait_for` | Aguarda um tempo ou condição | `{"time": 2000}` |
| `browser_take_screenshot` | Captura evidência visual em PNG | `{"filename": "dashboard_master.png"}` |
| `browser_evaluate` | Executa script JS customizado na página | `{"expression": "window.location.pathname"}` |
| `browser_close` | Encerra a sessão do navegador | `{}` |

---

## 🎯 3. Cenários de Teste Homologados no Gestor MEI

### Cenário 1: Autenticação MASTER
1. **Navegar:** `browser_navigate` para `https://gestor-mei.vercel.app` (ou `http://localhost:5173/login`).
2. **Inspecionar:** `browser_snapshot` para capturar os `refs` dos campos Email e Senha.
3. **Preencher:**
   - Email: `master.homologacao@lptitech.com.br`
   - Senha: `MasterSecure@2026`
4. **Submeter:** `browser_click` no botão "Acessar Plataforma".
5. **Verificar:** Confirmar redirecionamento para `/` ou `/master/dashboard`.

### Cenário 2: Validação do Master Dashboard e Métricas Globais
1. **Inspecionar:** `browser_snapshot` na rota principal.
2. **Validar:**
   - Presença dos cards: "Total de Empresas", "Empresas Ativas", "Proprietários", "Operadores", "Consultores".
   - Ausência de mensagens de erro como "Não foi possível carregar as métricas do painel MASTER".
   - Presença da tabela de empresas clientes reais com status e proprietários.

### Cenário 3: Tenant Switcher (Acesso a Empresa Cliente)
1. **Localizar:** Seletor de empresas (Tenant Switcher) no topo ou na lista do Master Dashboard.
2. **Ação:** Clicar para abrir a lista e selecionar uma empresa cliente (ex: *Padaria Pao de Ouro*).
3. **Verificar:** Transição imediata de contexto para a empresa selecionada.

### Cenário 4: Modo Suporte LPTI Tech
1. **Confirmar Indicador Visual:**
   - Barra fixa no topo (`top: 0`, altura 42px) com badge `🛡️ Modo Suporte LPTI Tech`.
   - Nome da empresa cliente em atendimento.
   - Nome do MASTER operador.
   - Botão `[Voltar para Visão Global]`.
2. **Navegar pelos Módulos:**
   - Acessar Caixa, PDV, Estoque, Vendas, Produtos como OWNER da empresa.
3. **Encerrar Suporte:**
   - Clicar em `[Voltar para Visão Global]`.
   - Confirmar o desaparecimento da barra superior e o retorno à visão global do MASTER.

---

## ⚙️ 4. Configuração do Servidor (`mcp_config.json`)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "C:\\Users\\LeonidasPaulino\\AppData\\Roaming\\npm\\node_modules\\@playwright\\mcp\\cli.js",
        "--headless",
        "--viewport-size=1366x768",
        "--user-data-dir=C:\\Users\\LeonidasPaulino\\AppData\\Local\\ms-playwright-mcp"
      ],
      "env": {
        "PLAYWRIGHT_HEADLESS": "true",
        "NODE_ENV": "production"
      }
    }
  }
}
```
