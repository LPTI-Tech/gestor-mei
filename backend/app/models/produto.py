from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    tipo = Column(String(20), default="PRODUTO", nullable=False) # PRODUTO, SERVICO
    categoria = Column(String(100), nullable=False, default="Outros")
    preco_venda = Column(Float, nullable=False, default=0.0)
    custo_unitario = Column(Float, nullable=False, default=0.0)
    quantidade_estoque = Column(Float, nullable=False, default=0.0)
    estoque_minimo = Column(Float, nullable=False, default=0.0)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="produtos")
