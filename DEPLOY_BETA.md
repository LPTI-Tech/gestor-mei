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

| Key | Value de Exemplo / Instrução | Requisito de Segurança (Sprint Security 1) |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | **Obrigatório** para ativar blindagem, validação de chaves e bloqueio de seed automático |
| `DATABASE_URL` | `postgresql://usuario:senha@ep-exemplo.neon.tech/neondb?sslmode=require` | String SSL do Neon/Supabase |
| `SECRET_KEY` | *(64 caracteres hexadecimais aleatórios)* | **Crítico:** Mínimo 32 caracteres. Gerar com `openssl rand -hex 32` ou `python -c "import secrets; print(secrets.token_hex(32))"`. Startup bloqueado se ausente, padrão ou < 32 chars |
| `ALGORITHM` | `HS256` | Algoritmo de assinatura JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` *(7 dias de sessão contínua para facilidade dos MEIs piloto)* | Tempo de expiração do JWT |
| `CORS_ORIGINS` | `["https://gestor-mei.vercel.app","https://gestormei.com.br","https://www.gestormei.com.br"]` | **Origens estritas autorizadas.** O uso de `*` é terminantemente bloqueado em produção |
| `SEED_DATABASE` | `false` | Em produção, o seed automático é desativado por padrão. Nenhuma credencial padrão é criada |
| `MEI_DEFAULT_ANNUAL_LIMIT` | `81000.00` | Teto fiscal MEI |
| `PYTHON_VERSION` | `3.11.9` | Versão runtime Python no Render |
| `R2_ACCOUNT_ID` | *(Cloudflare Account ID)* | **Obrigatório para Storage Persistente:** ID da conta Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | *(R2 Token Access Key ID)* | Chave de acesso S3 gerada no painel Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | *(R2 Token Secret Access Key)* | Chave secreta S3 gerada no painel Cloudflare R2 |
| `R2_BUCKET_NAME` | `gestor-mei-storage` | Nome do bucket R2 para armazenamento de comprovantes e XMLs |

### 3.3 Health Check do Render
Na seção **Advanced Settings**:
- **Health Check Path:** `/api/health`

### 3.4 Migração e Provisionamento Seguro de Usuários
No evento de startup do FastAPI ([main.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/main.py)):
1. `settings.validate_production_security()`: Valida preventivamente `SECRET_KEY` e regras de `CORS_ORIGINS`. Se houver inconformidade, aborta o startup com log explicativo.
2. `Base.metadata.create_all(bind=engine)`: Cria as tabelas do PostgreSQL.
3. Migrações automáticas de schema: `run_migration_sprint4()`, `run_migration_sprint5()`, `run_migration_sprint6()`, `run_migration_sprint7()`, `run_migration_rbac()`, `run_migration_sprint8b()`.
4. **Provisionamento Inicial (Zero Senhas Padrão):**  
   Em ambiente `production`, **nenhum usuário demonstrativo ou senha padrão é criado**. Para criar o primeiro usuário `MASTER` da plataforma, acesse o terminal do Web Service no Render (Render Shell) e execute o utilitário seguro:
   ```bash
   python app/scripts/provision_master.py
   ```
   Consulte o guia completo em [docs/PROVISIONAMENTO_MASTER.md](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/docs/PROVISIONAMENTO_MASTER.md).

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

## 5. Passo 4 — Blindagem de CORS e Proteção contra Força Bruta (Rate Limiting)

### 5.1 Política Estrita de CORS (Cross-Origin Resource Sharing)
No [main.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/main.py), a configuração de CORS foi enrijecida na **Sprint Security 1**:
- **Origem genérica `*` removida:** Inaceitável em produção.
- **Regex aberta Vercel removida:** Domínios arbitrários do tipo `https://*.vercel.app` não têm mais acesso à API.
- **Apenas domínios autorizados:** `https://gestor-mei.vercel.app`, `https://gestormei.com.br`, `https://www.gestormei.com.br` e URLs cadastradas explicitamente via variável `CORS_ORIGINS`.
- **Validação de Startup:** Se `ENVIRONMENT=production` e `*` for injetado, o servidor recusa a inicialização com `RuntimeError`.

### 5.2 Rate Limiting por IP (Proteção Anti-Brute Force)
Endpoints sensíveis são protegidos por limitação de taxa via `slowapi`:
- **`/api/auth/login`:** Máximo de **5 tentativas por minuto** por endereço IP.
- **`/api/auth/esqueci-senha`:** Máximo de **3 solicitações por 15 minutos** por endereço IP.
- Ao ultrapassar a cota, o servidor responde imediatamente com **HTTP 429 Too Many Requests**, payload JSON estruturado (`error: "rate_limit_exceeded"`) e cabeçalho `Retry-After: 60`.

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
Abra a URL fornecida pela Vercel (`https://gestor-mei.vercel.app`) e realize o login com o usuário provisionado pelo CLI seguro (ou, em ambiente de homologação local/dev, com as credenciais de teste configuradas).

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

