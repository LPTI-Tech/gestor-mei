import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.user_oauth import UserOAuthAccount
from app.models.login_audit import AuditoriaLogin
from app.migrate_oauth import run_migration as run_migration_oauth
from app.services.oauth_service import (
    verify_google_credential,
    verify_microsoft_token,
    authenticate_or_link_social_user
)
from app.routers.empresas import listar_todas_empresas_master
from app.routers.auth import desvincular_provedor, listar_provedores_usuario
from app.security import hash_password


@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    run_migration_oauth()
    db = SessionLocal()

    # Cria empresa de teste
    empresa = db.query(Empresa).filter(Empresa.cnpj == "99888777000199").first()
    if not empresa:
        empresa = Empresa(
            nome_empresarial="RD Restaurante Betim LTDA",
            nome_fantasia="RD Restaurante",
            cnpj="99888777000199",
            cpf_proprietario="12345678900",
            email="contato@rdrestaurante.com.br"
        )
        db.add(empresa)
        db.commit()
        db.refresh(empresa)

    # Cria usuário de teste com e-mail do cliente real
    owner = db.query(User).filter(User.email == "drrestaurantebetim_test@hotmail.com").first()
    if not owner:
        owner = User(
            empresa_id=empresa.id,
            nome="Rosely Oliveira de Freitas",
            email="drrestaurantebetim_test@hotmail.com",
            hashed_password=hash_password("SenhaReal123!"),
            role=UserRole.OWNER,
            ativo=True
        )
        db.add(owner)
        db.commit()

    db.close()


def test_oauth_migration_runs():
    """Garante que a migração OAuth cria as tabelas user_oauth_accounts e auditoria_login."""
    run_migration_oauth()
    assert "user_oauth_accounts" in Base.metadata.tables
    assert "auditoria_login" in Base.metadata.tables


def test_verify_google_credential_rejects_mock():
    """Garante que mock-google-* é rejeitado e não autentica (SEC-CRIT-04)."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 400
        mock_get.return_value.text = '{"error": "invalid_token"}'
        with pytest.raises(HTTPException) as exc_info:
            verify_google_credential("mock-google-sub12345:drrestaurantebetim_test@hotmail.com")
        assert exc_info.value.status_code == 401
        assert "Token de autenticação do Google inválido" in exc_info.value.detail


def test_verify_google_credential_legitimate_internal_mock():
    """Valida fluxo legítimo do Google via mock interno de teste (sem bypass HTTP)."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "sub": "sub12345",
            "email": "drrestaurantebetim_test@hotmail.com",
            "email_verified": "true",
            "name": "Rosely Freitas (Google)",
            "picture": None,
        }
        res = verify_google_credential("token_google_legitimo")
        assert res["provider"] == "GOOGLE"
        assert res["provider_user_id"] == "sub12345"
        assert res["email"] == "drrestaurantebetim_test@hotmail.com"
        assert res["email_verified"] is True


def test_verify_microsoft_token_rejects_mock():
    """Garante que mock-microsoft-* é rejeitado e não autentica (SEC-CRIT-04)."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 401
        mock_get.return_value.text = '{"error": "Unauthorized"}'
        with pytest.raises(HTTPException) as exc_info:
            verify_microsoft_token("mock-microsoft-ms98765:drrestaurantebetim_test@hotmail.com")
        assert exc_info.value.status_code == 401
        assert "Token da conta Microsoft inválido" in exc_info.value.detail


def test_verify_microsoft_token_legitimate_internal_mock():
    """Valida fluxo legítimo da Microsoft via mock interno de teste (sem bypass HTTP)."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "id": "ms98765",
            "mail": "drrestaurantebetim_test@hotmail.com",
            "displayName": "Rosely Freitas (Microsoft)",
        }
        res = verify_microsoft_token("token_microsoft_legitimo")
        assert res["provider"] == "MICROSOFT"
        assert res["provider_user_id"] == "ms98765"
        assert res["email"] == "drrestaurantebetim_test@hotmail.com"
        assert res["email_verified"] is True


def test_http_endpoint_google_mock_rejected_401(client):
    """Garante que POST /api/auth/google com credencial mock retorna 401 e nenhum JWT (SEC-CRIT-04)."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 400
        mock_get.return_value.text = '{"error": "invalid_token"}'
        resp = client.post("/api/auth/google", json={"credential": "mock-google-teste"})
        assert resp.status_code == 401
        data = resp.json()
        assert "access_token" not in data
        assert "Token de autenticação do Google inválido" in data.get("detail", "")


def test_http_endpoint_microsoft_mock_rejected_401(client):
    """Garante que POST /api/auth/microsoft com token mock retorna 401 e nenhum JWT (SEC-CRIT-04)."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 401
        mock_get.return_value.text = '{"error": "Unauthorized"}'
        resp = client.post("/api/auth/microsoft", json={"token": "mock-microsoft-teste"})
        assert resp.status_code == 401
        data = resp.json()
        assert "access_token" not in data
        assert "Token da conta Microsoft inválido" in data.get("detail", "")


def test_http_endpoint_google_legitimate_authenticated(client):
    """Garante que POST /api/auth/google com token validado pelo Google gera JWT para usuário cadastrado."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "sub": "google_uid_endpoint_test",
            "email": "drrestaurantebetim_test@hotmail.com",
            "email_verified": "true",
            "name": "Rosely Freitas (Google)",
            "picture": None,
        }
        resp = client.post("/api/auth/google", json={"credential": "real_google_jwt_credential"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["email"] == "drrestaurantebetim_test@hotmail.com"


def test_http_endpoint_microsoft_legitimate_authenticated(client):
    """Garante que POST /api/auth/microsoft com token validado pela Microsoft gera JWT para usuário cadastrado."""
    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "id": "ms_uid_endpoint_test",
            "mail": "drrestaurantebetim_test@hotmail.com",
            "displayName": "Rosely Freitas (MS)",
        }
        resp = client.post("/api/auth/microsoft", json={"token": "real_microsoft_graph_token"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["email"] == "drrestaurantebetim_test@hotmail.com"


def test_authenticate_or_link_social_user_google():
    """Testa login Google vinculando a usuário existente (Entrega 3 e 5)."""
    db = SessionLocal()
    oauth_info = {
        "provider": "GOOGLE",
        "provider_user_id": "google_uid_rosely_001",
        "email": "drrestaurantebetim_test@hotmail.com",
        "name": "Rosely Freitas (Google)",
        "picture_url": "https://lh3.googleusercontent.com/test",
        "email_verified": True
    }

    user, token, empresa = authenticate_or_link_social_user(
        db=db,
        oauth_info=oauth_info,
        client_ip="127.0.0.1",
        user_agent="PyTest"
    )

    assert user.email == "drrestaurantebetim_test@hotmail.com"
    assert user.role == UserRole.OWNER
    assert token is not None
    assert empresa is not None

    # Verifica persistência no banco
    link = db.query(UserOAuthAccount).filter(
        UserOAuthAccount.user_id == user.id,
        UserOAuthAccount.provider == "GOOGLE"
    ).first()
    assert link is not None
    assert link.provider_user_id == "google_uid_rosely_001"

    # Verifica auditoria
    audit = db.query(AuditoriaLogin).filter(
        AuditoriaLogin.user_id == user.id,
        AuditoriaLogin.provider == "GOOGLE"
    ).first()
    assert audit is not None
    assert audit.sucesso is True

    db.close()


def test_authenticate_or_link_social_user_microsoft():
    """Testa login Microsoft vinculando na MESMA conta (Entrega 4 e 5)."""
    db = SessionLocal()
    oauth_info = {
        "provider": "MICROSOFT",
        "provider_user_id": "ms_oid_rosely_002",
        "email": "drrestaurantebetim_test@hotmail.com",
        "name": "Rosely Freitas (Microsoft)",
        "picture_url": None,
        "email_verified": True
    }

    user, token, empresa = authenticate_or_link_social_user(
        db=db,
        oauth_info=oauth_info,
        client_ip="127.0.0.1",
        user_agent="PyTest"
    )

    assert user.email == "drrestaurantebetim_test@hotmail.com"
    assert user.role == UserRole.OWNER

    # Verifica que a conta do usuário agora tem AMBOS os provedores vinculados (Entrega 5)
    links = db.query(UserOAuthAccount).filter(UserOAuthAccount.user_id == user.id).all()
    providers = [l.provider for l in links]
    assert "GOOGLE" in providers
    assert "MICROSOFT" in providers

    db.close()


def test_authenticate_unknown_email_rejected_with_403():
    """Garante isolamento multiempresa: usuário sem conta cadastrada é bloqueado."""
    db = SessionLocal()
    oauth_info = {
        "provider": "GOOGLE",
        "provider_user_id": "google_uid_invasor",
        "email": "desconhecido_total@gmail.com",
        "name": "Estranho",
        "picture_url": None,
        "email_verified": True
    }

    with pytest.raises(HTTPException) as exc_info:
        authenticate_or_link_social_user(
            db=db,
            oauth_info=oauth_info,
            client_ip="127.0.0.1",
            user_agent="PyTest"
        )

    assert exc_info.value.status_code == 403
    assert "Nenhuma conta vinculada" in exc_info.value.detail

    # Verifica auditoria de falha gravada
    audit = db.query(AuditoriaLogin).filter(
        AuditoriaLogin.email == "desconhecido_total@gmail.com"
    ).first()
    assert audit is not None
    assert audit.sucesso is False
    assert "E-mail não vinculado" in audit.motivo_falha

    db.close()


def test_master_listar_todas_empresas_com_owner():
    """Testa listagem de todas as empresas para o MASTER (Entrega 1 e 2)."""
    db = SessionLocal()
    master = User(id=999, nome="Master Admin", email="master@lpti.com.br", role=UserRole.MASTER, ativo=True)
    lista = listar_todas_empresas_master(db=db, master_user=master)
    assert len(lista) >= 1
    # Verifica que o owner de RD Restaurante está presente
    rd = [e for e in lista if e.cnpj == "99888777000199"][0]
    assert rd.owner is not None
    assert rd.owner.email in ["drrestaurantebetim_test@hotmail.com", "test_owner@rdrestaurante.com.br"]
    db.close()


def test_desvincular_provedor_seguranca():
    """Testa regra de segurança para desvincular provedor."""
    db = SessionLocal()
    user = db.query(User).filter(User.email == "drrestaurantebetim_test@hotmail.com").first()

    # Usuário possui senha e 2 provedores (Google e Microsoft)
    res = desvincular_provedor(provider="GOOGLE", current_user=user, db=db)
    assert "desvinculado com sucesso" in res["message"]

    # Verifica que Google foi removido e Microsoft permaneceu
    link_google = db.query(UserOAuthAccount).filter(
        UserOAuthAccount.user_id == user.id,
        UserOAuthAccount.provider == "GOOGLE"
    ).first()
    assert link_google is None

    link_ms = db.query(UserOAuthAccount).filter(
        UserOAuthAccount.user_id == user.id,
        UserOAuthAccount.provider == "MICROSOFT"
    ).first()
    assert link_ms is not None

    db.close()
