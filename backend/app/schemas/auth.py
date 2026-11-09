from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    empresa_id: Optional[int] = None
    nome: str
    email: str
    role: UserRole
    nome_fantasia: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    empresa_id: Optional[int] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    # Empresa data
    nome_empresarial: str
    nome_fantasia: str
    cnpj: str
    cpf_proprietario: str
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email_empresa: EmailStr
    
    # First owner user data
    nome_usuario: str
    email_usuario: EmailStr
    password: str

# FEATURE-001: Recuperação de Senha
class EsqueciSenhaRequest(BaseModel):
    email: EmailStr

class EsqueciSenhaResponse(BaseModel):
    mensagem: str

class ValidarTokenResetResponse(BaseModel):
    valido: bool
    email_mascarado: Optional[str] = None
    mensagem: str

class RedefinirSenhaRequest(BaseModel):
    token: str = Field(..., min_length=10)
    nova_senha: str = Field(..., min_length=6, description="A nova senha deve possuir no mínimo 6 caracteres.")

class RedefinirSenhaResponse(BaseModel):
    mensagem: str


# ============================================================================
# SPRINT RBAC 03: LOGIN SOCIAL (GOOGLE / MICROSOFT) & VINCULAÇÃO DE CONTAS
# ============================================================================

class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10, description="Token JWT (ID Token) emitido pelo Google Identity Services.")
    client_id: Optional[str] = None


class MicrosoftAuthRequest(BaseModel):
    token: str = Field(..., min_length=10, description="Access Token ou ID Token emitido pela Microsoft Identity Platform.")
    token_type: Optional[str] = Field("access_token", description="'access_token' para consulta ao MS Graph ou 'id_token' para verificação OIDC.")


class ProvedorVinculadoResponse(BaseModel):
    id: int
    provider: str  # "GOOGLE", "MICROSOFT"
    email: str
    name: Optional[str] = None
    picture_url: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None


class ProvedoresUsuarioResponse(BaseModel):
    has_password: bool
    email: str
    providers: List[ProvedorVinculadoResponse]


class AuditoriaLoginResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    email: str
    provider: str
    sucesso: bool
    motivo_falha: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    empresa_id: Optional[int] = None
    data_hora: datetime
