# Arquitetura & Infraestrutura — Gestor MEI

Este documento descreve a topologia técnica, modelo de dados multiempresa e a infraestrutura de nuvem que sustentam o **GESTOR MEI**.

---

## 1. Topologia em Nuvem (Produção)

```
                       ┌────────────────────────────┐
                       │       DNS / DOMÍNIO        │
                       │   gestormei.com.br         │
                       └──────────────┬─────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│     FRONTEND (Vercel)   │                         │     BACKEND (Render)    │
│  - React 18 / Vite SPA  │                         │  - FastAPI Web Service  │
│  - Edge Global CDN      │                         │  - Python 3.10+ / Linux │
│  - SSL Nativo Automático│                         │  - Uvicorn Asynchronous │
└───────────┬─────────────┘                         └────────────┬────────────┘
            │                                                    │
            │ Chamadas REST Seguras (JWT Bearer)                │ SQLAlchemy 2.0 Pool
            └───────────────────────────────────────────────────►│ (SSL Require)
                                                                 │
                                                    ┌────────────┴────────────┐
                                                    │   BANCO DE DADOS (Neon) │
                                                    │  - PostgreSQL 16        │
                                                    │  - Serverless Storage   │
                                                    │  - Auto-scaling & Pool  │
                                                    └─────────────────────────┘
```

---

## 2. Padrão de Isolamento Multiempresa (Multi-tenancy)

No Gestor MEI, o isolamento entre microempresas é garantido logicamente a nível de banco de dados por chave estrangeira obrigatória:

1. **Chave `empresa_id` em Todas as Tabelas Operacionais:**
   - `users` $\to$ `empresa_id`
   - `produtos` $\to$ `empresa_id`
   - `vendas` $\to$ `empresa_id`
   - `caixa_turnos` $\to$ `empresa_id`
   - `despesas` $\to$ `empresa_id`
   - `clientes` $\to$ `empresa_id`
   - `compras` $\to$ `empresa_id`
2. **Injeção de Dependência no FastAPI (`get_current_user`):**
   - O token JWT descriptografado identifica o usuário e seu respectivo `empresa_id`.
   - Todas as consultas executam `.filter(Model.empresa_id == current_user.empresa_id)`.
   - **Exceção de MASTER:** Usuários do tipo `MASTER` podem filtrar ou alternar o `empresa_id` conforme a necessidade de suporte.

---

## 3. Configurações de Ambiente (Environment Variables)

### Backend (`.env` ou Painel do Render)
```env
# Banco de dados Neon
DATABASE_URL=postgresql://usuario:senha@ep-host.neon.tech/gestor_mei?sslmode=require

# Segurança
SECRET_KEY=gestor-mei-super-secret-key-change-in-production-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS (Permitir Vercel e Localhost)
CORS_ORIGINS=["https://gestor-mei.vercel.app","http://localhost:5173","http://127.0.0.1:5173"]

# Regras MEI
MEI_DEFAULT_ANNUAL_LIMIT=81000.00
```

### Frontend (`.env` ou Painel da Vercel)
```env
VITE_API_URL=https://gestor-mei-backend.onrender.com/api
```

---

## 4. Healthcheck e Resiliência

O backend disponibiliza o endpoint `/api/health` para verificações automáticas:
- Retorna `{ "status": "ok", "db": "connected", "version": "1.4.0" }`.
- O frontend monitora este endpoint a cada 15 segundos através do componente `ApiStatusIndicator.tsx`.
- Permite manter instâncias ativas do Render e alertar o usuário instantaneamente em caso de oscilações de rede.
