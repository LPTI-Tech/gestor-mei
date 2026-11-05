import os
import json
import logging
from typing import List, Optional
from pydantic_settings import BaseSettings

logger = logging.getLogger("gestor_mei.security.config")

DEFAULT_DEV_SECRET_KEY = "gestor-mei-super-secret-key-change-in-production-2026"
INSECURE_SECRET_KEYS = {
    DEFAULT_DEV_SECRET_KEY,
    "gestor-mei-local-dev-secret-key-2026-safe-environment-key",
    "change-me",
    "secret",
    "12345678",
    "password",
}

OFFICIAL_PROD_ORIGINS = [
    "https://gestormei.com.br",
    "https://www.gestormei.com.br",
    "https://gestor-mei.vercel.app",
]

DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _parse_cors_origins(raw_origins: Optional[str], is_dev: bool) -> List[str]:
    """
    Interpreta origens CORS configuradas em variável de ambiente (JSON ou string delimitada por vírgula),
    eliminando origens inseguras '*' em produção e garantindo apenas domínios autorizados.
    """
    parsed: List[str] = []
    if raw_origins:
        raw_str = raw_origins.strip()
        if raw_str.startswith("[") and raw_str.endswith("]"):
            try:
                parsed = json.loads(raw_str)
            except Exception:
                parsed = [x.strip() for x in raw_str.strip("[]").split(",") if x.strip()]
        else:
            parsed = [x.strip() for x in raw_str.split(",") if x.strip()]
    else:
        parsed = (DEV_ORIGINS + OFFICIAL_PROD_ORIGINS) if is_dev else OFFICIAL_PROD_ORIGINS.copy()

    clean_origins: List[str] = []
    for item in parsed:
        clean_item = str(item).strip().strip('"').strip("'").rstrip("/")
        if clean_item:
            clean_origins.append(clean_item)

    # Em ambiente de produção: remover obrigatoriamente wildcard '*'
    if not is_dev:
        if "*" in clean_origins:
            logger.warning("[SECURITY] Origem '*' descartada em produção para proteger credenciais CORS.")
            clean_origins = [o for o in clean_origins if o != "*"]
        if not clean_origins:
            clean_origins = OFFICIAL_PROD_ORIGINS.copy()

    # Preserva apenas itens únicos mantendo a ordem
    return list(dict.fromkeys(clean_origins))


class Settings(BaseSettings):
    PROJECT_NAME: str = "GESTOR MEI"
    VERSION: str = "1.4.0"
    API_PREFIX: str = "/api"

    # Environment & Seed Security Policy (SPRINT SECURITY 1)
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower().strip()
    SEED_DATABASE: bool = os.getenv("SEED_DATABASE", "false").lower().strip() in ("true", "1", "yes")

    # API Documentation Security Policy (SPRINT SECURITY 2)
    ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", "false").lower().strip() in ("true", "1", "yes")

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def should_seed(self) -> bool:
        return self.is_development or self.SEED_DATABASE

    @property
    def should_enable_docs(self) -> bool:
        return self.is_development or self.ENABLE_DOCS

    # Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./gestor_mei.db")

    # Security: SECRET_KEY & Tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", DEFAULT_DEV_SECRET_KEY).strip()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Password Reset Configuration (FEATURE-001)
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15  # 15 minutes
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "GESTOR MEI <nao-responda@gestormei.com.br>")

    # Resend API
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")

    # SMTP Fallback
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() in ("true", "1", "yes")

    # MEI Configuration
    MEI_DEFAULT_ANNUAL_LIMIT: float = 81000.00

    # CORS Origins (Carregadas e sanitizadas)
    CORS_ORIGINS: List[str] = []

    def __init__(self, **values):
        super().__init__(**values)
        raw_cors = os.getenv("CORS_ORIGINS")
        if not self.CORS_ORIGINS:
            self.CORS_ORIGINS = _parse_cors_origins(raw_cors, self.is_development)
        else:
            self.CORS_ORIGINS = _parse_cors_origins(",".join(self.CORS_ORIGINS), self.is_development)

    def validate_production_security(self):
        """
        Validação estrita de segurança para ambientes de PRODUÇÃO.
        Interrompe o startup caso SECRET_KEY ou CORS violem requisitos mínimos.
        """
        if self.ENVIRONMENT == "production":
            # 1. Validação de SECRET_KEY
            if not self.SECRET_KEY:
                self._raise_security_error("A variável de ambiente 'SECRET_KEY' está ausente ou vazia.")
            if self.SECRET_KEY in INSECURE_SECRET_KEYS or "super-secret" in self.SECRET_KEY.lower():
                self._raise_security_error("A 'SECRET_KEY' está utilizando o valor padrão público de desenvolvimento.")
            if len(self.SECRET_KEY) < 32:
                self._raise_security_error(
                    f"A 'SECRET_KEY' possui apenas {len(self.SECRET_KEY)} caracteres. O mínimo obrigatório é 32 caracteres criptográficos."
                )

            # 2. Validação de CORS
            if "*" in self.CORS_ORIGINS:
                self._raise_security_error("A origem '*' é terminantemente proibida em ambiente de produção.")

    def _raise_security_error(self, motivo: str):
        banner = (
            "\n" + "=" * 80 + "\n"
            "[FATAL SECURITY ERROR] CONFIGURAÇÃO INSEGURA PARA PRODUÇÃO BLOQUEADA!\n"
            f"Motivo: {motivo}\n\n"
            "O startup do Gestor MEI foi INTERROMPIDO para proteção dos dados.\n"
            "Em produção ('ENVIRONMENT=production'), configure uma SECRET_KEY exclusiva e com no mínimo 32 caracteres:\n"
            "  No PowerShell: -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})\n"
            "  No Linux/Render: openssl rand -hex 32\n\n"
            "Configure as variáveis no painel do Render/Docker/Vercel.\n"
            "Documentação oficial: docs/DEPLOY_BETA.md\n"
            "=" * 80 + "\n"
        )
        logger.critical(banner)
        print(banner)
        raise RuntimeError(f"Configuração insegura para produção: {motivo}")

    class Config:
        case_sensitive = True


settings = Settings()

# Normalize database URL for SQLAlchemy 2.x
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)
