from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expira_em = Column(DateTime, nullable=False)
    usado = Column(Boolean, default=False, nullable=False)
    usado_em = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class AuditoriaRecuperacaoSenha(Base):
    __tablename__ = "auditoria_recuperacao_senha"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    email_solicitado = Column(String(150), nullable=False, index=True)
    evento = Column(String(50), nullable=False)  # SOLICITACAO, VALIDACAO_TOKEN, REDEFINICAO_SUCESSO, REDEFINICAO_FALHA
    sucesso = Column(Boolean, nullable=False)
    motivo_falha = Column(String(255), nullable=True)
    ip = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")

