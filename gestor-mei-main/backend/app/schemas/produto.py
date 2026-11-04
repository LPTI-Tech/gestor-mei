from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProdutoBase(BaseModel):
    nome: str
    tipo: str = "PRODUTO" # PRODUTO, SERVICO
    categoria: str = "Outros"
    preco_venda: float = 0.0
    custo_unitario: float = 0.0
    quantidade_estoque: float = 0.0
    estoque_minimo: float = 0.0
    ativo: bool = True

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    preco_venda: Optional[float] = None
    custo_unitario: Optional[float] = None
    quantidade_estoque: Optional[float] = None
    estoque_minimo: Optional[float] = None
    ativo: Optional[bool] = None

class ProdutoResponse(ProdutoBase):
    id: int
    empresa_id: int
    created_at: datetime
    estoque_baixo: Optional[bool] = False

    class Config:
        from_attributes = True
