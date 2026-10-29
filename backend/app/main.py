from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
from app.database import Base, engine, get_db
from app.seed import seed_database
from app.migrate_sprint4 import run_migration as run_migration_sprint4
from app.migrate_sprint5 import run_migration as run_migration_sprint5

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
    backup
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Sistema web SaaS profissional para Microempreendedores Individuais (MEI) do ramo de alimentação e pequeno comércio.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to initialize DB tables and seed initial data
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    run_migration_sprint4()
    run_migration_sprint5()
    seed_database()

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

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
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
