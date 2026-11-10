"""
Migração - Suporte Master Mode: Tabela de Auditoria de Suporte.
Cria a tabela 'auditoria_suporte' caso não exista.
"""

from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.models.suporte_audit import AuditoriaSuporte


def run_migration():
    print("[MIGRATE SUPORTE] Verificando tabela auditoria_suporte...")
    db = SessionLocal()
    try:
        AuditoriaSuporte.__table__.create(bind=engine, checkfirst=True)
        print("[MIGRATE SUPORTE] Tabela auditoria_suporte verificada/criada com sucesso.")
    except Exception as e:
        print(f"[MIGRATE SUPORTE] Erro ao verificar tabela auditoria_suporte: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
