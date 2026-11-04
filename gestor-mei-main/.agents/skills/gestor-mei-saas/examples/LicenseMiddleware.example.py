"""
FastAPI License Enforcement Middleware Example
Exemplo de middleware para a Sprint 9 do Gestor MEI.
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

class LicenseValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Ignora rotas de autenticação, healthcheck, docs e webhooks
        exempt_paths = ["/api/auth", "/api/health", "/docs", "/openapi.json", "/api/webhooks"]
        if any(request.url.path.startswith(path) for path in exempt_paths):
            return await call_next(request)

        # A verificação da licença atua principalmente sobre operações de escrita (mutações)
        # permitindo que o usuário consulte dados históricos mesmo se estiver SUSPENSA
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            empresa = getattr(request.state, "empresa", None)
            
            if empresa and empresa.licenca_status == "SUSPENSA":
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "code": "LICENSE_SUSPENDED",
                        "message": "Assinatura suspensa por pendência financeira. Realize o pagamento para emitir novas vendas.",
                        "payment_url": f"/pagamento/{empresa.id}"
                    }
                )

        return await call_next(request)
