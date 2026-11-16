"""
Migração: PIN de autorização e teto de desconto na tabela empresas.
Adiciona 'pin_autorizacao' (default '1234') e 'desconto_maximo_percentual' (default 10.0).
"""
from sqlalchemy import text
from app.database import SessionLocal, engine


def run_migration():
    print("[MIGRATE PIN/DESCONTO] Verificando colunas de PIN e desconto na tabela empresas...")
    db = SessionLocal()
    try:
        is_sqlite = engine.url.drivername.startswith("sqlite")
        with engine.connect() as conn:
            if is_sqlite:
                result = conn.execute(text("PRAGMA table_info(empresas)"))
                cols = [row[1] for row in result.fetchall()]
                if "pin_autorizacao" not in cols:
                    conn.execute(text("ALTER TABLE empresas ADD COLUMN pin_autorizacao VARCHAR(10) DEFAULT '1234'"))
                    print("[MIGRATE PIN/DESCONTO] Coluna 'pin_autorizacao' adicionada em empresas.")
                if "desconto_maximo_percentual" not in cols:
                    conn.execute(text("ALTER TABLE empresas ADD COLUMN desconto_maximo_percentual FLOAT DEFAULT 10.0"))
                    print("[MIGRATE PIN/DESCONTO] Coluna 'desconto_maximo_percentual' adicionada em empresas.")
            else:
                conn.execute(text("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS pin_autorizacao VARCHAR(10) DEFAULT '1234'"))
                conn.execute(text("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS desconto_maximo_percentual FLOAT DEFAULT 10.0"))
                print("[MIGRATE PIN/DESCONTO] Colunas verificadas no PostgreSQL.")
            conn.commit()

        # Garante valores default para registros existentes
        db.execute(text("UPDATE empresas SET pin_autorizacao = '1234' WHERE pin_autorizacao IS NULL"))
        db.execute(text("UPDATE empresas SET desconto_maximo_percentual = 10.0 WHERE desconto_maximo_percentual IS NULL"))
        db.commit()
        print("[MIGRATE PIN/DESCONTO] Migração concluída com sucesso.")
    except Exception as e:
        db.rollback()
        print(f"[MIGRATE PIN/DESCONTO] Erro na migração: {e}")
        raise e
    finally:
        db.close()
