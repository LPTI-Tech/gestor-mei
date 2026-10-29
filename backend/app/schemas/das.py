from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class DasMensalBase(BaseModel):
    ano: int
    mes: int
    valor: float
    vencimento: date
    status: str = "Pendente"  # "Pago", "Pendente", "Atrasado"
    data_pagamento: Optional[date] = None
    observacao: Optional[str] = None

class DasMensalCreate(DasMensalBase):
    pass

class DasMensalUpdate(BaseModel):
    valor: Optional[float] = None
    vencimento: Optional[date] = None
    status: Optional[str] = None
    data_pagamento: Optional[date] = None
    observacao: Optional[str] = None

class DasRegistrarPagamentoRequest(BaseModel):
    data_pagamento: Optional[date] = None
    valor: Optional[float] = None
    observacao: Optional[str] = None

class DasAlterarStatusRequest(BaseModel):
    status: str  # "Pago", "Pendente", "Atrasado"
    data_pagamento: Optional[date] = None
    observacao: Optional[str] = None

class DasGerarAnoRequest(BaseModel):
    ano: int
    valor_mensal: Optional[float] = 75.60

class DasMensalResponse(DasMensalBase):
    id: int
    empresa_id: int
    nome_mes: Optional[str] = None
    competencia_formatada: Optional[str] = None
    dias_para_vencimento: Optional[int] = None
    alerta_vencimento: Optional[str] = None  # "vencido", "vence_hoje", "vence_7_dias", "em_dia", "pago"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DasResumoResponse(BaseModel):
    ano: int
    total_pago: float
    total_pendente: float
    total_atrasado: float
    qtd_pago: int
    qtd_pendente: int
    qtd_atrasado: int
    total_guias: int
    das_mes_atual: Optional[DasMensalResponse] = None
    proximo_vencimento: Optional[DasMensalResponse] = None
    alerta_principal: Optional[str] = None
    tipo_alerta: Optional[str] = None  # "error", "warning", "success", "info"

class DasVencimentosResponse(BaseModel):
    ano: int
    das_vence_em_7_dias: List[DasMensalResponse]
    das_vencidos: List[DasMensalResponse]
    das_pagos: List[DasMensalResponse]
    proximo_a_vencer: Optional[DasMensalResponse] = None
    resumo: DasResumoResponse

