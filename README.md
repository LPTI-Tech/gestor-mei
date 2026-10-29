# GESTOR MEI 🚀
### Sistema Web SaaS Profissional para Microempreendedores Individuais (MEI)
*Desenvolvido sob medida pela LPTI Tech / Leonidas Paulino*

O **GESTOR MEI** é uma plataforma SaaS multiempresa de alta performance e extrema simplicidade, desenvolvida sob medida para microempreendedores dos ramos de:
- 🍲 **Marmitarias & Comida Caseira**
- 🍔 **Lanchonetes, Bares & Petiscarias**
- 🛒 **Mini Mercearias & Pequenos Comércios**
- 🍧 **Açaíterias & Sorveterias**
- 🛵 **Operações de Delivery Próprio**
- 👨‍👩‍👧 **Negócios Familiares**

---

## 🎯 Proposta de Valor e Diferencial

O GESTOR MEI **NÃO é um ERP complexo, burocrático e lento**.
A prioridade absoluta do produto é a **usabilidade imediata**: o usuário aprende a operar sozinho em poucos minutos, registrando vendas em menos de 10 segundos no balcão ou no delivery.

O sistema responde instantaneamente às 4 perguntas vitais de qualquer pequeno negócio:
1. **Quanto vendeu hoje, na semana e no mês?**
2. **Quanto gastou e quais são os maiores ralos de dinheiro?**
3. **Quanto realmente sobrou de lucro líquido no bolso?**
4. **Quanto falta para estourar o limite anual do MEI (DASN-SIMEI de R$ 81.000,00)?**

---

## 🏗️ Arquitetura Técnica

```
                    ┌──────────────────────────────────────────────┐
                    │               CLIENTES (DISPOSITIVOS)        │
                    │   📱 Android / iOS  •  💻 Desktop / Notebook │
                    └──────────────────────┬───────────────────────┘
                                           │
                                     HTTPS │ (Vercel)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │              FRONTEND (React + Vite)         │
                    │   • TypeScript + Material UI (MUI v5)        │
                    │   • Tema Claro & Escuro (Dark/Light mode)    │
                    │   • Recharts + jsPDF + SheetJS (XLSX)        │
                    └──────────────────────┬───────────────────────┘
                                           │
                                 REST/JSON │ (Render)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │               BACKEND (FastAPI)              │
                    │   • Python 3.11 + Pydantic v2 + JWT Auth     │
                    │   • Multi-Tenant Isolation (empresa_id)      │
                    │   • ReportLab PDF + OpenPyXL Engine          │
                    └──────────────────────┬───────────────────────┘
                                           │
                                 SQLAlchemy│ 2.0 (PostgreSQL / SQLite)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         BANCO DE DADOS (PostgreSQL Cloud)    │
                    │   • Neon / Supabase (Produção / Beta)        │
                    │   • Multiempresa com segregação de tenant    │
                    │   • Fallback automático para SQLite local    │
                    └──────────────────────────────────────────────┘
```

- **Frontend**: React 18, Vite 5, TypeScript, Material UI (MUI v5), Recharts, jsPDF, XLSX (SheetJS).
- **Backend**: FastAPI, Python 3.11, SQLAlchemy 2.0, Pydantic v2, JWT (HS256), Bcrypt, ReportLab, OpenPyXL.
- **Banco de Dados**: PostgreSQL em produção/nuvem (Neon/Supabase) com fallback automático zero-config para SQLite em desenvolvimento local.
- **Isolamento Multiempresa**: Segregação de tenant rigorosa via `empresa_id` em todas as tabelas e rotas.
- **Controle de Acesso (RBAC)**: Perfis de Administrador (Dono), Operador (Balcão/Caixa) e Consultor (Auditoria LPTI Tech).
- **Hospedagem & Deploy**: Pronto para deploy automatizado na **Vercel** (Frontend) e **Render** (Backend).

---

## 📦 Funcionalidades Implementadas (Evolução das Sprints)

### 📊 Sprint 1 — Núcleo SaaS & Gestão Financeira
- **Dashboard Executivo**: Vendas do dia, semana, mês e ano, saldo de caixa, ticket médio, gráficos de evolução e detalhamento por meios de pagamento e canais.
- **Catálogo de Produtos**: Categorias (*Refeições, Bebidas, Porções, Lanches, Mercearia, Outros*), precificação e status.
- **PDV Ultrarrápido**: Vendas registradas em menos de 10 segundos, suporte a valor avulso e integração com caixa.
- **Controle de Caixa & Turnos**: Abertura com troco inicial, lançamentos de entradas/saídas e fechamento cego (apuração automática de quebra/sobra).
- **Controle de Despesas**: Lançamentos categorizados e relatórios analíticos de gastos.
- **Relatório Anual MEI (DASN-SIMEI)**: Régua visual e termômetro do teto MEI (R$ 81.000,00), cálculo de risco de desenquadramento e exportação em PDF e Excel.
- **Saúde do Negócio**: Análise de margem operacional, diagnóstico de custos e recomendações práticas.
- **Controle de Motoboys e iFood**: Gestão de corridas, comissões de delivery e acertos.

### 🛒 Sprint 2 — Venda com Múltiplos Itens (Carrinho) & Clientes
- **Entidades Venda & ItemVenda**: Modelagem relacional 1:N com integridade referencial e cascata.
- **Carrinho de Compras Interativo**: Adição múltipla de produtos com controle numérico de quantidade, cálculo de subtotal por linha e total geral em tempo real.
- **Vínculo Opcional de Clientes**: Autocomplete inteligente para selecionar clientes cadastrados ou registrar vendas anônimas.
- **Módulo de Clientes**: Gestão de base de clientes com nome, telefone/WhatsApp, endereço completo, CPF e histórico.
- **Impacto Automático em Cascata**: Cada venda atualiza instantaneamente o Dashboard, o Saldo de Caixa e os acumuladores do Relatório MEI.

### 🛵 Sprint 3 — Pedidos de Entrega, Logística & Regiões
- **Regiões de Entrega & Bairros**: Cadastro de regiões com definição de taxa de entrega padrão por bairro ou zona.
- **Vinculação Região ↔ Cliente**: Associação automática do cliente à sua região habitual, preenchendo o frete no pedido.
- **Geração e Gestão de Pedidos**: Distinção clara entre pedidos de `Balcão` e `Entrega (Delivery)`.
- **Esteira de Status Operacional**:
  - 📥 **Recebido**
  - 👨‍🍳 **Em Preparo**
  - 🛵 **Saiu para Entrega**
  - ✅ **Entregue**
  - ❌ **Cancelado**
- **Vinculação de Motoboy**: Associação do entregador responsável diretamente na comanda do pedido.
- **Relatório Completo de Logística & Taxas**: Total de taxas arrecadadas, distribuição por bairro e ranking por motoboy.
- **Impressão Térmica ESC/POS**: Módulo preparado para acionar impressoras térmicas não-fiscais (58mm e 80mm).

### 📦 Sprint 4 — Controle de Estoque & Custos
- **Modelagem de Estoque e Custos**: Campos `quantidade_estoque`, `estoque_minimo` e `custo_unitario` integrados à entidade `Produto`.
- **Auditoria de Movimentações (MovimentacaoEstoque)**: Rastreamento completo com tipo (`ENTRADA`, `SAIDA`, `AJUSTE`), quantidade, motivo e usuário.
- **Entrada Manual & Reposição**: Registro de compras de fornecedores com atualização do custo unitário médio.
- **Saída Manual & Perdas**: Registro de avarias, consumo interno, produtos vencidos e descarte.
- **Ajuste de Inventário Físico**: Correção rápida de divergências de contagem com recálculo automático de delta.
- **Baixa Automática no PDV**: Cada venda deduz instantaneamente a quantidade física em estoque.
- **Estorno em Cancelamentos**: O cancelamento de vendas recompõe o estoque dos produtos e gera registro de movimentação de entrada/estorno.
- **Alertas de Estoque Crítico**: Indicadores visuais na tela de produtos e no Dashboard quando o saldo atinge ou fica abaixo do estoque mínimo.

### 💰 Sprint 5 — Controle DAS Mensal (MEI)
- **Entidade DasMensal**: Modelagem dedicada para guias mensais (`ano`, `mes`, `valor`, `vencimento`, `status`, `data_pagamento`).
- **Auto-Geração & Sincronização Anual**: Geração automática das 12 guias para o exercício corrente e atualização dinâmica para `Atrasado`.
- **APIs REST Especializadas**: Listagem, quitação, alteração de status e consulta de vencimentos (7 dias, vencidos, pagos).
- **Integração com Dashboard**: Alertas de vencimento em 7 dias, alerta de guia vencida e confirmação de regularidade fiscal.
- **Tela Controle DAS**: Interface com seletor de ano, 4 KPIs visuais, tabela dos 12 meses, modais de liquidação e atalho direto para o PGMEI oficial da Receita Federal.

### 📄 Sprint 6 — Entrada Automática via XML NF-e
- **Parser Robusto de XML NF-e (v4.00)**: Extração automática de chave de 44 dígitos, emitente/fornecedor, produtos, NCM, quantidades e valores.
- **Associação Inteligente de Produtos (De-Para)**: Vínculo automático e persistente entre o código do fornecedor e o catálogo local.
- **Fator de Conversão de Embalagens**: Conversão de caixas/fardos em unidades avulsas (ex: 1 CX com 12 unidades).
- **Trava Anti-Duplicidade**: Bloqueio rigoroso de importação duplicada da mesma nota fiscal.
- **Interface Visual**: Drag and Drop para upload do arquivo `.xml`, pré-visualização tabular e botão "Importar para o Estoque".

### 🛍️ Sprint 6.5 — Módulo de Compras & Histórico
- **Histórico Completo de Compras**: Registro de fornecedores, notas fiscais, datas, quantidade de itens e valores faturados.
- **Dashboard de Compras**: 4 indicadores (Última Compra, Total Comprado no Mês, Número de Notas e Fornecedor Principal).
- **Tela de Detalhes da Compra**: Espelho detalhado dos itens adquiridos, unidades e preços unitários.

### 👔 Sprint 7 — Painel do Consultor LPTI Tech
- **Novo Perfil de Usuário**: Role `CONSULTOR` com permissões de auditoria estratégica e leitura de clientes.
- **Tela Painel do Consultor**: Visão panorâmica de toda a carteira de microempreendedores atendidos.
- **Sistema de Scores Semáforo**:
  - 🟢 **Saudável:** Faturamento em dia, estoque estável e guias pagas.
  - 🟡 **Atenção:** Vencimento próximo, estoque mínimo ou faturamento acima de 80% do teto.
  - 🔴 **Crítico:** DAS atrasado, estoque zerado ou risco iminente de desenquadramento fiscal.
- **Filtros de Auditoria & Diagnóstico Consultivo**: Geração de planos de ação táticos sob medida para o MEI.

---

## 📚 Documentação Completa e Manuais

- 📘 [**Manual do Usuário Ilustrado (Markdown)**](MANUAL_DO_USUARIO_GESTOR_MEI_v1.4.0.md): Guia passo a passo com capturas reais de todas as 13 telas, FAQ e glossário.
- 📕 [**Manual do Usuário (PDF para Impressão / Leitura)**](MANUAL_DO_USUARIO_GESTOR_MEI_v1.4.0.pdf): Versão em PDF de alta resolução com paginação e diagramação profissional.
- 📖 [**Guia Completo de Deploy Beta (Vercel + Render + Neon/Supabase)**](DEPLOY_BETA.md): Passo a passo para publicação online.
- 📋 [**Roteiro & Checklist de Testes Piloto**](CHECKLIST_TESTES_PILOTO.md): Matriz de 9 módulos para homologação com usuários reais.
- 📑 [**Documentação Técnica Geral do Sistema**](GESTOR_MEI_DOCUMENTACAO_COMPLETA.md): Especificações detalhadas de modelos e APIs.
- 📝 [**Histórico de Mudanças (Changelog)**](CHANGELOG.md): Registro de todas as versões e sprints.

---

## ⚡ Como Executar Localmente

### Pré-requisitos
- **Python 3.11+**
- **Node.js 18+ (LTS)**
- **Git**

### 1. Clonar o Repositório
```bash
git clone https://github.com/SEU_USUARIO/gestor-mei.git
cd gestor-mei
```

### 2. Iniciar Sistema Completo (Windows PowerShell)
```powershell
.\start-all.ps1
```

Ou execute individualmente em terminais separados:

**Terminal 1 — Backend FastAPI:**
```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API ativa em: `http://localhost:8000` | Swagger Interativo: `http://localhost:8000/docs`*

**Terminal 2 — Frontend React:**
```powershell
cd frontend
npm install
npm run dev
```
*Aplicação web ativa em: `http://localhost:5173`*

---

## 🔑 Credenciais de Teste Pré-configuradas

O banco de dados de desenvolvimento inicializa com dados demonstrativos completos:

| Perfil | Usuário | E-mail | Senha | Missão |
|---|---|---|---|---|
| **Administrador** | Leonidas Paulino | `admin@gestormei.com.br` | `admin123` | Dono da empresa, gestão financeira, estoque e compras. |
| **Operador** | Carlos Atendente | `operador@gestormei.com.br` | `operador123` | Atendimento rápido no balcão e entrega. |
| **Consultor LPTI Tech** | Consultor LPTI Tech | `consultor@lptitech.com.br` | `consultor123` | Visão panorâmica da carteira e auditoria consultiva. |

---

## 🧪 Suíte de Testes Automatizados

O sistema conta com **46 testes de integração automatizados** cobrindo todas as Sprints com 100% de aprovação:

```powershell
cd backend
pytest -v
```

---

## 📄 Licença

Este projeto é desenvolvido pela **LPTI Tech / Leonidas Paulino** e distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
