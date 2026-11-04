---
name: gestor-mei-rbac
description: >-
  Sistema de proteção permanente de controle de acesso baseado em papéis (RBAC),
  governança multiempresa, isolamento de dados por tenant e auditoria do Gestor MEI.
  Ative esta skill para qualquer implementação, revisão de código ou auditoria que
  envolva permissões de usuários, isolamento de empresa_id ou proteção de dados financeiros.
---

# Gestor MEI — RBAC & Data Isolation Security System

Esta Skill estabelece a blindagem definitiva das regras de controle de acesso (RBAC), isolamento de dados multiempresa e rastreabilidade de auditoria do **GESTOR MEI**.

Qualquer implementação presente ou futura no código que flexibilize, contorne ou ignore estas regras é considerada **falha crítica de segurança e integridade de dados**.

---

## 🛡️ 1. Princípios Inegociáveis de Segurança

1. **Isolamento Absoluto Multiempresa:** Nenhuma consulta (`SELECT`), atualização (`UPDATE`) ou exclusão (`DELETE`) pode ser executada sem o filtro explícito `empresa_id == current_user.empresa_id` (exceto para o perfil `MASTER`).
2. **Hierarquia Estrita de Criação de Usuários:**
   - `MASTER` $\to$ Cria Empresas e usuários `OWNER`.
   - `OWNER` $\to$ Cria e gerencia usuários `OPERATOR`.
   - `OPERATOR` $\to$ Jamais cria outros usuários.
   - `CONSULTOR` $\to$ Vinculado exclusivamente por relação formal `empresa_id`.
3. **Cegueira Financeira do `OPERATOR`:** O perfil `OPERATOR` é **terminantemente proibido** de visualizar métricas financeiras globais, relatórios fiscais, margens de lucro, tela de despesas e saúde do negócio.
4. **Imutabilidade de Auditoria:** Toda movimentação financeira (caixa, venda, despesa, sangria) deve registrar `user_id`, `empresa_id` e timestamp imutável.

---

## 👥 2. Os 4 Perfis Oficiais e suas Fronteiras

```
┌────────────────────────────────────────────────────────┐
│                        MASTER                          │
│  - Gestão de Todas as Empresas                         │
│  - Provisionamento de Contas OWNER                     │
│  - Licenciamento Global e Auditoria da Plataforma      │
└───────────────┬────────────────────────────────────────┘
                │ cria
                ▼
┌────────────────────────────────────────────────────────┐
│                        OWNER                           │
│  - Gestão Total da SUA Empresa                         │
│  - Acesso Total a Financeiro, Faturamento e DAS        │
│  - Criação e Gestão de Contas OPERATOR                 │
└───────────────┬────────────────────────────────────────┘
                │ cria
                ▼
┌───────────────────────────────┐  ┌────────────────────────────────────┐
│           OPERATOR            │  │             CONSULTOR              │
│ - Vendas no PDV               │  │ - Vinculado por empresa            │
│ - Pedidos Delivery            │  │ - Auditoria Fiscal e Relatório MEI │
│ - Abertura/Fechamento de Caixa│  │ - Leitura de Compras e Despesas    │
│ ❌ SEM ACESSO A FINANCEIRO    │  │ ❌ Não cria/gerencia operadores    │
└───────────────────────────────┘  └────────────────────────────────────┘
```

---

## 🔒 3. Matriz de Guarda de Rotas e Endpoints

| Recurso / Rota | MASTER | OWNER | CONSULTOR | OPERATOR |
| :--- | :---: | :---: | :---: | :---: |
| **`/api/empresas` (Criação/Edição)** | ✅ | ❌ | ❌ | ❌ |
| **`/api/users/owner` (Criar Proprietário)**| ✅ | ❌ | ❌ | ❌ |
| **`/api/users/operator` (Criar Operador)**| ✅ | ✅ | ❌ | ❌ |
| **`/api/vendas` (PDV e Delivery)** | ✅ | ✅ | ❌ | ✅ |
| **`/api/caixa/turno` (Abrir/Fechar Caixa)**| ✅ | ✅ | ❌ | ✅ (Próprio) |
| **`/api/caixa/auditoria-geral`** | ✅ | ✅ | ✅ | ❌ |
| **`/api/produtos` (Preço de Venda)** | ✅ | ✅ | ❌ | ✅ (Leitura) |
| **`/api/produtos` (Custo e Margem %)** | ✅ | ✅ | ✅ | ❌ (Oculto) |
| **`/api/despesas`** | ✅ | ✅ | ✅ | ❌ (Bloqueado) |
| **`/api/das` (Controle Guias MEI)** | ✅ | ✅ | ✅ | ❌ (Bloqueado) |
| **`/api/relatorio-mei` (DASN)** | ✅ | ✅ | ✅ | ❌ (Bloqueado) |
| **`/api/saude-negocio` (BI & Diagnóstico)**| ✅ | ✅ | ✅ | ❌ (Bloqueado) |
| **`/api/consultor` (Painel Consultor)** | ✅ | ❌ | ✅ | ❌ (Bloqueado) |

---

## 🚨 4. Como Prevenir Vazamentos e Violações

### No Backend (FastAPI + SQLAlchemy)
- Nunca confiar no `empresa_id` enviado no corpo da requisição (`payload`). Sempre extrair o `empresa_id` de forma confiável através do token JWT do usuário autenticado (`current_user.empresa_id`).
- Aplicar o decorator ou injeção de dependência `require_roles(...)` em todas as rotas.

### No Frontend (React + MUI)
- Proteger rotas com `ProtectedRoute.tsx` checando `user.role`.
- Ocultar botões, menus da sidebar e abas financeiras quando `user.role === 'OPERATOR'`.
- Garantir que mesmo que o usuário force a URL no navegador, o backend rejeite com `403 Forbidden`.

---

## 📑 Guias Complementares
- [Regras de Auditoria e Anti-Vazamento Multiempresa](./references/security-audit-rules.md)
- [Matriz Exaustiva de Permissões](./references/complete-role-matrix.md)
- [Exemplo de Guarda FastAPI com Decorator](./examples/FastApiSecurityGuard.example.py)
- [Schema Estruturado de RBAC](./resources/rbac-schema.json)
