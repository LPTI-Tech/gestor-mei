import sqlite3
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.das import DasMensal

def run_migration():
    print("Running Sprint 5 Database Migration (Controle DAS Mensal)...")

    # 1. Create table das_mensal if it doesn't exist via SQLAlchemy
    Base.metadata.create_all(bind=engine)

    # 2. If SQLite, ensure table schema integrity
    if "sqlite" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if db_path.startswith("./"):
            db_path = os.path.join(backend_dir, db_path[2:])
        
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='das_mensal'")
            if cursor.fetchone():
                cursor.execute("PRAGMA table_info(das_mensal)")
                cols = [r[1] for r in cursor.fetchall()]
                print(f"Table 'das_mensal' verified with {len(cols)} columns: {cols}")

            conn.close()

    print("Sprint 5 Migration completed successfully!")

if __name__ == "__main__":
    run_migration()

