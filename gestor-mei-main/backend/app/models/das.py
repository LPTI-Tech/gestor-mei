from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class DasMensal(Base):
    __tablename__ = "das_mensal"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    
    ano = Column(Integer, nullable=False, index=True)
    mes = Column(Integer, nullable=False, index=True)
    valor = Column(Float, nullable=False, default=75.60)
    vencimento = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="Pendente", index=True)  # "Pago", "Pendente", "Atrasado"
    data_pagamento = Column(Date, nullable=True)
    observacao = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    empresa = relationship("Empresa", backref="das_mensais")

