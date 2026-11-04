from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RegiaoEntregaBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    taxa_entrega: float = Field(default=0.0, ge=0)
    tempo_estimado_minutos: Optional[int] = Field(default=30, ge=0)
    ativo: bool = True

class RegiaoEntregaCreate(RegiaoEntregaBase):
    pass

class RegiaoEntregaUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    taxa_entrega: Optional[float] = Field(None, ge=0)
    tempo_estimado_minutos: Optional[int] = Field(None, ge=0)
    ativo: Optional[bool] = None

class RegiaoEntregaResponse(RegiaoEntregaBase):
    id: int
    empresa_id: int
    created_at: datetime
    total_pedidos: Optional[int] = 0

    class Config:
        from_attributes = True
