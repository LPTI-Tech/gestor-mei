# 📋 Manual de Handoff & Arquitetura — GESTOR MEI

> **Versão:** 1.1.0 (Sprints 1, 2, 3 e 4 Concluídas)  
> **Responsável:** Equipe de Engenharia / Leonidas Paulino  
> **Data:** 28 de Outubro de 2026  

---

## 1. Visão Geral do Produto

O **GESTOR MEI** é uma plataforma web SaaS multiempresa de alta performance projetada especificamente para Microempreendedores Individuais (MEI) do ramo de marmitarias, pequenos restaurantes, mini mercearias, bares, lanchonetes e negócios familiares.

### Problemas Centrais Resolvidos:
- **Controle de Caixa Cego:** Substituição do "caderninho" por abertura, sangria, reforço e fechamento de caixa auditado com conferência de sobra/falta.
- **Ponto de Venda (PDV) com Carrinho Ágil:** Registro de pedidos com múltiplos itens, combos e adicionais em menos de 10 segundos.
- **Logística e Delivery Próprio:** Gestão de regiões/bairros com taxas fixas, despacho de motoboys e pipeline de status do pedido (*Recebido ➔ Em Preparo ➔ Saiu para Entrega ➔ Entregue*).
- **Controle de Estoque Inteligente (Sprint 4):** Baixa automática no PDV ao concluir vendas, reposição manual (entradas), saídas operacionais (perdas, consumo interno, descarte), ajuste de inventário físico, estorno automático em cancelamentos e alertas de estoque mínimo no Dashboard.
- **Risco de Desenquadramento MEI:** Cálculo em tempo real do faturamento acumulado, projeção anual de fechamento e demonstrativo segregado entre **Comércio (Produtos)** e **Serviços** conforme o Artigo 68 da Resolução CGSN nº 140/2018 (DASN-SIMEI) com exportação em PDF oficial e planilha Excel.

---

## 2. Pilha Tecnológica (Tech Stack)

### Backend:
- **Framework:** Python 3.11+ / FastAPI
- **Servidor ASGI:** Uvicorn
- **ORM & Banco:** SQLAlchemy 2.0 (compatível com SQLite para desenvolvimento local zero-config e PostgreSQL em produção)
- **Autenticação:** JWT (JSON Web Tokens) com algoritmo HMAC-SHA256 e hash Bcrypt
- **Validação de Dados:** Pydantic v2
- **Exportação & Relatórios:** ReportLab (PDF) e OpenPyXL (Excel)
- **Testes Automatizados:** Pytest + HTTPX / TestClient

### Frontend:
- **Biblioteca Base:** React 18
- **Build Tool:** Vite 5 com suporte a TypeScript
- **Linguagem:** TypeScript
- **UI Framework:** Material UI (MUI v5)
- **Roteamento:** React Router DOM v6
- **Cliente HTTP:** Axios com interceptors de autenticação e refresh

---

## 3. Estrutura de Diretórios do Projeto

```text
gestor-mei/
├── .gitignore                    # Regras unificadas Git (React, Vite, Python, SQLite, Postgres)
├── LICENSE                       # Licença MIT
├── README.md                     # Apresentação e guia rápido do projeto
├── start-all.ps1                 # Script para subir Backend e Frontend simultaneamente
├── start-backend.ps1             # Inicializador do backend FastAPI
├── start-frontend.ps1            # Inicializador do frontend Vite React
├── docs/
│   └── HANDOFF.md                # Este documento técnico
├── backend/
│   ├── requirements.txt          # Dependências Python travadas
│   ├── tests/                    # Suíte de testes automatizados
│   │   ├── test_sprint2_vendas_clientes.py
│   │   ├── test_sprint3_entregas.py
│   │   └── test_sprint4_estoque.py
│   └── app/
│       ├── main.py               # Entrypoint FastAPI e injeção de middlewares
│       ├── config.py             # Configurações de ambiente (Pydantic Settings)
│       ├── database.py           # Conexão de engine SQLAlchemy e SessionLocal
│       ├── dependencies.py       # Injeção de dependência de usuário e empresa autenticada
│       ├── security.py           # Funções de hashing e geração de tokens JWT
│       ├── seed.py               # Seed automático de dados demonstrativos
│       ├── migrate_sprint2.py    # Script de migração da Sprint 2
│       ├── migrate_sprint3.py    # Script de migração da Sprint 3
│       ├── migrate_sprint4.py    # Script de migração da Sprint 4 (Estoque)
│       ├── models/               # Modelos relacionais SQLAlchemy
│       │   ├── empresa.py        # Cadastro multiempresa e feature flags
│       │   ├── user.py           # Usuários (ADMIN / OPERADOR)
│       │   ├── produto.py        # Catálogo de produtos, estoque e custos
│       │   ├── estoque.py        # Movimentações de estoque (ENTRADA, SAIDA, AJUSTE)
│       │   ├── cliente.py        # Cadastro de clientes fiéis e vínculo de região
│       │   ├── regiao_entrega.py # Bairros, rotas e taxas de entrega
│       │   ├── venda.py          # Entidades Venda e ItemVenda (carrinho)
│       │   ├── caixa.py          # Turnos e lançamentos de caixa diário
│       │   ├── despesa.py        # Controle de despesas fixas e variáveis
│       │   ├── motoboy.py        # Motoboys e controle de corridas
│       │   └── ifood.py          # Lançamentos de vendas com taxa líquida
│       ├── schemas/              # Contratos e validação Pydantic
│       │   ├── estoque.py
│       │   └── ...
│       └── routers/              # Endpoints da API REST segregados por domínio
│           ├── auth.py
│           ├── empresas.py
│           ├── users.py
│           ├── produtos.py
│           ├── estoque.py        # Entradas, saídas manuais, ajustes e alertas
│           ├── clientes.py
│           ├── regioes_entrega.py
│           ├── vendas.py
│           ├── caixa.py
│           ├── despesas.py
│           ├── motoboys.py
│           ├── ifood.py
│           ├── dashboard.py
│           ├── relatorio_mei.py
│           ├── relatorio_entregas.py
│           ├── saude_negocio.py
│           └── backup.py
└── frontend/
    ├── package.json              # Dependências npm
    ├── tsconfig.json             # Configurações do compilador TypeScript
    ├── vite.config.ts            # Configurações do Vite
    └── src/
        ├── App.tsx               # Roteador SPA protegido
        ├── main.tsx              # Ponto de entrada React
        ├── types/                # Interfaces TypeScript centralizadas
        ├── services/             # Instância do Axios e utilitários de exportação
        ├── contexts/             # Provedores de Autenticação e Tema (Claro/Escuro)
        ├── components/           # Componentes reutilizáveis (Layout, StatCard, ConfirmDialog)
        └── pages/                # Telas do sistema
            ├── Login.tsx
            ├── Dashboard.tsx
            ├── Vendas.tsx        # PDV com Carrinho e Impressão Térmica
            ├── PedidosEntrega.tsx# Kanban de Delivery por Status
            ├── RegioesEntrega.tsx# Gestão de Bairros e Taxas
            ├── Clientes.tsx      # Base de clientes com WhatsApp
            ├── Produtos.tsx      # Catálogo com custos e estoque
            ├── Estoque.tsx       # Gestão completa, entradas, saídas, ajustes e alertas
            ├── Caixa.tsx
            ├── Despesas.tsx
            ├── Motoboys.tsx
            ├── IFood.tsx
            ├── RelatorioMei.tsx  # Módulo DASN-SIMEI com PDF/Excel
            ├── RelatorioEntregas.tsx # Indicadores financeiros de frete
            ├── SaudeNegocio.tsx
            ├── Usuarios.tsx
            └── Configuracoes.tsx
```

---

## 4. Banco de Dados e Isolamento Multiempresa

Toda tabela operacional contém a chave estrangeira `empresa_id` indexada:

```mermaid
erDiagram
    EMPRESAS ||--o{ USERS : "possui"
    EMPRESAS ||--o{ REGIOES_ENTREGA : "atende"
    EMPRESAS ||--o{ CLIENTES : "cadastra"
    EMPRESAS ||--o{ PRODUTOS : "vende"
    EMPRESAS ||--o{ CAIXA_TURNOS : "controla"
    EMPRESAS ||--o{ VENDAS : "realiza"
    EMPRESAS ||--o{ MOTOBOYS : "contrata"
    
    REGIOES_ENTREGA ||--o{ CLIENTES : "vincula"
    REGIOES_ENTREGA ||--o{ VENDAS : "taxa"
    CLIENTES ||--o{ VENDAS : "compra"
    MOTOBOYS ||--o{ VENDAS : "entrega"
    VENDAS ||--|{ ITENS_VENDA : "discrimina"
    CAIXA_TURNOS ||--o{ VENDAS : "recebe dinheiro"
```

O isolamento é assegurado em nível de query em todas as rotas através da dependência `get_current_user`, garantindo que uma empresa jamais acesse registros pertencentes a outra.

---

## 5. Como Executar o Projeto Localmente

### Pré-requisitos:
- Python 3.11+ instalado e disponível no PATH.
- Node.js LTS (v18, v20 ou v24) e NPM instalados.

### 5.1 Inicialização Rápida (Script Único)
No terminal PowerShell da raiz do projeto:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\start-all.ps1
```

### 5.2 Inicialização Manual

#### Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

- **Frontend:** [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **API Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Credenciais Demonstrativas:**
  - **Administrador:** `admin@gestormei.com.br` / `admin123`
  - **Operador:** `operador@gestormei.com.br` / `operador123`

---

## 6. Execução de Testes Automatizados

Na pasta `backend/`:
```bash
pytest tests/ -v
```
Todos os 19 testes automatizados das Sprints 2, 3 e 4 (CRUD de clientes, vendas com carrinho, cálculo automático de totais, impacto no caixa, demonstrativo DASN-SIMEI, ciclo de status do pedido, vinculação de motoboys, relatórios logísticos, comanda térmica ESC/POS, controle de estoque com entradas/saídas manuais, ajuste de inventário, baixa automática no PDV, estorno em cancelamento e alertas de estoque crítico) devem rodar com 100% de aprovação.

---

## 7. Arquitetura para Impressão Térmica ESC/POS

O endpoint `GET /api/vendas/{id}/comanda-texto` gera o payload de texto puro formatado para bobinas térmicas de 58mm (32 colunas) e 80mm (48 colunas).

### Como integrar com impressoras físicas no futuro:
1. **Pelo Navegador (Sem Instalação Extra):** No modal "Comanda Térmica", o botão "Imprimir Comanda" aciona `window.print()` estilizado com CSS `@media print` já ajustado para largura de 80mm.
2. **Via Driver Raw / Spooler (Windows):** O backend pode receber uma flag para despachar os bytes brutos diretamente para a impressora compartilhada na rede via `win32print` ou conexão Socket TCP direta (porta padrão `9100`).
3. **Via Aplicativos Mobile (Android/iOS):** Integração com apps como *RawBT* através de intent URI (`rawbt:data`).

---

## 8. Guia de Deploy em Produção

### 8.1 Backend & Banco PostgreSQL no Render:
1. Crie uma instância de **PostgreSQL** no Render.
2. Crie um **Web Service** conectado ao seu repositório GitHub na pasta raiz ou subpasta `backend`.
3. Variáveis de Ambiente recomendadas:
   - `DATABASE_URL`: `postgresql://usuario:senha@host:5432/banco`
   - `SECRET_KEY`: Chave criptográfica aleatória segura de 64 caracteres.
   - `PORT`: 8000
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 8.2 Frontend no Vercel:
1. Importe o repositório no Vercel.
2. Defina o **Root Directory** como `frontend`.
3. Framework Preset: **Vite**.
4. Variável de Ambiente:
   - `VITE_API_URL`: URL pública da sua API no Render (ex: `https://gestor-mei-api.onrender.com/api`).
5. Deploy com 1 clique.
