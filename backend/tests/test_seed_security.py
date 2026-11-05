import pytest
from unittest.mock import patch
from app.config import Settings
from app.scripts.provision_master import validar_senha, provisionar_master
from app.models.user import User, UserRole
from app.database import SessionLocal
from app.seed import seed_database
from app.security import verify_password


def test_settings_seed_policy_defaults():
    # Padrão: ENVIRONMENT=development, SEED_DATABASE=false
    settings = Settings(ENVIRONMENT="development", SEED_DATABASE="false")
    assert settings.is_development is True
    assert settings.should_seed is True


def test_settings_seed_policy_production_blocked():
    # Em produção com SEED_DATABASE=false: seed deve ser bloqueado
    settings = Settings(ENVIRONMENT="production", SEED_DATABASE="false")
    assert settings.is_development is False
    assert settings.should_seed is False


def test_settings_seed_policy_production_explicit_allow():
    # Em produção com SEED_DATABASE=true: seed explícito permitido para homologação
    settings = Settings(ENVIRONMENT="production", SEED_DATABASE="true")
    assert settings.is_development is False
    assert settings.should_seed is True


def test_validar_senha_regras_seguranca():
    # Menor que 8 caracteres
    assert validar_senha("curta") is not None

    # Senhas públicas proibidas
    assert validar_senha("admin123") is not None
    assert validar_senha("master123") is not None
    assert validar_senha("operador123") is not None
    assert validar_senha("password") is not None

    # Senha forte aceita
    assert validar_senha("GestorMEI#Seguro2026") is None


def test_seed_database_blocked_in_production(capsys):
    # Simula chamada do seed com ambiente de produção e base vazia
    with patch("app.seed.settings.ENVIRONMENT", "production"), \
         patch("app.seed.settings.SEED_DATABASE", False):
        
        # Como o banco de testes já tem dados das migrações/fixtures,
        # vamos testar simulando a condição de banco vazio
        with patch("sqlalchemy.orm.Query.first", return_value=None), \
             patch("sqlalchemy.orm.Query.count", return_value=0):
            
            seed_database()
            captured = capsys.readouterr()
            assert "[SEGURANÇA - PRODUÇÃO] BANCO DE DADOS VAZIO DETECTADO!" in captured.out
            assert "A criação automática de usuários e senhas padrão" in captured.out


def test_provisionar_master_sucesso():
    email_teste = "master.seguro@lptitech.com.br"
    nome_teste = "Master Homologação Segura"
    senha_teste = "SenhaForteM@ster2026!"

    sucesso = provisionar_master(
        email=email_teste,
        nome=nome_teste,
        senha=senha_teste,
        forcar=True
    )
    assert sucesso is True

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email_teste).first()
        assert user is not None
        assert user.nome == nome_teste
        assert user.role == UserRole.MASTER
        assert user.ativo is True
        assert verify_password(senha_teste, user.hashed_password) is True
    finally:
        # Limpeza do usuário de teste
        if user:
            db.delete(user)
            db.commit()
        db.close()
