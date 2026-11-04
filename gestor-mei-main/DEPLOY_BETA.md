# 🚀 Guia de Deploy do Ambiente Beta — GESTOR MEI

> **Versão:** 1.4.0 (Ambiente Beta / Produção Piloto)  
> **Arquitetura:** Frontend (Vercel) + Backend (Render) + Banco de Dados (Neon / Supabase PostgreSQL)  
> **Data:** 29 de Outubro de 2026  
> **Autor:** Leonidas Paulino / Equipe LPTI Tech  

---

## 1. Visão Geral da Arquitetura em Nuvem

Para a fase de testes controlados (Beta Piloto), o **Gestor MEI** adota uma arquitetura Serverless/Cloud moderna, de baixo custo (100% elegível aos planos gratuitos dos provedores) e de alta disponibilidade:

```
                  ┌───────────────────────────────────────────────┐
                  │                 USUÁRIO / BROWSER              │
                  │    (Computador, Tablet ou Smartphone MEI)     │
                  └───────────────────────┬───────────────────────┘
                                          │
                     HTTPS / WSS          │           HTTPS / REST
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
              ┌────────────────────────┐      ┌────────────────────────┐
              │   FRONTEND NA VERCEL   │      │   BACKEND NO RENDER    │
              │   (React + Vite + MUI) │─────▶│    (FastAPI + Python)  │
              │ gestor-mei.vercel.app  │ CORS │ gestor-mei.onrender.com│
              └────────────────────────┘      └───────────┬────────────┘
                                                          │
                                         PostgreSQL / SSL │ (Porta 5432 / 6543)
                                                          ▼
                                              ┌────────────────────────┐
                                              │   BANCO DE DADOS CLOUD │
                                              │   (Neon ou Supabase)   │
                                              │   PostgreSQL 15 / 16   │
                                              └────────────────────────┘
```

---

## 2. Passo 1 — Banco de Dados PostgreSQL (Neon ou Supabase)

Recomendamos o **Neon Database** (Serverless Postgres com autosuspend e branch instantâneo) ou o **Supabase**.

### Opção A: Neon Database (Recomendada)
1. Acesse [https://neon.tech](https://neon.tech) e crie uma conta gratuita.
2. Clique em **"New Project"**:
   - **Project Name:** `gestor-mei-beta`
   - **Postgres Version:** 16 (ou 15)
   - **Region:** US East (Ohio / N. Virginia) ou a mais próxima do Render.
3. No painel principal (**Dashboard**), copie a string de conexão na seção **"Connection Details"**:
   - Selecione a opção **Connection string** (Pooled ou Direct).
   - O formato será:
     ```text
     postgresql://usuario:senha@ep-exemplo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

### Opção B: Supabase
1. Acesse [https://supabase.com](https://supabase.com) e crie um novo projeto.
2. Em **Project Settings ➔ Database ➔ Connection String**, copie a URL em modo **URI** (porta 5432 ou 6543 Pooler).

> [!IMPORTANT]
> O backend do Gestor MEI possui normalizador automático no [config.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/config.py). Caso sua plataforma forneça a URL iniciando com `postgres://`, o sistema converterá em tempo de inicialização para `postgresql://`, garantindo compatibilidade com o SQLAlchemy 2.0.

---

## 3. Passo 2 — Backend FastAPI no Render

O **Render** hospeda o serviço FastAPI com suporte a builds automáticas via GitHub.

### 3.1 Criar o Web Service
1. Acesse [https://render.com](https://render.com) e conecte sua conta GitHub.
2. Clique em **"New +" ➔ "Web Service"**.
3. Selecione o repositório `gestor-mei` (ou `gestor-mei-main`).
4. Preencha as configurações fundamentais:

| Campo | Valor Exato | Observação |
| :--- | :--- | :--- |
| **Name** | `gestor-mei-backend` | Define o subdomínio `.onrender.com` |
| **Region** | `Oregon (US West)` ou `Ohio` | Mesma região ou próxima do banco de dados |
| **Branch** | `main` | Branch estável homologada |
| **Root Directory** | `backend` | **Obrigatório** apontar para a subpasta da API |
| **Runtime** | `Python 3` | Ambiente Python gerenciado |
| **Build Command** | `pip install -r requirements.txt` | Instala FastAPI, Uvicorn, SQLAlchemy e Psycopg2 |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Inicializa o servidor ASGI com porta dinâmica |
| **Instance Type** | `Free` | Suficiente para o ambiente Beta |

### 3.2 Variáveis de Ambiente no Render
Na aba **"Environment"** do serviço no Render, adicione as seguintes variáveis:

| Key | Value de Exemplo / Instrução |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://usuario:senha@ep-exemplo.neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | *(Clique em "Generate" ou cole 64 caracteres hexadecimais aleatórios)* |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` *(7 dias de sessão contínua para facilidade dos MEIs piloto)* |
| `MEI_DEFAULT_ANNUAL_LIMIT` | `81000.00` |
| `PYTHON_VERSION` | `3.11.9` |

### 3.3 Health Check do Render
Na seção **Advanced Settings**:
- **Health Check Path:** `/api/health`

### 3.4 Migração e Seeding Automáticos
No evento de startup do FastAPI ([main.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/main.py#L56-L63)), o sistema executa automaticamente:
1. `Base.metadata.create_all(bind=engine)`: Cria todas as tabelas no PostgreSQL.
2. `run_migration_sprint4()`, `run_migration_sprint5()`, `run_migration_sprint6()` e `run_migration_sprint7()`: Garante colunas de estoque, regras de NF-e e perfis.
3. `seed_database()`: Popula as contas demonstrativas, clientes e catálogo inicial caso o banco esteja vazio.

---

## 4. Passo 3 — Frontend React na Vercel

A **Vercel** fornece CDN global edge de alta velocidade com build otimizada via Vite.

### 4.1 Importar o Projeto
1. Acesse [https://vercel.com](https://vercel.com) e clique em **"Add New..." ➔ "Project"**.
2. Selecione o repositório `gestor-mei`.
3. Defina as configurações de build:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Clique em *Edit* e selecione `frontend`.
   - **Build Command:** `npm run build` (ou `tsc && vite build`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 4.2 Variáveis de Ambiente na Vercel
Na seção **Environment Variables**, configure:

| Key | Value | Descrição |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://gestor-mei-backend.onrender.com/api` | URL pública do backend no Render com sufixo `/api` |

> [!WARNING]
> Certifique-se de **não colocar barra no final** (`/`) em `VITE_API_URL` para evitar duplicidade de barras nas requisições do Axios.

### 4.3 Roteamento SPA (`vercel.json`)
O arquivo [frontend/vercel.json](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/frontend/vercel.json) já está configurado na raiz do frontend com as regras de reescrita:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
Isso garante que ao recarregar a página (F5) em rotas profundas como `/compras/1`, `/consultor` ou `/estoque`, o servidor não retorne `404 Not Found`.

---

## 5. Passo 4 — Ajuste Fino de CORS e Conexão

No [main.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/main.py#L46-L53), o backend já conta com o regex permissivo de domínios Vercel:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Qualquer branch ou URL definitiva gerada pela Vercel (`https://gestor-mei.vercel.app`) é autorizada nativamente sem necessidade de rebuild no backend.

---

## 6. Passo 5 — Homologação & Validação do Deploy Beta

Após a conclusão das builds na Vercel e no Render:

### 1. Teste de Saúde da API:
Abra no navegador:
```text
https://gestor-mei-backend.onrender.com/api/health
```
Resposta esperada (HTTP 200):
```json
{
  "status": "ok",
  "database": "connected",
  "app": "GESTOR MEI",
  "version": "1.4.0"
}
```

### 2. Teste da Documentação Interativa (Swagger):
```text
https://gestor-mei-backend.onrender.com/docs
```

### 3. Acesso à Aplicação Web:
Abra a URL fornecida pela Vercel (ex: `https://gestor-mei.vercel.app`) e realize o login com as contas piloto:

| Perfil | E-mail | Senha | Acesso Principal |
| :--- | :--- | :--- | :--- |
| **Administrador MEI** | `admin@gestormei.com.br` | `admin123` | Dashboard, PDV, Caixa, Estoque, DAS, XML, Compras |
| **Operador de Balcão** | `operador@gestormei.com.br` | `operador123` | PDV Rápido, Caixa, Clientes, Pedidos Delivery |
| **Consultor LPTI Tech** | `consultor@lptitech.com.br` | `consultor123` | Painel do Consultor, Diagnóstico Multiempresa |

---

## 7. Solução de Problemas Comuns (Troubleshooting)

### A. "Cold Start" no Render (Plano Free)
- **Sintoma:** A primeira requisição após 15 minutos de inatividade pode demorar de 30 a 50 segundos para responder.
- **Causa:** O Render suspende instâncias inativas no plano gratuito.
- **Solução:** O frontend possui timeout estendido de 30 segundos no Axios e exibe o indicador visual de conexão no topo. Para produção comercial contínua, basta realizar o upgrade para o plano Starter ($7/mês) no Render.

### B. Erro `SSL connection has been closed unexpectedly` (Neon)
- **Causa:** Conexão ociosa fechada pelo proxy do Neon.
- **Solução:** O Gestor MEI já possui `pool_pre_ping=True` e `pool_recycle=300` configurados em [database.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/database.py#L6-L15), reconectando automaticamente sem interrupção para o usuário.

### C. Erro de CORS no Console do Navegador
- **Sintoma:** `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`.
- **Solução:** Verifique se a variável `VITE_API_URL` na Vercel está com `https://` e sem barra no final. Certifique-se de que o backend já completou o deploy da versão 1.4.0.

