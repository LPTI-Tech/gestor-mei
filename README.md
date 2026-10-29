# GESTOR MEI 🚀
### Sistema Web SaaS Profissional para Microempreendedores Individuais (MEI)

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
                                 SQLAlchemy│ 2.0
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │             BANCO DE DADOS (PostgreSQL)      │
                    │   • Multiempresa com segregação de tenant    │
                    │   • Fallback automático para SQLite local    │
                    └──────────────────────────────────────────────┘
```

- **Frontend**: React 18, Vite 5, TypeScript, Material UI (MUI v5), Recharts, jsPDF, XLSX (SheetJS).
- **Backend**: FastAPI, Python 3.11, SQLAlchemy 2.0, Pydantic v2, JWT (HS256), Bcrypt, ReportLab, OpenPyXL.
- **Banco de Dados**: PostgreSQL em produção (Render) com fallback automático zero-config para SQLite em desenvolvimento local.
- **Isolamento Multiempresa**: Segregação de tenant rigorosa via `empresa_id` em todas as tabelas e rotas.
- **Controle de Acesso (RBAC)**: Perfis de Administrador (Dono) e Operador (Balcão/Caixa).
- **Hospedagem**: Arquitetura pronta para deploy automatizado no **Render** (Backend) e **Vercel** (Frontend).

---

## 📦 Funcionalidades Implementadas (Sprints 1, 2, 3, 4 e 5)

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
- **Relatório Completo de Logística & Taxas**:
  - Total de taxas de entrega cobradas por período.
  - Distribuição e ranking de entregas por região/bairro.
  - Desempenho e volume de entregas por motoboy.
- **Arquitetura Pronta para ESC/POS**: Módulo `escpos_printer.py` preparado para acionar impressoras térmicas não-fiscais (58mm e 80mm via USB, Serial, Rede TCP/IP ou comando RAW de navegador).

### 📦 Sprint 4 — Controle de Estoque & Custos
- **Modelagem de Estoque e Custos**: Campos `quantidade_estoque`, `estoque_minimo` e `custo_unitario` integrados à entidade `Produto`.
- **Auditoria de Movimentações (MovimentacaoEstoque)**: Rastreamento completo com tipo (`ENTRADA`, `SAIDA`, `AJUSTE`), quantidade, motivo, usuário responsável e observações.
- **Entrada Manual & Reposição**: Registro de compras de fornecedores com atualização opcional de custo unitário médio.
- **Saída Manual & Perdas**: Registro de avarias, consumo interno, produtos vencidos e descarte.
- **Ajuste de Inventário Físico**: Correção rápida de divergências de contagem com recálculo automático de delta.
- **Baixa Automática no PDV**: Cada venda de produto deduz instantaneamente a quantidade em estoque e gera registro de movimentação de saída.
- **Estorno em Cancelamentos**: O cancelamento de vendas recompõe o estoque dos produtos e gera registro de movimentação de entrada/estorno.
- **Alertas de Estoque Crítico**: Indicadores visuais na tela de produtos e no Dashboard quando o saldo atinge ou fica abaixo do estoque mínimo.
- **Tela de Controle de Estoque Completa**: Aba de posição com valoração patrimonial (preço de custo e potencial de venda) e aba de histórico cronológico de movimentações.

### 💰 Sprint 5 — Controle DAS Mensal (MEI)
- **Entidade DasMensal**: Modelagem dedicada para guias mensais com campos: `id`, `empresa_id`, `ano`, `mes`, `valor`, `vencimento`, `status` (`Pago`, `Pendente`, `Atrasado`), `data_pagamento`, `observacao`, `created_at` e `updated_at`.
- **Auto-Geração & Sincronização Anual**: Geração automática das 12 guias para o exercício corrente e atualização dinâmica para `Atrasado` caso expire sem pagamento.
- **APIs REST Especializadas**:
  - `GET /api/das`: Listagem com filtros por ano e status.
  - `POST /api/das/{id}/pagamento`: Quitação da guia com registro de data de pagamento, valor e observações.
  - `PATCH /api/das/{id}/status`: Alteração de status com ajuste inteligente da data de liquidação.
  - `GET /api/das/vencimentos`: Diagnóstico de vencimentos (próximos 7 dias, vencidos, pagos).
  - `GET /api/das/resumo`: Resumo financeiro de totais e contagens.
  - `POST /api/das/gerar-ano`: Sincronização em lote.
- **Integração com Dashboard Inteligente**:
  - Alerta crítico: DAS venceu / em atraso (com botão para regularização imediata).
  - Alerta de atenção: DAS vence em até 7 dias (com contagem regressiva de dias).
  - Alerta de conformidade: DAS quitado (com confirmação positiva de regularidade fiscal).
  - Card integrado de "Controle DAS Mensal" com status da competência e contadores de guias.
- **Tela Controle DAS**: Interface moderna com seletor de ano, 4 KPIs visuais, tabela dos 12 meses, modais de pagamento e edição, exportação para Excel/CSV e link direto para emissão no PGMEI da Receita Federal.
- **Suíte de Testes Automatizados**: 8 testes em `test_sprint5_das.py` com 100% de cobertura das regras de negócio do DAS (27 testes no total do projeto).

---

## 📁 Estrutura do Projeto

```
gestor-mei/
├── backend/
│   ├── app/
│   │   ├── models/            # Modelos relacionais SQLAlchemy (Multi-tenant)
│   │   ├── routers/           # Endpoints REST (auth, vendas, caixa, clientes, etc.)
│   │   ├── schemas/           # Validação e serialização Pydantic v2
│   │   ├── config.py          # Configurações de ambiente e variáveis
│   │   ├── database.py        # Conexão de banco (PostgreSQL / SQLite fallback)
│   │   ├── dependencies.py    # Injeção de dependências e segurança JWT
│   │   ├── escpos_printer.py  # Arquitetura para impressão de comandas térmicas
│   │   ├── main.py            # Ponto de entrada FastAPI com CORS e routers
│   │   ├── security.py        # Criptografia Bcrypt e geração de tokens JWT
│   │   └── seed.py            # Carga de dados inicial para testes
│   ├── tests/                 # Suíte de testes automatizados (pytest + httpx)
│   ├── Dockerfile             # Container Docker do Backend
│   ├── Procfile               # Configuração de processo para PaaS
│   ├── render.yaml            # Blueprint de deploy no Render
│   └── requirements.txt       # Dependências Python (FastAPI, SQLAlchemy, etc.)
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis (Layout, Sidebar, etc.)
│   │   ├── contexts/          # Contextos React (AuthContext, ThemeContext)
│   │   ├── pages/             # Telas da aplicação (Dashboard, PDV, Pedidos, etc.)
│   │   ├── services/          # Clientes HTTP Axios integrados à API
│   │   ├── types/             # Interfaces e tipos TypeScript
│   │   ├── App.tsx            # Roteamento e provedores globais
│   │   ├── main.tsx           # Ponto de entrada React
│   │   └── theme.ts           # Configuração de temas Claro / Escuro MUI
│   ├── package.json           # Dependências e scripts npm
│   ├── tsconfig.json          # Configurações do compilador TypeScript
│   ├── vercel.json            # Configuração de rewrite e deploy na Vercel
│   └── vite.config.ts         # Configuração de build do Vite
├── docs/
│   └── HANDOFF.md             # Guia completo de arquitetura e transição técnica
├── .gitignore                 # Arquivo de exclusão Git unificado
├── LICENSE                    # Licença MIT
├── README.md                  # Apresentação completa da plataforma
├── start-all.ps1              # Inicializador conjunto para Windows PowerShell
├── start-backend.ps1          # Inicializador exclusivo do FastAPI
└── start-frontend.ps1         # Inicializador exclusivo do Vite
```

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

O banco de dados de desenvolvimento já inicializa com dados demonstrativos completos:

| Perfil | Usuário | E-mail | Senha |
|---|---|---|---|
| **Administrador** | Leonidas Paulino | `admin@gestormei.com.br` | `admin123` |
| **Operador** | Carlos Atendente | `operador@gestormei.com.br` | `operador123` |
| **Consultor LPTI Tech** | Consultor LPTI Tech | `consultor@lptitech.com.br` | `consultor123` |

---

## ☁️ Deploy em Nuvem (Ambiente Beta)

O Gestor MEI está 100% pronto para publicação em nuvem:
- 📖 [Guia Completo de Deploy (Vercel + Render + Neon/Supabase)](DEPLOY_BETA.md)
- 📋 [Roteiro & Checklist de Testes Piloto](CHECKLIST_TESTES_PILOTO.md)

---

## 🧪 Testes Automatizados

Para executar os testes de integração de todas as Sprints (46 testes automatizados com 100% de aprovação):
```powershell
cd backend
pytest -v
```

---

## 🚀 Publicação no GitHub

Para publicar este projeto em um repositório remoto no GitHub:

```bash
# 1. Adicione o repositório remoto
git remote add origin https://github.com/SEU_USUARIO/gestor-mei.git

# 2. Defina a branch principal
git branch -M main

# 3. Envie os arquivos para o GitHub
git push -u origin main
```

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
