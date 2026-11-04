from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class DespesaBase(BaseModel):
    data: date
    categoria: str # Mercadorias, Insumos, Gás, Energia, Água, Transporte, Internet, Funcionários, Motoboys, Outros
    descricao: str
    valor: float = Field(gt=0)
    forma_pagamento: str = "PIX" # Dinheiro, PIX, Débito, Crédito, Boleto

class DespesaCreate(DespesaBase):
    pass

class DespesaUpdate(BaseModel):
    data: Optional[date] = None
    categoria: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    forma_pagamento: Optional[str] = None

class DespesaResponse(DespesaBase):
    id: int
    empresa_id: int
    created_at: datetime

    class Config:
        from_attributes = True
