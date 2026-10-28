import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERADOR = "OPERADOR"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OPERADOR, nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="users")
