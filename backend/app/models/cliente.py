from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    regiao_id = Column(Integer, ForeignKey("regioes_entrega.id"), nullable=True, index=True)
    
    nome = Column(String(150), nullable=False, index=True)
    telefone = Column(String(30), nullable=True, index=True)
    cpf_cnpj = Column(String(30), nullable=True)
    email = Column(String(100), nullable=True)
    endereco = Column(String(250), nullable=True)
    observacoes = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    empresa = relationship("Empresa", backref="clientes")
    regiao = relationship("RegiaoEntrega", backref="clientes")
    vendas = relationship("Venda", back_populates="cliente")
