from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class RegiaoEntrega(Base):
    __tablename__ = "regioes_entrega"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    
    nome = Column(String(100), nullable=False)
    taxa_entrega = Column(Float, default=0.0, nullable=False)
    tempo_estimado_minutos = Column(Integer, default=30, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="regioes_entrega")
