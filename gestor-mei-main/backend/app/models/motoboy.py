from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Motoboy(Base):
    __tablename__ = "motoboys"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome = Column(String(150), nullable=False)
    telefone = Column(String(50), nullable=True)
    valor_por_entrega = Column(Float, default=0.0, nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="motoboys")
    entregas = relationship("EntregaMotoboy", back_populates="motoboy", cascade="all, delete-orphan")


class EntregaMotoboy(Base):
    __tablename__ = "entregas_motoboy"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    motoboy_id = Column(Integer, ForeignKey("motoboys.id"), nullable=False, index=True)
    
    data_hora = Column(DateTime, default=datetime.utcnow, index=True)
    numero_pedido = Column(String(100), nullable=False)
    valor_entrega = Column(Float, nullable=False)
    status_pagamento = Column(String(20), default="PENDENTE", nullable=False) # PENDENTE, PAGO
    data_pagamento = Column(DateTime, nullable=True)
    observacoes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa")
    motoboy = relationship("Motoboy", back_populates="entregas")
