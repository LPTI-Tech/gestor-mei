from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ItemVenda(Base):
    __tablename__ = "itens_venda"

    id = Column(Integer, primary_key=True, index=True)
    venda_id = Column(Integer, ForeignKey("vendas.id", ondelete="CASCADE"), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=True)
    
    descricao = Column(String(200), nullable=False)
    tipo_item = Column(String(20), default="PRODUTO", nullable=False)  # PRODUTO, SERVICO
    quantidade = Column(Float, nullable=False, default=1.0)
    preco_unitario = Column(Float, nullable=False, default=0.0)
    subtotal = Column(Float, nullable=False, default=0.0)
    observacoes = Column(String(200), nullable=True)

    venda = relationship("Venda", back_populates="itens")
    produto = relationship("Produto")


class Venda(Base):
    __tablename__ = "vendas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    caixa_turno_id = Column(Integer, ForeignKey("caixa_turnos.id"), nullable=True, index=True)

    # Identificação do Pedido de Entrega
    numero_pedido = Column(String(30), nullable=True, index=True)
    tipo_pedido = Column(String(30), default="BALCAO", nullable=False)  # BALCAO, ENTREGA, RETIRADA
    status_pedido = Column(String(30), default="Recebido", nullable=False)  # Recebido, Em Preparo, Saiu para Entrega, Entregue, Cancelado

    # Logística de Entrega e Região
    regiao_entrega_id = Column(Integer, ForeignKey("regioes_entrega.id"), nullable=True, index=True)
    taxa_entrega = Column(Float, nullable=False, default=0.0)
    endereco_entrega = Column(String(250), nullable=True)

    # Vinculação Opcional de Motoboy
    motoboy_id = Column(Integer, ForeignKey("motoboys.id"), nullable=True, index=True)
    taxa_motoboy = Column(Float, nullable=False, default=0.0)
    data_entrega = Column(DateTime, nullable=True)

    # Totais e Valores Financeiros
    valor_subtotal = Column(Float, nullable=False, default=0.0)
    desconto = Column(Float, nullable=False, default=0.0)
    valor_total = Column(Float, nullable=False, default=0.0)

    # Classificação e Canais
    origem = Column(String(50), nullable=False, default="Balcão")
    # Origens: 'Balcão', 'WhatsApp', 'Delivery Próprio', 'iFood', 'Telefone', 'Outros'

    forma_pagamento = Column(String(50), nullable=False, default="Dinheiro")
    # Formas: 'Dinheiro', 'PIX', 'Débito', 'Crédito'

    status = Column(String(30), default="Concluída", nullable=False)
    # Status financeiro: 'Concluída', 'Cancelada'

    observacoes = Column(Text, nullable=True)
    tipo_item = Column(String(20), default="PRODUTO", nullable=False)  # PRODUTO, SERVICO, MISTO

    # Campos de compatibilidade para itens simples
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=True)
    descricao_produto = Column(String(200), nullable=True)
    quantidade = Column(Float, nullable=False, default=1.0)
    preco_unitario = Column(Float, nullable=False, default=0.0)

    data_hora = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="vendas")
    cliente = relationship("Cliente", back_populates="vendas")
    regiao_entrega = relationship("RegiaoEntrega", backref="vendas")
    motoboy = relationship("Motoboy", backref="pedidos_venda")
    user = relationship("User", backref="vendas")
    caixa_turno = relationship("CaixaTurno", backref="vendas")
    produto = relationship("Produto")
    itens = relationship("ItemVenda", back_populates="venda", cascade="all, delete-orphan", lazy="selectin")
