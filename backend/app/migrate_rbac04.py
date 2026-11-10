"""
Migração RBAC 04 — Controle de Status (Ativa/Bloqueada) de Empresas.
Adiciona as colunas 'ativo' e 'motivo_bloqueio' à tabela 'empresas', permitindo
ao perfil MASTER realizar o bloqueio e desbloqueio operacional de clientes.
"""

from sqlalchemy import text
from app.database import SessionLocal, engine, Base


def run_migration():
    print("[MIGRATE RBAC 04] Verificando colunas de status na tabela empresas...")
    db = SessionLocal()
    try:
        is_sqlite = engine.url.drivername.startswith("sqlite")

        with engine.connect() as conn:
            if is_sqlite:
                result = conn.execute(text("PRAGMA table_info(empresas)"))
                existing_cols = [row[1] for row in result.fetchall()]

                if "ativo" not in existing_cols:
                    conn.execute(text("ALTER TABLE empresas ADD COLUMN ativo BOOLEAN DEFAULT 1 NOT NULL"))
                    print("[MIGRATE RBAC 04] Coluna 'ativo' adicionada em empresas (SQLite).")

                if "motivo_bloqueio" not in existing_cols:
                    conn.execute(text("ALTER TABLE empresas ADD COLUMN motivo_bloqueio VARCHAR(255)"))
                    print("[MIGRATE RBAC 04] Coluna 'motivo_bloqueio' adicionada em empresas (SQLite).")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL"))
                conn.execute(text("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS motivo_bloqueio VARCHAR(255)"))
                print("[MIGRATE RBAC 04] Colunas 'ativo' e 'motivo_bloqueio' adicionadas/verificadas em empresas (PostgreSQL).")

            conn.commit()

        # Garante que registros pré-existentes não tenham ativo=None
        db.execute(text("UPDATE empresas SET ativo = 1 WHERE ativo IS NULL" if is_sqlite else "UPDATE empresas SET ativo = TRUE WHERE ativo IS NULL"))
        db.commit()
        print("[MIGRATE RBAC 04] Migração RBAC 04 finalizada com sucesso.")

    except Exception as e:
        db.rollback()
        print(f"[MIGRATE RBAC 04] Erro durante a migração: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
