import sqlite3
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.nfe import ProdutoVinculoXML, NfeImportada, ItemNfeImportada

def run_migration():
    print("Running Sprint 6 Database Migration (XML NF-e: ProdutosVinculoXML & NfeImportada)...")

    # 1. Create tables via SQLAlchemy
    Base.metadata.create_all(bind=engine)

    # 2. If SQLite, ensure table schema integrity
    if "sqlite" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if db_path.startswith("./"):
            db_path = os.path.join(backend_dir, db_path[2:])
        
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            for table_name in ["produtos_vinculo_xml", "nfe_importadas", "nfe_importadas_itens"]:
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
                if cursor.fetchone():
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    cols = [r[1] for r in cursor.fetchall()]
                    print(f"Table '{table_name}' verified with {len(cols)} columns: {cols}")

            conn.close()

    print("Sprint 6 Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
