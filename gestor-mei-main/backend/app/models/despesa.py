from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class Despesa(Base):
    __tablename__ = "despesas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    
    data = Column(Date, default=date.today, nullable=False, index=True)
    categoria = Column(String(100), nullable=False)
    # Categorias: 'Mercadorias', 'Insumos', 'Gás', 'Energia', 'Água', 'Transporte', 'Internet', 'Funcionários', 'Motoboys', 'Outros'
    
    descricao = Column(String(255), nullable=False)
    valor = Column(Float, nullable=False)
    forma_pagamento = Column(String(50), nullable=False, default="PIX")
    # Dinheiro, PIX, Débito, Crédito, Boleto
    
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="despesas")
