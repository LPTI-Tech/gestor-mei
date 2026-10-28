from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class CaixaTurno(Base):
    __tablename__ = "caixa_turnos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    user_abertura_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_fechamento_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    data_abertura = Column(DateTime, default=datetime.utcnow, nullable=False)
    valor_inicial = Column(Float, default=0.0, nullable=False)
    
    data_fechamento = Column(DateTime, nullable=True)
    valor_informado = Column(Float, nullable=True) # Valor contado fisicamente
    valor_esperado = Column(Float, nullable=True)  # Calculado: inicial + entradas em dinheiro - saídas em dinheiro
    diferenca = Column(Float, nullable=True)       # valor_informado - valor_esperado (>0 sobra, <0 falta)
    
    status = Column(String(20), default="ABERTO", nullable=False) # ABERTO, FECHADO
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", backref="turnos_caixa")
    user_abertura = relationship("User", foreign_keys=[user_abertura_id])
    user_fechamento = relationship("User", foreign_keys=[user_fechamento_id])
    lancamentos = relationship("CaixaLancamento", back_populates="caixa_turno", cascade="all, delete-orphan")


class CaixaLancamento(Base):
    __tablename__ = "caixa_lancamentos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    caixa_turno_id = Column(Integer, ForeignKey("caixa_turnos.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    tipo = Column(String(20), nullable=False) # ENTRADA, SAIDA
    categoria = Column(String(100), nullable=False)
    # Categorias Entradas: Recebimentos diversos, Ajustes positivos
    # Categorias Saídas: Compra de gás, Compra de mercadorias, Pagamento de ajudantes, Pagamento de motoboys, Água, Energia, Internet, Manutenção, Outros
    
    descricao = Column(String(255), nullable=False)
    valor = Column(Float, nullable=False)
    data_hora = Column(DateTime, default=datetime.utcnow)
    
    caixa_turno = relationship("CaixaTurno", back_populates="lancamentos")
    empresa = relationship("Empresa")
    user = relationship("User")
