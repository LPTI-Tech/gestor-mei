from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MotoboyBase(BaseModel):
    nome: str
    telefone: Optional[str] = None
    valor_por_entrega: float = Field(ge=0, default=0.0)
    ativo: bool = True

class MotoboyCreate(MotoboyBase):
    pass

class MotoboyUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    valor_por_entrega: Optional[float] = None
    ativo: Optional[bool] = None

class MotoboyResponse(MotoboyBase):
    id: int
    empresa_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class EntregaMotoboyCreate(BaseModel):
    motoboy_id: int
    numero_pedido: str
    valor_entrega: Optional[float] = None
    status_pagamento: str = "PENDENTE" # PENDENTE, PAGO
    observacoes: Optional[str] = None
    data_hora: Optional[datetime] = None

class EntregaMotoboyResponse(BaseModel):
    id: int
    empresa_id: int
    motoboy_id: int
    data_hora: datetime
    numero_pedido: str
    valor_entrega: float
    status_pagamento: str
    data_pagamento: Optional[datetime] = None
    observacoes: Optional[str] = None
    created_at: datetime
    motoboy_nome: Optional[str] = None

    class Config:
        from_attributes = True

class MotoboyResumoItem(BaseModel):
    motoboy_id: int
    nome: str
    telefone: Optional[str]
    total_entregas: int
    total_devido: float
    total_pago: float
    saldo_pendente: float

class MotoboyRelatorioResponse(BaseModel):
    resumos: List[MotoboyResumoItem]
    total_geral_devido: float
    total_geral_pago: float
    total_geral_pendente: float
    total_entregas_geral: int
