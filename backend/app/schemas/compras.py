from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ItemCompraResponse(BaseModel):
    id: int
    produto_id: int
    produto_nome: Optional[str] = None
    codigo_fornecedor: str
    descricao_fornecedor: Optional[str] = None
    unidade_comercial: Optional[str] = None
    quantidade_comercial: float
    fator_conversao: float
    quantidade_entrada: float
    valor_unitario_nota: float
    custo_unitario_calculado: float
    valor_total: float

    class Config:
        from_attributes = True


class CompraItemResumo(BaseModel):
    id: int
    empresa_id: int
    chave_acesso: str
    numero_nota: str
    serie: str
    data_emissao: Optional[str] = None
    valor_total: float
    fornecedor_cnpj: str
    fornecedor_nome: str
    fornecedor_uf: Optional[str] = None
    total_itens: int
    data_importacao: datetime
    usuario_nome: Optional[str] = None
    observacao: Optional[str] = None

    class Config:
        from_attributes = True


class CompraDetalheResponse(CompraItemResumo):
    itens: List[ItemCompraResponse] = []


class UltimaCompraInfo(BaseModel):
    id: int
    numero_nota: str
    fornecedor_nome: str
    valor_total: float
    data: datetime


class FornecedorPrincipalInfo(BaseModel):
    nome: str
    cnpj: str
    total_comprado: float
    quantidade_notas: int


class MesCompraInfo(BaseModel):
    mes: str
    valor: float
    quantidade_notas: int


class ResumoComprasResponse(BaseModel):
    total_comprado_mes: float
    total_comprado_ano: float
    numero_notas_mes: int
    numero_notas_total: int
    ultima_compra: Optional[UltimaCompraInfo] = None
    fornecedor_principal: Optional[FornecedorPrincipalInfo] = None
    compras_por_mes: List[MesCompraInfo] = []
    top_fornecedores: List[FornecedorPrincipalInfo] = []

