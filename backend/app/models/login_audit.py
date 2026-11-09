from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AuditoriaLogin(Base):
    __tablename__ = "auditoria_login"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    email = Column(String(150), nullable=False, index=True)
    provider = Column(String(30), default="LOCAL", nullable=False)  # "LOCAL", "GOOGLE", "MICROSOFT"
    sucesso = Column(Boolean, nullable=False)
    motivo_falha = Column(String(255), nullable=True)
    ip = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    empresa_id = Column(Integer, nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="auditorias_login")
