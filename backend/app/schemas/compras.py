from pydantic import BaseModel, Field
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
    origem: Optional[str] = "XML_NFE"
    forma_pagamento: Optional[str] = None
    anexo_url: Optional[str] = None
    anexo_nome: Optional[str] = None
    anexo_tipo: Optional[str] = None

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


# =======================================================
# Schemas da Compra Manual (Sprint 8B)
# =======================================================

class ItemCompraManualCreate(BaseModel):
    produto_id: int
    quantidade: float = Field(..., gt=0, description="Quantidade comprada")
    unidade: str = Field(default="UN", description="Unidade informada (UN, CX, KG, etc.)")
    fator_conversao: float = Field(default=1.0, gt=0, description="Fator de conversão para unidade de estoque")
    valor_unitario: float = Field(..., ge=0, description="Preço unitário pago")
    valor_total: float = Field(..., ge=0, description="Subtotal do item")
    atualizar_custo: bool = Field(default=True, description="Se True, atualiza o custo unitário do produto")


class CompraManualCreate(BaseModel):
    fornecedor_nome: str = Field(..., min_length=2, description="Nome ou Razão Social do fornecedor")
    fornecedor_cnpj_cpf: Optional[str] = Field(default=None, description="CNPJ ou CPF do fornecedor")
    fornecedor_telefone: Optional[str] = Field(default=None, description="Telefone / Celular do fornecedor")
    fornecedor_uf: Optional[str] = Field(default=None, max_length=2, description="UF do fornecedor")
    fornecedor_cidade: Optional[str] = Field(default=None, description="Cidade do fornecedor")
    numero_documento: Optional[str] = Field(default=None, description="Nº do recibo, cupom ou documento fiscal")
    serie: Optional[str] = Field(default="MAN", description="Série ou identificador do tipo de compra")
    data_emissao: Optional[str] = Field(default=None, description="Data da compra/emissão (YYYY-MM-DD)")
    forma_pagamento: Optional[str] = Field(default="OUTRO", description="DINHEIRO, PIX, BOLETO, CARTAO_CREDITO, CARTAO_DEBITO, OUTRO")
    observacao: Optional[str] = Field(default=None, description="Observações complementares")
    anexo_url: Optional[str] = Field(default=None, description="URL do comprovante anexado")
    anexo_nome: Optional[str] = Field(default=None, description="Nome original do arquivo anexado")
    anexo_tipo: Optional[str] = Field(default=None, description="Extensão/tipo do anexo (PDF, JPG, PNG, WEBP)")
    itens: List[ItemCompraManualCreate] = Field(..., min_length=1, description="Lista de itens comprados")


class CompraManualResponse(BaseModel):
    sucesso: bool
    mensagem: str
    compra_id: int
    chave_acesso: str
    numero_documento: str
    valor_total: float
    total_itens: int


class FornecedorResponse(BaseModel):
    id: int
    empresa_id: int
    nome: str
    cnpj_cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    ativo: bool

    class Config:
        from_attributes = True


class UploadComprovanteResponse(BaseModel):
    url: str
    nome_original: str
    tipo: str
