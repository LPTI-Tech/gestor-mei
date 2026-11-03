import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class UserRole(str, enum.Enum):
    MASTER = "MASTER"        # Perfil da plataforma LPTI Tech (administrador global)
    OWNER = "OWNER"          # Proprietário titular da empresa MEI
    CONSULTOR = "CONSULTOR"  # Consultor externo vinculado a uma ou mais empresas
    OPERATOR = "OPERATOR"    # Operador de caixa e atendimento
    
    # Aliases para retrocompatibilidade
    ADMIN = "OWNER"
    OPERADOR = "OPERATOR"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OPERATOR, nullable=False)
    ativo = Column(Boolean, default=True)
    ultimo_acesso = Column(DateTime, nullable=True)
    criado_por_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="users")
    criador = relationship("User", remote_side=[id], foreign_keys=[criado_por_id])
