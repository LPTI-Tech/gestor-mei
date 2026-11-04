from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ClienteBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    telefone: Optional[str] = Field(None, max_length=30)
    cpf_cnpj: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=100)
    endereco: Optional[str] = Field(None, max_length=250)
    regiao_id: Optional[int] = None
    observacoes: Optional[str] = None
    ativo: bool = True

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=150)
    telefone: Optional[str] = Field(None, max_length=30)
    cpf_cnpj: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=100)
    endereco: Optional[str] = Field(None, max_length=250)
    regiao_id: Optional[int] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None

class ClienteResponse(ClienteBase):
    id: int
    empresa_id: int
    regiao_nome: Optional[str] = None
    regiao_taxa: Optional[float] = 0.0
    created_at: datetime
    updated_at: datetime
    total_compras: Optional[float] = 0.0
    qtd_pedidos: Optional[int] = 0

    class Config:
        from_attributes = True
