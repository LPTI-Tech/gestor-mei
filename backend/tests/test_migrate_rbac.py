import pytest
from app.models.user import UserRole
from app.migrate_rbac import run_migration, align_postgresql_userrole_enum
from app.database import engine

def test_userrole_canonical_values():
    """Valida que o Enum UserRole contém os papéis canônicos RBAC."""
    assert UserRole.MASTER.value == "MASTER"
    assert UserRole.OWNER.value == "OWNER"
    assert UserRole.CONSULTOR.value == "CONSULTOR"
    assert UserRole.OPERATOR.value == "OPERATOR"

def test_userrole_backwards_compatibility():
    """Valida compatibilidade reversa para ADMIN e OPERADOR legados."""
    # Lookup por valor string legado
    assert UserRole("ADMIN") == UserRole.OWNER
    assert UserRole("admin") == UserRole.OWNER
    assert UserRole("OPERADOR") == UserRole.OPERATOR
    assert UserRole("operador") == UserRole.OPERATOR

    # Acesso via atributo legado
    assert UserRole.ADMIN == UserRole.OWNER
    assert UserRole.OPERADOR == UserRole.OPERATOR

def test_align_postgresql_enum_callable():
    """Garante que a função de alinhamento de enum do PostgreSQL é executável sem erros."""
    align_postgresql_userrole_enum(engine)

def test_run_migration_rbac_idempotent():
    """Garante que a migração de RBAC pode ser executada repetidamente sem falhas."""
    run_migration()
    run_migration()
