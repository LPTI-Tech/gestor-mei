import json
import pytest
from unittest.mock import patch, MagicMock
from starlette.requests import Request
from slowapi.errors import RateLimitExceeded
from slowapi.wrappers import Limit
from limits import parse
from app.config import Settings, _parse_cors_origins, OFFICIAL_PROD_ORIGINS, DEFAULT_DEV_SECRET_KEY
from app.rate_limiter import limiter, rate_limit_exceeded_handler
from app.routers.auth import login, solicitar_recuperacao_senha
from app.schemas.auth import LoginRequest, EsqueciSenhaRequest


# ==============================================================================
# 1. TESTES DE GERENCIAMENTO DA SECRET_KEY
# ==============================================================================

def test_secret_key_development_allows_default():
    settings = Settings(
        ENVIRONMENT="development",
        SECRET_KEY=DEFAULT_DEV_SECRET_KEY
    )
    # Não deve levantar exceção em development
    settings.validate_production_security()
    assert settings.SECRET_KEY == DEFAULT_DEV_SECRET_KEY


def test_secret_key_production_blocks_missing():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=""
    )
    with pytest.raises(RuntimeError, match="ausente ou vazia"):
        settings.validate_production_security()


def test_secret_key_production_blocks_default_insecure():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=DEFAULT_DEV_SECRET_KEY
    )
    with pytest.raises(RuntimeError, match="valor padrão público"):
        settings.validate_production_security()


def test_secret_key_production_blocks_short_key():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="chave-curta-de-16-caracteres"
    )
    with pytest.raises(RuntimeError, match="mínimo obrigatório é 32"):
        settings.validate_production_security()


def test_secret_key_production_accepts_strong_key():
    strong_key = "d8a1c9e3f7b2a5d4e6c8b0a1f3e5d7c9b1a3f5e7d9c1b3a5f7e9d1c3b5a7f9e1"
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=strong_key
    )
    # Deve passar sem erro
    settings.validate_production_security()
    assert settings.SECRET_KEY == strong_key


# ==============================================================================
# 2. TESTES DE POLÍTICA E VALIDAÇÃO CORS
# ==============================================================================

def test_cors_development_includes_localhost_and_official():
    origins = _parse_cors_origins(None, is_dev=True)
    assert "http://localhost:5173" in origins
    assert "http://127.0.0.1:5173" in origins
    assert "https://gestormei.com.br" in origins
    assert "*" not in origins


def test_cors_production_removes_wildcard():
    # Tenta injetar wildcard via env var em produção
    raw_insecure = '["https://gestormei.com.br", "*", "https://gestor-mei.vercel.app"]'
    origins = _parse_cors_origins(raw_insecure, is_dev=False)
    assert "*" not in origins
    assert "https://gestormei.com.br" in origins
    assert "https://gestor-mei.vercel.app" in origins


def test_cors_production_fallback_when_only_wildcard():
    # Se alguém configurar apenas '*' em produção, substitui pelas origens oficiais
    raw_insecure = '["*"]'
    origins = _parse_cors_origins(raw_insecure, is_dev=False)
    assert "*" not in origins
    assert set(OFFICIAL_PROD_ORIGINS).issubset(set(origins))


def test_cors_production_validation_blocks_injected_wildcard():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="d8a1c9e3f7b2a5d4e6c8b0a1f3e5d7c9b1a3f5e7d9c1b3a5f7e9d1c3b5a7f9e1",
    )
    # Força a lista interna a conter '*' para simular adulteração
    settings.CORS_ORIGINS = ["https://gestormei.com.br", "*"]
    with pytest.raises(RuntimeError, match="terminantemente proibida"):
        settings.validate_production_security()


# ==============================================================================
# 3. TESTES DE RATE LIMITING (SLOWAPI)
# ==============================================================================

def test_rate_limiting_registration():
    """Garante que as rotas críticas de autenticação foram decoradas com os limites exigidos."""
    login_limits = [str(lim.limit) for lim in limiter._route_limits.get("app.routers.auth.login", [])]
    esqueci_limits = [str(lim.limit) for lim in limiter._route_limits.get("app.routers.auth.solicitar_recuperacao_senha", [])]

    assert "5 per 1 minute" in login_limits, f"Limite de login incorreto: {login_limits}"
    assert "3 per 15 minute" in esqueci_limits, f"Limite de esqueci-senha incorreto: {esqueci_limits}"


def test_rate_limiting_login_enforced():
    """Valida que /api/auth/login aceita até 5 tentativas e bloqueia a 6ª com RateLimitExceeded."""
    limiter.reset()

    scope = {
        "type": "http",
        "client": ("198.51.100.42", 12345),
        "headers": [(b"host", b"localhost")],
        "path": "/api/auth/login"
    }
    req = Request(scope)
    data = LoginRequest(email="usuario.inexistente@gestormei.com.br", password="senha_errada")
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = None

    # 5 primeiras tentativas (devem prosseguir e falhar por credencial errada, não por rate limit)
    for _ in range(5):
        if hasattr(req.state, "_rate_limiting_complete"):
            del req.state._rate_limiting_complete
        try:
            login(request=req, data=data, db=db_mock)
        except Exception as e:
            assert not isinstance(e, RateLimitExceeded), "RateLimitExceeded disparado precocemente antes de 5 tentativas!"

    # 6ª tentativa: deve disparar obrigatoriamente RateLimitExceeded
    if hasattr(req.state, "_rate_limiting_complete"):
        del req.state._rate_limiting_complete
    with pytest.raises(RateLimitExceeded) as exc_info:
        login(request=req, data=data, db=db_mock)

    assert "5 per 1 minute" in str(exc_info.value.detail)


def test_rate_limiting_esqueci_senha_enforced():
    """Valida que /api/auth/esqueci-senha aceita até 3 solicitações e bloqueia a 4ª com RateLimitExceeded."""
    limiter.reset()

    scope = {
        "type": "http",
        "client": ("198.51.100.99", 12345),
        "headers": [(b"host", b"localhost")],
        "path": "/api/auth/esqueci-senha"
    }
    req = Request(scope)
    data = EsqueciSenhaRequest(email="alvo.teste@gestormei.com.br")
    db_mock = MagicMock()
    db_mock.query().filter().first.return_value = None

    # 3 primeiras solicitações (devem passar pelo rate limiter)
    for _ in range(3):
        if hasattr(req.state, "_rate_limiting_complete"):
            del req.state._rate_limiting_complete
        solicitar_recuperacao_senha(request=req, data=data, db=db_mock)

    # 4ª tentativa: deve ser bloqueada pelo rate limiter
    if hasattr(req.state, "_rate_limiting_complete"):
        del req.state._rate_limiting_complete
    with pytest.raises(RateLimitExceeded) as exc_info:
        solicitar_recuperacao_senha(request=req, data=data, db=db_mock)

    assert "3 per 15 minute" in str(exc_info.value.detail)


def test_rate_limit_exceeded_handler_payload():
    """Valida se o handler customizado retorna status 429, cabeçalho Retry-After e JSON com padrão do sistema."""
    scope = {
        "type": "http",
        "client": ("198.51.100.100", 12345),
        "headers": [(b"host", b"localhost")],
        "path": "/api/auth/login"
    }
    req = Request(scope)

    # Cria objeto Limit compatível com o slowapi
    item = parse("5/minute")
    limit_obj = Limit(
        item,
        key_func=lambda: "ip",
        scope=None,
        per_method=False,
        methods=None,
        error_message=None,
        exempt_when=None,
        override_defaults=True,
        cost=1
    )
    exc = RateLimitExceeded(limit_obj)

    response = rate_limit_exceeded_handler(req, exc)
    assert response.status_code == 429
    assert response.headers.get("retry-after") == "60"

    body = json.loads(response.body.decode("utf-8"))
    assert body["error"] == "rate_limit_exceeded"
    assert "5 per 1 minute" in body["limite"]
    assert "Limite de taxa excedido" in body["detail"]
