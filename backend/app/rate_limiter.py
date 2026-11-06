import logging
from typing import Optional
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger("gestor_mei.security.rate_limit")


def get_real_client_ip(request: Request) -> str:
    """
    Extrai o endereço IP real do cliente, respeitando a ordem segura de prioridade de proxies reversos:
    1. CF-Connecting-IP (Cloudflare)
    2. X-Real-IP (Nginx / Load Balancer)
    3. X-Forwarded-For (primeiro IP da cadeia é o cliente original)
    4. request.client.host (fallback direto)
    """
    if not request:
        return "127.0.0.1"

    # 1. Cloudflare header
    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    if cf_connecting_ip:
        return cf_connecting_ip.strip()

    # 2. Nginx / Proxy direto
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # 3. X-Forwarded-For
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[0]

    # 4. Fallback padrão do cliente TCP
    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


# Instância compartilhada do Limiter (chave por IP real)
limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=[],
    headers_enabled=False,
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Handler padronizado para respostas HTTP 429 (Too Many Requests).
    Informa ao usuário a janela de tempo e adiciona cabeçalhos de segurança.
    """
    client_ip = get_real_client_ip(request)
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
