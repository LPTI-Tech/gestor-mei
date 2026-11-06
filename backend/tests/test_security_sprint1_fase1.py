import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from app.config import Settings
from app.dependencies import require_master, require_admin
from app.models.user import User, UserRole
from app.migrate_sprint7 import run_migration as run_migration_sprint7
from app.seed import seed_database
import app.migrate_rbac as migrate_rbac_module


# ==============================================================================
# 1. TESTES: MASTER DEPENDENTE EXCLUSIVAMENTE DE VARIÁVEIS DE AMBIENTE
# ==============================================================================

def test_master_requires_env_vars_and_no_default_master123():
    """Garante que sem MASTER_EMAIL e MASTER_PASSWORD, nenhum MASTER com master123 é criado."""
    mock_db = MagicMock()
    # Simula que não há nenhum master no banco
    mock_db.query.return_value.filter.return_value.first.return_value = None

    with patch.dict(os.environ, {"MASTER_EMAIL": "", "MASTER_PASSWORD": ""}, clear=False), \
         patch("app.migrate_rbac.SessionLocal", return_value=mock_db), \
         patch("app.migrate_rbac.engine"), \
         patch("app.migrate_rbac.settings") as mock_settings:

        mock_settings.MASTER_EMAIL = None
        mock_settings.MASTER_PASSWORD = None

        # Executa migration RBAC com env vazio
        migrate_rbac_module.run_migration()

        # Garante que db.add NUNCA foi chamado para criar MASTER
        for call_args in mock_db.add.call_args_list:
            added_obj = call_args[0][0]
            if isinstance(added_obj, User):
                assert added_obj.role != UserRole.MASTER


def test_master_provisioned_when_env_vars_present():
    """Garante que quando MASTER_EMAIL e MASTER_PASSWORD são definidos, o MASTER é provisionado."""
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    test_email = "supermaster@corporativo.com.br"
    test_pass = "ForteSenhaMaster#2026"

    with patch.dict(os.environ, {"MASTER_EMAIL": test_email, "MASTER_PASSWORD": test_pass}, clear=False), \
         patch("app.migrate_rbac.SessionLocal", return_value=mock_db), \
         patch("app.migrate_rbac.engine"), \
         patch("app.migrate_rbac.settings") as mock_settings:

        mock_settings.MASTER_EMAIL = test_email
        mock_settings.MASTER_PASSWORD = test_pass
        mock_settings.MASTER_NAME = "Super MASTER"

        migrate_rbac_module.run_migration()

        # Verifica se db.add foi chamado para o novo MASTER com o e-mail do ambiente
        added_users = [c[0][0] for c in mock_db.add.call_args_list if isinstance(c[0][0], User)]
        assert len(added_users) >= 1
        assert added_users[0].email == test_email
        assert added_users[0].role == UserRole.MASTER


# ==============================================================================
# 2. TESTES: BLOQUEIO DE SEED E SPRINT 7 EM PRODUÇÃO
# ==============================================================================

def test_migrate_sprint7_blocked_in_production():
    """Garante que migrate_sprint7 não toca no banco quando ENVIRONMENT=production."""
    mock_db = MagicMock()

    with patch("app.migrate_sprint7.settings") as mock_settings, \
         patch("app.migrate_sprint7.SessionLocal", return_value=mock_db):

        mock_settings.is_production = True
        mock_settings.should_seed = False

        run_migration_sprint7()

        # SessionLocal nem sequer deve ser chamado
        mock_db.query.assert_not_called()
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_called()


def test_seed_database_blocked_in_production():
    """Garante que seed_database não insere dados quando ENVIRONMENT=production."""
    mock_db = MagicMock()
    # Simula banco vazio
    mock_db.query.return_value.first.return_value = None
    mock_db.query.return_value.count.return_value = 0

    with patch("app.seed.settings") as mock_settings, \
         patch("app.seed.SessionLocal", return_value=mock_db), \
         patch("app.seed.Base.metadata.create_all"):

        mock_settings.is_production = True
        mock_settings.should_seed = False
        mock_settings.ENVIRONMENT = "production"

        seed_database()

        # Nenhuma inserção permitida
        mock_db.add.assert_not_called()
        mock_db.add_all.assert_not_called()


# ==============================================================================
# 3. TESTES: VALIDAÇÃO DE SECRET_KEY EM PRODUÇÃO
# ==============================================================================

def test_production_blocks_default_dev_secret_key():
    """Garante que qualquer tentativa de iniciar com chave padrão em produção levanta erro fatal."""
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="gestor-mei-super-secret-key-change-in-production-2026"
    )
    with pytest.raises(RuntimeError, match="valor padrão público"):
        s.validate_production_security()


def test_production_blocks_empty_secret_key():
    """Garante que SECRET_KEY vazia em produção levanta erro fatal."""
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=""
    )
    with pytest.raises(RuntimeError, match="ausente ou vazia"):
        s.validate_production_security()


def test_production_blocks_short_secret_key():
    """Garante que SECRET_KEY com menos de 32 chars em produção levanta erro fatal."""
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="chave-de-20-caracteres!"
    )
    with pytest.raises(RuntimeError, match="mínimo obrigatório é 32"):
        s.validate_production_security()


def test_production_accepts_valid_32plus_secret_key():
    """Garante que chave com 32+ caracteres criptográficos passe sem erro."""
    s = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
    )
    s.validate_production_security()
    assert s.is_production is True


# ==============================================================================
# 4. TESTES: RESTRIÇÃO DE /api/auth/auditoria-recuperacao AO PERFIL MASTER
# ==============================================================================

def test_auditoria_recuperacao_allows_master_user():
    """Garante que require_master autoriza o usuário MASTER."""
    master = User(id=1, email="master@lptitech.com.br", role=UserRole.MASTER, ativo=True)
    authorized = require_master(master)
    assert authorized.id == 1
    assert authorized.role == UserRole.MASTER


def test_auditoria_recuperacao_blocks_owner_user():
    """Garante que require_master bloqueia usuários OWNER (Proprietários MEI) com HTTP 403."""
    owner = User(id=2, email="owner@marmitaria.com.br", role=UserRole.OWNER, ativo=True)
    with pytest.raises(HTTPException) as exc_info:
        require_master(owner)
    assert exc_info.value.status_code == 403
    assert "exclusivo ao perfil MASTER" in exc_info.value.detail


def test_auditoria_recuperacao_blocks_operator_user():
    """Garante que require_master bloqueia usuários OPERATOR com HTTP 403."""
    operator = User(id=3, email="operador@marmitaria.com.br", role=UserRole.OPERATOR, ativo=True)
    with pytest.raises(HTTPException) as exc_info:
        require_master(operator)
    assert exc_info.value.status_code == 403
    assert "exclusivo ao perfil MASTER" in exc_info.value.detail


def test_auditoria_recuperacao_blocks_consultor_user():
    """Garante que require_master bloqueia usuários CONSULTOR com HTTP 403."""
    consultor = User(id=4, email="consultor@consultoria.com.br", role=UserRole.CONSULTOR, ativo=True)
    with pytest.raises(HTTPException) as exc_info:
        require_master(consultor)
    assert exc_info.value.status_code == 403
    assert "exclusivo ao perfil MASTER" in exc_info.value.detail
