import os
from fastapi import FastAPI, Depends
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
from app.database import Base, engine, get_db
from app.seed import seed_database
from app.migrate_sprint4 import run_migration as run_migration_sprint4
from app.migrate_sprint5 import run_migration as run_migration_sprint5
from app.migrate_sprint6 import run_migration as run_migration_sprint6
from app.migrate_sprint7 import run_migration as run_migration_sprint7
from app.migrate_rbac import run_migration as run_migration_rbac
from app.migrate_sprint8b import run_migration as run_migration_sprint8b
from app.migrate_operacao_real1 import run_migration as run_migration_operacao_real1
from app.migrate_unique_produto import run_migration as run_migration_unique_produto

# Import routers
from app.routers import (
    auth,
    empresas,
    users,
    clientes,
    regioes_entrega,
    produtos,
    estoque,
    vendas,
    caixa,
    despesas,
    motoboys,
    ifood,
    das,
    dashboard,
    relatorio_mei,
    saude_negocio,
    relatorio_entregas,
    backup,
    nfe,
    compras,
    consultor
)
from app.rate_limiter import limiter, rate_limit_exceeded_handler, RateLimitExceeded

docs_enabled = settings.should_enable_docs

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Sistema web SaaS profissional para Microempreendedores Individuais (MEI) do ramo de alimentação e pequeno comércio.",
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

# Rate Limiter State & Exception Handler (Sprint Security 1)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# CORS Middleware (Sprint Security 1 - Hardened: sem wildcard '*', apenas origens autorizadas)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Startup event to initialize DB tables and seed initial data
@app.on_event("startup")
def on_startup():
    # 0. Validação de Segurança Mandatória para Produção
    settings.validate_production_security()

    Base.metadata.create_all(bind=engine)
    run_migration_sprint4()
    run_migration_sprint5()
    run_migration_sprint6()

    # Sprint Security 1: migrate_sprint7 e seed são bloqueados quando ENV=production
    if not settings.is_production and settings.should_seed:
        run_migration_sprint7()

    run_migration_rbac()
    run_migration_sprint8b()
    run_migration_operacao_real1()
    run_migration_unique_produto()

    if not settings.is_production and settings.should_seed:
        seed_database()

# Diretório de uploads (Sprint Security: montagem estática pública e redirecionamentos desativados)
# Arquivos são servidos exclusivamente com autenticação Bearer e validação multi-tenant via /api/compras/comprovantes/{filename}
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
uploads_dir = os.path.join(backend_root, "uploads")
os.makedirs(os.path.join(uploads_dir, "comprovantes"), exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "produtos"), exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "logos"), exist_ok=True)

# Include Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(empresas.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(clientes.router, prefix=settings.API_PREFIX)
app.include_router(regioes_entrega.router, prefix=settings.API_PREFIX)
app.include_router(produtos.router, prefix=settings.API_PREFIX)
app.include_router(estoque.router, prefix=settings.API_PREFIX)
app.include_router(vendas.router, prefix=settings.API_PREFIX)
app.include_router(caixa.router, prefix=settings.API_PREFIX)
app.include_router(despesas.router, prefix=settings.API_PREFIX)
app.include_router(motoboys.router, prefix=settings.API_PREFIX)
app.include_router(ifood.router, prefix=settings.API_PREFIX)
app.include_router(das.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(relatorio_mei.router, prefix=settings.API_PREFIX)
app.include_router(saude_negocio.router, prefix=settings.API_PREFIX)
app.include_router(relatorio_entregas.router, prefix=settings.API_PREFIX)
app.include_router(backup.router, prefix=settings.API_PREFIX)
app.include_router(nfe.router, prefix=settings.API_PREFIX)
app.include_router(compras.router, prefix=settings.API_PREFIX)
app.include_router(consultor.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs" if settings.should_enable_docs else None,
        "message": "GESTOR MEI API pronta para conexão."
    }

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(e)
        }
