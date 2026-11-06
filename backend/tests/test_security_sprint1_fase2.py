import os
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from starlette.requests import Request

from app.config import Settings
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.empresa_consultor import EmpresaConsultor
from app.models.nfe import NfeImportada
from app.security import create_access_token, decode_token
from app.dependencies import get_current_user, get_current_empresa
from app.rate_limiter import get_real_client_ip, limiter
from app.routers.compras import download_comprovante_compra


# ==============================================================================
# 1. TESTES: HARDENING JWT (RFC 7519 & REMOÇÃO DE TOKEN QUERY)
# ==============================================================================

def test_jwt_claims_rfc7519():
    """Garante inclusão de iss, iat, nbf, jti e expiração adequada no token."""
    payload_data = {"sub": "user@gestormei.com", "user_id": 10, "empresa_id": 1, "role": "OWNER"}
    token = create_access_token(payload_data)
    decoded = decode_token(token)

    assert decoded is not None
    assert decoded.get("iss") == "gestor-mei-api"
    assert "iat" in decoded
    assert "nbf" in decoded
    assert "jti" in decoded
    assert len(decoded["jti"]) == 32  # UUIDv4 hex
    assert decoded.get("sub") == "user@gestormei.com"
    assert decoded.get("user_id") == 10
    assert decoded.get("role") == "OWNER"


def test_jwt_expiration_prod_vs_dev():
    """Garante expiração de 120 minutos (2h) em produção e 720 minutos (12h) em desenvolvimento."""
    settings_prod = Settings(ENVIRONMENT="production", SECRET_KEY="a" * 32)
    assert settings_prod.ACCESS_TOKEN_EXPIRE_MINUTES == 120

    settings_dev = Settings(ENVIRONMENT="development")
    assert settings_dev.ACCESS_TOKEN_EXPIRE_MINUTES == 720


def test_get_current_user_blocks_missing_token():
    """Garante HTTP 401 quando credenciais Bearer não são fornecidas."""
    mock_db = MagicMock()
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None, db=mock_db)
    assert exc_info.value.status_code == 401
    assert "Autenticação necessária" in exc_info.value.detail


def test_get_current_user_no_token_query_parameter():
    """Garante que a assinatura de get_current_user não aceita token_query."""
    import inspect
    sig = inspect.signature(get_current_user)
    assert "token_query" not in sig.parameters
    assert "credentials" in sig.parameters


def test_get_current_user_blocks_invalid_issuer():
    """Garante que tokens emitidos por entidade não autorizada sejam rejeitados com 401."""
    mock_db = MagicMock()
    fake_token_data = {"sub": "teste@gestormei.com", "iss": "malicious-issuer", "role": "OWNER"}
    with patch("app.dependencies.decode_token", return_value=fake_token_data):
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token.invalido.iss")
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials=creds, db=mock_db)
        assert exc_info.value.status_code == 401
        assert "Emissor do token inválido" in exc_info.value.detail


def test_get_current_user_blocks_inactive_user():
    """Garante que usuário inativo receba 401 mesmo com token válido."""
    mock_db = MagicMock()
    inactive_user = User(id=5, email="inativo@empresa.com", role=UserRole.OWNER, ativo=False)
    mock_db.query.return_value.filter.return_value.first.return_value = inactive_user

    token_data = {"sub": "inativo@empresa.com", "user_id": 5, "iss": "gestor-mei-api", "role": "OWNER"}
    with patch("app.dependencies.decode_token", return_value=token_data):
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid.token")
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials=creds, db=mock_db)
        assert exc_info.value.status_code == 401
        assert "Usuário inativo" in exc_info.value.detail


# ==============================================================================
# 2. TESTES: MULTIEMPRESA & ELIMINAÇÃO TOTAL DE FALLBACK PARA EMPRESA 1
# ==============================================================================

def test_master_without_x_empresa_id_raises_400():
    """Garante que MASTER sem X-Empresa-ID receba 400 em vez de fallback silencioso para Empresa 1."""
    mock_db = MagicMock()
    master_user = User(id=1, email="master@plataforma.com", role=UserRole.MASTER, empresa_id=None, ativo=True)

    with pytest.raises(HTTPException) as exc_info:
        get_current_empresa(x_empresa_id=None, user=master_user, db=mock_db)
    assert exc_info.value.status_code == 400
    assert "Perfil MASTER deve especificar a empresa de contexto" in exc_info.value.detail


def test_master_with_x_empresa_id_resolves_target():
    """Garante que MASTER consiga acessar a empresa especificada no cabeçalho X-Empresa-ID."""
    mock_db = MagicMock()
    master_user = User(id=1, email="master@plataforma.com", role=UserRole.MASTER, empresa_id=None, ativo=True)
    empresa_target = Empresa(id=42, nome_fantasia="Empresa Cliente 42")
    mock_db.query.return_value.filter.return_value.first.return_value = empresa_target

    result = get_current_empresa(x_empresa_id="42", user=master_user, db=mock_db)
    assert result.id == 42
    assert result.nome_fantasia == "Empresa Cliente 42"


def test_owner_accessing_different_empresa_id_raises_403():
    """Garante que OWNER da Empresa 1 tentando acessar Empresa 2 receba 403 Forbidden."""
    mock_db = MagicMock()
    owner_user = User(id=2, email="owner@empresa1.com", role=UserRole.OWNER, empresa_id=1, ativo=True)

    with pytest.raises(HTTPException) as exc_info:
        get_current_empresa(x_empresa_id="2", user=owner_user, db=mock_db)
    assert exc_info.value.status_code == 403
    assert "Acesso não autorizado a dados de outra empresa" in exc_info.value.detail


def test_consultor_unauthorized_empresa_raises_403():
    """Garante que CONSULTOR tentando acessar empresa sem vínculo ativo receba 403 Forbidden."""
    mock_db = MagicMock()
    consultor_user = User(id=3, email="consultor@externo.com", role=UserRole.CONSULTOR, empresa_id=10, ativo=True)
    # Simula nenhum vínculo ativo com empresa 99
    mock_db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        get_current_empresa(x_empresa_id="99", user=consultor_user, db=mock_db)
    assert exc_info.value.status_code == 403
    assert "Consultor não possui autorização" in exc_info.value.detail


def test_consultor_authorized_empresa_succeeds():
    """Garante que CONSULTOR com vínculo ativo acesse a empresa vinculada."""
    mock_db = MagicMock()
    consultor_user = User(id=3, email="consultor@externo.com", role=UserRole.CONSULTOR, empresa_id=10, ativo=True)
    vinculo_ativo = EmpresaConsultor(id=1, empresa_id=20, user_id=3, ativo=True)
    empresa_autorizada = Empresa(id=20, nome_fantasia="Cliente Consultor")

    def query_filter_side_effect(*args, **kwargs):
        mock_query = MagicMock()
        if args and args[0] == EmpresaConsultor:
            mock_query.filter.return_value.first.return_value = vinculo_ativo
        else:
            mock_query.filter.return_value.first.return_value = empresa_autorizada
        return mock_query

    mock_db.query.side_effect = query_filter_side_effect

    result = get_current_empresa(x_empresa_id="20", user=consultor_user, db=mock_db)
    assert result.id == 20


# ==============================================================================
# 3. TESTES: RATE LIMITING & IP RESOLUTION
# ==============================================================================

def test_get_real_client_ip_headers_priority():
    """Garante ordem correta de extração de IP: Cloudflare > X-Real-IP > X-Forwarded-For > client."""
    # 1. CF-Connecting-IP
    req_cf = Request({"type": "http", "headers": [(b"cf-connecting-ip", b"203.0.113.195")]})
    assert get_real_client_ip(req_cf) == "203.0.113.195"

    # 2. X-Real-IP
    req_real = Request({"type": "http", "headers": [(b"x-real-ip", b"198.51.100.4")]})
    assert get_real_client_ip(req_real) == "198.51.100.4"

    # 3. X-Forwarded-For
    req_xff = Request({"type": "http", "headers": [(b"x-forwarded-for", b"192.0.2.1, 10.0.0.1")]})
    assert get_real_client_ip(req_xff) == "192.0.2.1"


def test_limiter_key_func_is_real_ip():
    """Garante que o slowapi limiter utiliza a função get_real_client_ip."""
    assert limiter._key_func == get_real_client_ip


# ==============================================================================
# 4. TESTES: UPLOADS PROTEGIDOS E VALIDAÇÃO MULTI-TENANT RELACIONAL
# ==============================================================================

def test_download_comprovante_blocks_path_traversal():
    """Garante bloqueio de path traversal com 400 Bad Request."""
    mock_db = MagicMock()
    user = User(id=1, role=UserRole.OWNER, empresa_id=1, ativo=True)
    with pytest.raises(HTTPException) as exc_info:
        download_comprovante_compra(filename="../etc/passwd", db=mock_db, current_user=user)
    assert exc_info.value.status_code == 400
    assert "Nome de arquivo inválido" in exc_info.value.detail


def test_download_comprovante_blocks_cross_tenant_access():
    """Garante que usuário da Empresa 1 não acesse comprovante da Empresa 2 (relacional)."""
    mock_db = MagicMock()
    user_emp1 = User(id=2, email="user@emp1.com", role=UserRole.OWNER, empresa_id=1, ativo=True)
    
    # Compra associada pertence à empresa 2
    compra_emp2 = NfeImportada(id=10, empresa_id=2, anexo_url="/api/compras/comprovantes/emp_2_uuid.pdf")
    mock_db.query.return_value.filter.return_value.first.return_value = compra_emp2

    with pytest.raises(HTTPException) as exc_info:
        download_comprovante_compra(filename="emp_2_uuid.pdf", db=mock_db, current_user=user_emp1)
    assert exc_info.value.status_code == 403
    assert "Acesso não autorizado a este comprovante de outra empresa" in exc_info.value.detail


def test_download_comprovante_serves_authorized_file(tmp_path):
    """Garante retorno com headers de segurança nosniff e CSP sandbox quando autorizado."""
    mock_db = MagicMock()
    user_emp1 = User(id=2, email="user@emp1.com", role=UserRole.OWNER, empresa_id=1, ativo=True)
    compra_emp1 = NfeImportada(id=10, empresa_id=1, anexo_url="/api/compras/comprovantes/emp_1_uuid.pdf")
    mock_db.query.return_value.filter.return_value.first.return_value = compra_emp1

    # Cria arquivo temporário real
    test_filename = "emp_1_uuid.pdf"
    with patch("os.path.isfile", return_value=True), \
         patch("app.routers.compras.FileResponse") as mock_file_response:
        
        mock_file_response.return_value = "response_ok"
        resp = download_comprovante_compra(filename=test_filename, db=mock_db, current_user=user_emp1)
        
        assert resp == "response_ok"
        mock_file_response.assert_called_once()
        call_kwargs = mock_file_response.call_args[1]
        assert call_kwargs["media_type"] == "application/pdf"
        assert call_kwargs["headers"]["X-Content-Type-Options"] == "nosniff"
        assert call_kwargs["headers"]["Content-Security-Policy"] == "default-src 'none'; sandbox"
