from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    nome: str
    email: EmailStr
    role: UserRole = UserRole.OPERATOR
    ativo: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)
    empresa_id: Optional[int] = None

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    ativo: Optional[bool] = None
    password: Optional[str] = None

class UserResetPasswordRequest(BaseModel):
    nova_senha: str = Field(..., min_length=4)

class UserRoleUpdateRequest(BaseModel):
    novo_perfil: UserRole

class UserResponse(UserBase):
    id: int
    empresa_id: Optional[int] = None
    empresa_nome: Optional[str] = None
    created_at: datetime
    ultimo_acesso: Optional[datetime] = None
    criado_por_id: Optional[int] = None
    criado_por_nome: Optional[str] = None

    class Config:
        from_attributes = True

class VinculoConsultorCreate(BaseModel):
    user_id: int
    empresa_id: int

class VinculoConsultorResponse(BaseModel):
    id: int
    empresa_id: int
    user_id: int
    nome_consultor: Optional[str] = None
    email_consultor: Optional[str] = None
    nome_empresa: Optional[str] = None
    ativo: bool
    created_at: datetime

    class Config:
        from_attributes = True
