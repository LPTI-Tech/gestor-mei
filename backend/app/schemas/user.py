from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    nome: str
    email: EmailStr
    role: UserRole = UserRole.OPERADOR
    ativo: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    ativo: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    empresa_id: int
    created_at: datetime

    class Config:
        from_attributes = True
