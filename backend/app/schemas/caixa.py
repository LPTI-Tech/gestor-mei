from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CaixaAberturaRequest(BaseModel):
    valor_inicial: float = Field(ge=0, default=0.0)
    observacoes: Optional[str] = None

class CaixaFechamentoRequest(BaseModel):
    valor_informado: float = Field(ge=0)
    observacoes: Optional[str] = None

class CaixaLancamentoCreate(BaseModel):
    tipo: str # ENTRADA, SAIDA
    categoria: str # Recebimentos diversos, Ajustes positivos, Gás, Mercadorias, Ajudantes, Motoboys, Água, Energia, Internet, Manutenção, Outros
    descricao: str = Field(..., min_length=5, description="Motivo detalhado do lançamento (mínimo 5 caracteres)")
    valor: float = Field(gt=0)

class CaixaLancamentoResponse(BaseModel):
    id: int
    empresa_id: int
    caixa_turno_id: int
    user_id: Optional[int] = None
    user_nome: Optional[str] = None
    tipo: str
    categoria: str
    descricao: str
    valor: float
    data_hora: datetime

    class Config:
        from_attributes = True

class CaixaTurnoResponse(BaseModel):
    id: int
    empresa_id: int
    user_abertura_id: int
    user_fechamento_id: Optional[int] = None
    user_abertura_nome: Optional[str] = None
    user_fechamento_nome: Optional[str] = None
    data_abertura: datetime
    valor_inicial: float
    data_fechamento: Optional[datetime] = None
    valor_informado: Optional[float] = None
    valor_esperado: Optional[float] = None
    diferenca: Optional[float] = None
    total_entradas: Optional[float] = 0.0
    total_saidas: Optional[float] = 0.0
    vendas_dinheiro: Optional[float] = 0.0
    status: str
    observacoes: Optional[str] = None
    notificacao_enviada: Optional[bool] = False
    created_at: datetime
    lancamentos: List[CaixaLancamentoResponse] = []

    class Config:
        from_attributes = True

class CaixaStatusResponse(BaseModel):
    is_aberto: bool
    turno_atual: Optional[CaixaTurnoResponse] = None
    saldo_dinheiro_atual: Optional[float] = 0.0
    total_entradas_dinheiro: Optional[float] = 0.0
    total_saidas_dinheiro: Optional[float] = 0.0
    vendas_dinheiro_no_turno: Optional[float] = 0.0
