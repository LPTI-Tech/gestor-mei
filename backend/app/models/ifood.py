from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class LancamentoIFood(Base):
    __tablename__ = "lancamentos_ifood"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    
    data = Column(Date, default=date.today, nullable=False, index=True)
    numero_pedido = Column(String(100), nullable=False)
    valor_bruto = Column(Float, nullable=False)
    taxa_ifood = Column(Float, nullable=False)
    valor_liquido = Column(Float, nullable=False)
    observacoes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="lancamentos_ifood")
