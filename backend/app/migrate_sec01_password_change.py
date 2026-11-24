"""
Migração SEC-01-A — Troca Obrigatória de Senha no Primeiro Acesso.
Adiciona as colunas 'must_change_password' e 'password_changed_at' à tabela 'users'.
Compatível com SQLite e PostgreSQL de forma estritamente idempotente.
Garante que todos os usuários já cadastrados permaneçam com must_change_password = False.
"""

from sqlalchemy import text
from app.database import SessionLocal, engine


def run_migration():
    print("[MIGRATE SEC-01-A] Verificando colunas 'must_change_password' e 'password_changed_at' na tabela users...")
    db = SessionLocal()
    try:
        is_sqlite = engine.url.drivername.startswith("sqlite")

        with engine.connect() as conn:
            if is_sqlite:
                result = conn.execute(text("PRAGMA table_info(users)"))
                existing_cols = [row[1] for row in result.fetchall()]

                if "must_change_password" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0 NOT NULL"))
                    print("[MIGRATE SEC-01-A] Coluna 'must_change_password' adicionada em users (SQLite).")
                else:
                    print("[MIGRATE SEC-01-A] Coluna 'must_change_password' já existe em users (SQLite).")

                if "password_changed_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_changed_at DATETIME"))
                    print("[MIGRATE SEC-01-A] Coluna 'password_changed_at' adicionada em users (SQLite).")
                else:
                    print("[MIGRATE SEC-01-A] Coluna 'password_changed_at' já existe em users (SQLite).")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE NOT NULL"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITHOUT TIME ZONE"))
                print("[MIGRATE SEC-01-A] Colunas 'must_change_password' e 'password_changed_at' verificadas em users (PostgreSQL).")

            conn.commit()

        # Garante que registros pré-existentes não tenham must_change_password nulo
        db.execute(
            text(
                "UPDATE users SET must_change_password = 0 WHERE must_change_password IS NULL"
                if is_sqlite
                else "UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL"
            )
        )
        db.commit()
        print("[MIGRATE SEC-01-A] Migração SEC-01-A finalizada com sucesso.")

    except Exception as e:
        db.rollback()
        print(f"[MIGRATE SEC-01-A] Erro durante a migração SEC-01-A: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
