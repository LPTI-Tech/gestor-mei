from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    empresa_id: int
    nome: str
    email: str
    role: UserRole
    nome_fantasia: str

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
    
    # First admin user data
    nome_usuario: str
    email_usuario: EmailStr
    password: str
