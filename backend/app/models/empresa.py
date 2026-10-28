from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from app.database import Base

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    nome_empresarial = Column(String(255), nullable=False)
    nome_fantasia = Column(String(255), nullable=False)
    cnpj = Column(String(30), nullable=False, unique=True, index=True)
    cpf_proprietario = Column(String(20), nullable=False)
    endereco = Column(String(255), nullable=True)
    telefone = Column(String(50), nullable=True)
    email = Column(String(120), nullable=False)
    limite_mei_anual = Column(Float, default=81000.00)
    data_inicio_atividades = Column(DateTime, default=datetime.utcnow)
    
    # Segmento & Feature Flags dos Módulos Opcionais
    segmento = Column(String(50), default="ALIMENTACAO") # ALIMENTACAO, SERVICOS, BELEZA, OFICINA, COMERCIO
    modulo_delivery = Column(Boolean, default=True)
    modulo_motoboy = Column(Boolean, default=True)
    modulo_ifood = Column(Boolean, default=True)
    modulo_estoque = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
