from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)  # ENTRADA, SAIDA, AJUSTE
    quantidade = Column(Float, nullable=False, default=0.0)
    motivo = Column(String(100), nullable=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    data_movimentacao = Column(DateTime, default=datetime.utcnow, nullable=False)
    observacao = Column(Text, nullable=True)

    empresa = relationship("Empresa")
    produto = relationship("Produto", backref="movimentacoes_estoque")
    usuario = relationship("User")
