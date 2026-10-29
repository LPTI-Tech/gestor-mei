import pytest
from app.database import Base, engine
from app.migrate_sprint4 import run_migration as run_migration_sprint4
from app.migrate_sprint5 import run_migration as run_migration_sprint5
from app.migrate_sprint6 import run_migration as run_migration_sprint6
from app.migrate_sprint7 import run_migration as run_migration_sprint7
from app.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_database_for_tests():
    Base.metadata.create_all(bind=engine)
    run_migration_sprint4()
    run_migration_sprint5()
    run_migration_sprint6()
    run_migration_sprint7()
    seed_database()

