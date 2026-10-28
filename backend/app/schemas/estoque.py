from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MovimentacaoEstoqueBase(BaseModel):
    produto_id: int
    tipo: str  # ENTRADA, SAIDA, AJUSTE
    quantidade: float
    motivo: Optional[str] = None
    observacao: Optional[str] = None

class MovimentacaoEstoqueCreate(MovimentacaoEstoqueBase):
    custo_unitario: Optional[float] = None

class EntradaEstoqueRequest(BaseModel):
    produto_id: int
    quantidade: float
    custo_unitario: Optional[float] = None
    motivo: Optional[str] = "Entrada / Reposição de Mercadoria"
    observacao: Optional[str] = None

class SaidaEstoqueRequest(BaseModel):
    produto_id: int
    quantidade: float
    motivo: str  # Perda, Consumo Interno, Validade Vencida, Descarte, Outros
    observacao: Optional[str] = None

class AjusteEstoqueRequest(BaseModel):
    produto_id: int
    nova_quantidade: float
    motivo: Optional[str] = "Ajuste de Inventário"
    observacao: Optional[str] = None

class MovimentacaoEstoqueResponse(MovimentacaoEstoqueBase):
    id: int
    empresa_id: int
    usuario_id: Optional[int] = None
    usuario_nome: Optional[str] = None
    produto_nome: Optional[str] = None
    data_movimentacao: datetime

    class Config:
        from_attributes = True

class ResumoEstoqueItem(BaseModel):
    id: int
    nome: str
    categoria: str
    tipo: str
    quantidade_estoque: float
    estoque_minimo: float
    custo_unitario: float
    preco_venda: float
    estoque_baixo: bool
    valor_total_custo: float
    valor_total_venda: float

class ResumoEstoqueGeral(BaseModel):
    total_itens: int
    itens_estoque_baixo: int
    valor_total_custo: float
    valor_total_venda: float
    itens: List[ResumoEstoqueItem]

