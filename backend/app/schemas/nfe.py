from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class FornecedorNfe(BaseModel):
    cnpj: str
    nome: str
    nome_fantasia: Optional[str] = None
    uf: Optional[str] = None
    ie: Optional[str] = None


class ItemNfePreview(BaseModel):
    numero_item: int
    codigo_fornecedor: str
    descricao_fornecedor: str
    ean: Optional[str] = None
    ncm: Optional[str] = None
    cfop: Optional[str] = None
    unidade_comercial: str
    quantidade_comercial: float
    valor_unitario: float
    valor_total: float
    produto_id_vinculado: Optional[int] = None
    produto_nome_vinculado: Optional[str] = None
    fator_conversao: float = 1.0
    status_vinculo: str = "PENDENTE"  # VINCULADO, SUGESTAO, PENDENTE
    quantidade_estoque_entrada: float = 0.0
    custo_unitario_calculado: float = 0.0


class NfePreviewResponse(BaseModel):
    chave_acesso: str
    numero_nota: str
    serie: str
    data_emissao: str
    valor_total: float
    fornecedor: FornecedorNfe
    destinatario_cnpj: Optional[str] = None
    destinatario_valido: bool = True
    ja_importada: bool = False
    data_importacao_previa: Optional[str] = None
    total_itens: int
    itens_vinculados: int
    itens_pendentes: int
    itens: List[ItemNfePreview]


class ProdutoVinculoCreate(BaseModel):
    fornecedor_cnpj: str
    fornecedor_nome: Optional[str] = None
    codigo_fornecedor: str
    descricao_fornecedor: Optional[str] = None
    ean_fornecedor: Optional[str] = None
    produto_id: int
    fator_conversao: Optional[float] = 1.0


class ProdutoVinculoResponse(BaseModel):
    id: int
    empresa_id: int
    fornecedor_cnpj: str
    fornecedor_nome: Optional[str] = None
    codigo_fornecedor: str
    descricao_fornecedor: Optional[str] = None
    ean_fornecedor: Optional[str] = None
    produto_id: int
    produto_nome: Optional[str] = None
    fator_conversao: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Fase 2: Schemas para Efetivação da Entrada
# ==========================================

class ItemNfeImportarRequest(BaseModel):
    produto_id: int
    codigo_fornecedor: str
    descricao_fornecedor: Optional[str] = None
    unidade_comercial: Optional[str] = "UN"
    quantidade_comercial: float
    fator_conversao: Optional[float] = 1.0
    valor_unitario: float
    valor_total: float
    atualizar_custo: Optional[bool] = True
    atualizar_vinculo: Optional[bool] = True


class NfeImportarRequest(BaseModel):
    chave_acesso: str
    numero_nota: str
    serie: Optional[str] = "1"
    data_emissao: Optional[str] = None
    valor_total: float
    fornecedor_cnpj: str
    fornecedor_nome: str
    fornecedor_uf: Optional[str] = None
    itens: List[ItemNfeImportarRequest]
    observacao: Optional[str] = None


class ProdutoAtualizadoInfo(BaseModel):
    produto_id: int
    nome: str
    quantidade_anterior: float
    quantidade_adicionada: float
    quantidade_nova: float
    custo_anterior: float
    custo_novo: float
    custo_atualizado: bool


class NfeImportarResultadoResponse(BaseModel):
    sucesso: bool = True
    mensagem: str
    nfe_id: int
    chave_acesso: str
    numero_nota: str
    total_itens_processados: int
    produtos_atualizados: List[ProdutoAtualizadoInfo]


class ItemNfeImportadaResponse(BaseModel):
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


class NfeImportadaResponse(BaseModel):
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
    itens: Optional[List[ItemNfeImportadaResponse]] = None

    class Config:
        from_attributes = True
