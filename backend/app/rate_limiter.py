import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger("gestor_mei.security.rate_limit")

# Instância compartilhada do Limiter (chave por IP do requisitante)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    headers_enabled=False,
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Handler padronizado para respostas HTTP 429 (Too Many Requests).
    Informa ao usuário a janela de tempo e adiciona cabeçalhos de segurança.
    """
    client_ip = get_remote_address(request)
    logger.warning(
        f"[RATE LIMIT] Limite de requisições excedido para IP '{client_ip}' "
        f"na rota '{request.url.path}': {exc.detail}"
    )

    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Muitas requisições. Limite de taxa excedido ({exc.detail}). Por favor, aguarde antes de tentar novamente.",
            "error": "rate_limit_exceeded",
            "limite": exc.detail,
        },
        headers={"Retry-After": "60"},
    )
