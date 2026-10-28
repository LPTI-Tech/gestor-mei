import sqlite3
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.produto import Produto
from app.models.estoque import MovimentacaoEstoque

def run_migration():
    print("Running Sprint 4 Database Migration (Controle de Estoque)...")

    # 1. Create table movimentacoes_estoque if it doesn't exist via SQLAlchemy
    Base.metadata.create_all(bind=engine)

    # 2. If SQLite, add columns to produtos if not present
    if "sqlite" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if db_path.startswith("./"):
            db_path = os.path.join(backend_dir, db_path[2:])
        
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            cursor.execute("PRAGMA table_info(produtos)")
            cols = [r[1] for r in cursor.fetchall()]

            if "quantidade_estoque" not in cols:
                print("Adding column 'quantidade_estoque' to produtos...")
                cursor.execute("ALTER TABLE produtos ADD COLUMN quantidade_estoque FLOAT DEFAULT 0.0")

            if "estoque_minimo" not in cols:
                print("Adding column 'estoque_minimo' to produtos...")
                cursor.execute("ALTER TABLE produtos ADD COLUMN estoque_minimo FLOAT DEFAULT 0.0")

            if "custo_unitario" not in cols:
                print("Adding column 'custo_unitario' to produtos...")
                cursor.execute("ALTER TABLE produtos ADD COLUMN custo_unitario FLOAT DEFAULT 0.0")

            # Update null values
            cursor.execute("UPDATE produtos SET quantidade_estoque = 0.0 WHERE quantidade_estoque IS NULL")
            cursor.execute("UPDATE produtos SET estoque_minimo = 5.0 WHERE estoque_minimo IS NULL OR estoque_minimo = 0.0")
            cursor.execute("UPDATE produtos SET custo_unitario = ROUND(preco_venda * 0.45, 2) WHERE custo_unitario IS NULL OR custo_unitario = 0.0")
            cursor.execute("UPDATE produtos SET quantidade_estoque = 25.0 WHERE quantidade_estoque = 0.0")

            conn.commit()
            conn.close()
            print("SQLite columns updated for produtos.")

    # 3. For PostgreSQL
    elif "postgres" in settings.DATABASE_URL:
        with engine.connect() as conn:
            conn.execute("""
                ALTER TABLE produtos ADD COLUMN IF NOT EXISTS quantidade_estoque FLOAT DEFAULT 0.0;
                ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_minimo FLOAT DEFAULT 0.0;
                ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_unitario FLOAT DEFAULT 0.0;
            """)
            conn.commit()
            print("PostgreSQL columns updated for produtos.")

    print("Sprint 4 Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
