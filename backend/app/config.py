import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "GESTOR MEI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database URL: defaults to SQLite for immediate local zero-config, supports PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./gestor_mei.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "gestor-mei-super-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # MEI Configuration
    MEI_DEFAULT_ANNUAL_LIMIT: float = 81000.00
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    class Config:
        case_sensitive = True

settings = Settings()

# Normalize database URL for SQLAlchemy 2.x (Render provides postgres:// which SQLAlchemy deprecated in favor of postgresql://)
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)
