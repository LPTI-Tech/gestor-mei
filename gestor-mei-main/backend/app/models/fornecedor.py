from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Fornecedor(Base):
    __tablename__ = "fornecedores"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome = Column(String(255), nullable=False, index=True)
    cnpj_cpf = Column(String(20), nullable=True, index=True)
    telefone = Column(String(30), nullable=True)
    email = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=True)
    uf = Column(String(2), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    empresa = relationship("Empresa", backref="fornecedores")
