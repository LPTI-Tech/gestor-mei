from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional
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

    @property
    def user_abertura_nome(self) -> Optional[str]:
        return self.user_abertura.nome if self.user_abertura else None

    @property
    def user_fechamento_nome(self) -> Optional[str]:
        return self.user_fechamento.nome if self.user_fechamento else None

    @property
    def total_saidas(self) -> float:
        if not self.lancamentos:
            return 0.0
        return round(sum(float(l.valor or 0.0) for l in self.lancamentos if l.tipo == "SAIDA"), 2)

    @property
    def total_entradas(self) -> float:
        if not self.lancamentos:
            return 0.0
        return round(sum(float(l.valor or 0.0) for l in self.lancamentos if l.tipo == "ENTRADA"), 2)

    @property
    def vendas_dinheiro(self) -> float:
        if self.valor_esperado is not None:
            calc = (float(self.valor_esperado) - float(self.valor_inicial or 0.0) - self.total_entradas + self.total_saidas)
            return round(max(0.0, calc), 2)
        return 0.0

    @property
    def notificacao_enviada(self) -> bool:
        return getattr(self, "_notificacao_enviada", False)

    @notificacao_enviada.setter
    def notificacao_enviada(self, value: bool):
        self._notificacao_enviada = bool(value)


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

    @property
    def user_nome(self) -> Optional[str]:
        return self.user.nome if self.user else None
