# 🚀 Release Notes — GESTOR MEI v1.2.0
## Sprint 5 — Controle DAS Mensal

> **Versão Oficial:** v1.2.0  
> **Data de Lançamento:** 29 de Outubro de 2026  
> **Status:** Estável, Homologada e Pronta para Produção  
> **Autor / Mantenedor:** Leonidas Paulino / Equipe LPTI Tech  

---

## 🎯 Objetivo da Versão
A versão **v1.2.0 (Sprint 5)** traz ao **GESTOR MEI** a gestão financeira e fiscal completa do **Documento de Arrecadação do Simples Nacional (DAS-MEI)**, eliminando o risco de inadimplência, juros de mora e desenquadramento previdenciário do microempreendedor.

---

## ✨ Principais Novidades & Funcionalidades

### 1. Entidade `DasMensal` & Persistência de Dados
- Tabela `das_mensal` com isolamento multiempresa (`empresa_id`).
- Campos estruturados: `id`, `empresa_id`, `ano`, `mes`, `valor`, `vencimento`, `status` (`Pago`, `Pendente`, `Atrasado`), `data_pagamento`, `observacao`, `created_at` e `updated_at`.
- Script de migração unificado `migrate_sprint5.py` executado na inicialização.

### 2. Conjunto de APIs REST de Alta Performance (`/api/das`)
- `GET /api/das`: Listagem anual com auto-geração das 12 guias do exercício e atualização dinâmica para `Atrasado` caso vencido.
- `POST /api/das/{id}/pagamento`: Quitação da guia com registro de data de liquidação, valor e observações/código de autenticação.
- `PATCH /api/das/{id}/status`: Alternância de status (`Pago`, `Pendente`, `Atrasado`) com controle automático da data de pagamento.
- `GET /api/das/vencimentos`: Consulta diagnóstica de vencimentos (próximos 7 dias, vencidos e pagos).
- `GET /api/das/resumo`: Métricas de totais pagos, pendentes e em atraso com contagem de guias.
- `POST /api/das/gerar-ano`: Sincronização ou criação em lote para qualquer ano fiscal.
- `GET /api/das/{id}` e `PUT /api/das/{id}`: Detalhamento e atualização individual de guias.

### 3. Tela "Controle DAS" (`/das`)
- **4 Cards de KPIs Financeiros:**
  - 🟢 **DAS Pago:** Total monetário e quantidade de guias quitadas.
  - 🟠 **DAS Pendente:** Total a vencer no ano.
  - 🔴 **DAS Atrasado:** Total de guias vencidas sem quitação.
  - 🔵 **Competência Atual:** Status e vencimento do mês corrente.
- **Filtros e Pesquisa:** Filtro por status (`Todos`, `Pago`, `Pendente`, `Atrasado`) e busca por mês ou anotações.
- **Tabela dos 12 Meses:** Visão completa do ano com chips coloridos de status, badges de proximidade de vencimento e ações com um clique.
- **Modais:**
  - Modal de Registrar Pagamento com valor, data e anotações.
  - Modal de Gerenciamento da Guia para edição de vencimento, status e observações.
- **Atalho Externo:** Acesso direto com um clique ao portal oficial PGMEI da Receita Federal.
- **Exportação:** Exportação dos dados para Excel (`.xlsx`) e CSV.

### 4. Integração com Dashboard Inteligente & Alertas
- **Alertas Proativos em Destaque:**
  - 🔴 **DAS Venceu / Em Atraso:** Alerta crítico com contagem de guias vencidas e link para regularização.
  - 🟡 **DAS Vence em 7 Dias:** Alerta preventivo nos 7 dias anteriores ao vencimento (dia 20) com contagem regressiva (*"vence em 3 dias"*, *"vence amanhã"*, *"vence hoje!"*).
  - 🟢 **DAS Pago:** Alerta positivo de conformidade fiscal com a Receita Federal.
- **Painel de Indicadores Fiscais:** Card dedicado no Dashboard com status da competência e contadores anuais de guias.

---

## 🧪 Homologação e Testes Automatizados
- **Total de Testes:** 27 testes automatizados de ponta a ponta.
- **Testes Aprovados:** 27 de 27 (100% de aprovação).
- **Cobertura:**
  - Sprint 2 (5 testes): Vendas, Carrinho 1:N, Clientes, Impacto no Caixa e DASN-SIMEI.
  - Sprint 3 (7 testes): Logística, Bairros, Motoboys, Kanban e Impressão ESC/POS.
  - Sprint 4 (7 testes): Controle de Estoque, Baixa no PDV, Estorno e Alertas de Mínimo.
  - Sprint 5 (8 testes): Controle DAS, Auto-geração, Pagamentos, Alertas e Dashboard.

---

## 🌐 URLs e Portas de Operação
- **Frontend Web:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://127.0.0.1:8001](http://127.0.0.1:8001)
- **Documentação Swagger:** [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- **Tela Controle DAS:** [http://localhost:5173/das](http://localhost:5173/das)
- **Dashboard:** [http://localhost:5173](http://localhost:5173)

---

## 📋 Arquivos Modificados e Criados na Release
### Novos Arquivos:
- `backend/app/models/das.py`
- `backend/app/schemas/das.py`
- `backend/app/routers/das.py`
- `backend/app/migrate_sprint5.py`
- `backend/tests/conftest.py`
- `backend/tests/test_sprint5_das.py`
- `frontend/src/pages/ControleDas.tsx`
- `RELEASE_NOTES_v1.2.0.md`

### Arquivos Atualizados:
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/models/__init__.py`
- `backend/app/routers/dashboard.py`
- `backend/app/schemas/dashboard.py`
- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/DashboardGreeting.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/types/index.ts`
- `CHANGELOG.md`
- `README.md`
- `GESTOR_MEI_DOCUMENTACAO_COMPLETA.md`
- `docs/HANDOFF.md`
