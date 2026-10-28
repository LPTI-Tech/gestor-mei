from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ItemVendaBase(BaseModel):
    produto_id: Optional[int] = None
    descricao: str = Field(..., min_length=1, max_length=200)
    tipo_item: str = "PRODUTO"  # PRODUTO, SERVICO
    quantidade: float = Field(default=1.0, gt=0)
    preco_unitario: float = Field(default=0.0, ge=0)
    subtotal: Optional[float] = None
    observacoes: Optional[str] = None

class ItemVendaCreate(ItemVendaBase):
    pass

class ItemVendaResponse(ItemVendaBase):
    id: int
    venda_id: int
    subtotal: float

    class Config:
        from_attributes = True


class VendaBase(BaseModel):
    cliente_id: Optional[int] = None
    origem: str = "Balcão"
    forma_pagamento: str = "Dinheiro"
    status: str = "Concluída"
    desconto: float = Field(default=0.0, ge=0)
    observacoes: Optional[str] = None
    data_hora: Optional[datetime] = None

    # Delivery & Pedidos
    numero_pedido: Optional[str] = None
    tipo_pedido: str = "BALCAO"  # BALCAO, ENTREGA, RETIRADA
    status_pedido: str = "Recebido"  # Recebido, Em Preparo, Saiu para Entrega, Entregue, Cancelado
    regiao_entrega_id: Optional[int] = None
    taxa_entrega: float = Field(default=0.0, ge=0)
    motoboy_id: Optional[int] = None
    taxa_motoboy: float = Field(default=0.0, ge=0)
    endereco_entrega: Optional[str] = None

    # Compatibilidade com venda de item único direta (se itens não for passado)
    produto_id: Optional[int] = None
    descricao_produto: Optional[str] = None
    tipo_item: Optional[str] = "PRODUTO"
    quantidade: Optional[float] = Field(default=1.0, gt=0)
    preco_unitario: Optional[float] = Field(default=0.0, ge=0)
    valor_total: Optional[float] = Field(default=0.0, ge=0)

class VendaCreate(VendaBase):
    itens: Optional[List[ItemVendaCreate]] = None

class VendaStatusPedidoUpdate(BaseModel):
    status_pedido: str = Field(..., description="Recebido, Em Preparo, Saiu para Entrega, Entregue, Cancelado")

class VendaVincularMotoboy(BaseModel):
    motoboy_id: int
    taxa_motoboy: Optional[float] = Field(None, ge=0)

class VendaResponse(BaseModel):
    id: int
    empresa_id: int
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    cliente_telefone: Optional[str] = None
    user_id: Optional[int] = None
    caixa_turno_id: Optional[int] = None

    # Delivery & Pedidos
    numero_pedido: Optional[str] = None
    tipo_pedido: str
    status_pedido: str
    regiao_entrega_id: Optional[int] = None
    regiao_entrega_nome: Optional[str] = None
    taxa_entrega: float
    motoboy_id: Optional[int] = None
    motoboy_nome: Optional[str] = None
    taxa_motoboy: float
    endereco_entrega: Optional[str] = None
    data_entrega: Optional[datetime] = None

    # Valores
    valor_subtotal: float
    desconto: float
    valor_total: float
    origem: str
    forma_pagamento: str
    status: str
    observacoes: Optional[str] = None
    tipo_item: str
    data_hora: datetime
    created_at: datetime
    
    # Lista de itens do carrinho
    itens: List[ItemVendaResponse] = []

    # Compatibilidade legada
    descricao_produto: Optional[str] = None
    quantidade: Optional[float] = None
    preco_unitario: Optional[float] = None

    class Config:
        from_attributes = True

class ComandaImpressaoResponse(BaseModel):
    venda_id: int
    numero_pedido: str
    comanda_texto: str
    largura_colunas: int = 48
