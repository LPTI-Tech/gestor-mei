from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class AuditoriaSuporte(Base):
    __tablename__ = "auditoria_suporte"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    master_email = Column(String(150), nullable=False, index=True)
    master_nome = Column(String(150), nullable=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    empresa_nome = Column(String(150), nullable=True)
    empresa_cnpj = Column(String(20), nullable=True)
    acao = Column(String(100), nullable=False, index=True)  # ex: INICIOU_SESSAO_SUPORTE, ENCERROU_SESSAO_SUPORTE, ACAO_MODULO
    detalhes = Column(Text, nullable=True)
    ip = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    master = relationship("User", foreign_keys=[master_id])
    empresa = relationship("Empresa", foreign_keys=[empresa_id])
