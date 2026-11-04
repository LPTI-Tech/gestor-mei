from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class LancamentoIFoodBase(BaseModel):
    data: date
    numero_pedido: str
    valor_bruto: float = Field(gt=0)
    taxa_ifood: float = Field(ge=0)
    valor_liquido: Optional[float] = None # Will calculate bruto - taxa if None
    observacoes: Optional[str] = None

class LancamentoIFoodCreate(LancamentoIFoodBase):
    pass

class LancamentoIFoodResponse(LancamentoIFoodBase):
    id: int
    empresa_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class IFoodSummaryResponse(BaseModel):
    total_pedidos: int
    total_bruto: float
    total_taxas: float
    total_liquido: float
    percentual_medio_taxa: float
    lancamentos: List[LancamentoIFoodResponse] = []
