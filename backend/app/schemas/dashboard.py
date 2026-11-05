from pydantic import BaseModel
from typing import List, Dict, Optional

class ChartPoint(BaseModel):
    label: str
    valor: float
    quantidade: int = 0

class BreakdownItem(BaseModel):
    nome: str
    valor: float
    quantidade: int
    percentual: float

class DashboardMetricsResponse(BaseModel):
    venda_dia: float = 0.0
    venda_semana: float = 0.0
    venda_mes: float = 0.0
    venda_ano: float = 0.0
    caixa_atual: float = 0.0
    qtd_vendas_mes: int = 0
    ticket_medio_mes: float = 0.0
    
    # Indicadores financeiros (Mascarados para perfil OPERATOR)
    entradas_mes: float = 0.0
    saidas_mes: float = 0.0
    lucro_operacional_mes: float = 0.0
    
    # Gráficos
    vendas_por_dia: List[ChartPoint] = []
    vendas_por_mes: List[ChartPoint] = []
    
    # Meios de pagamento
    pagamentos_breakdown: List[BreakdownItem] = []
    
    # Origens de venda
    origens_breakdown: List[BreakdownItem] = []

    # Indicadores de Estoque (Sprint 4)
    total_itens_estoque: Optional[int] = 0
    itens_estoque_baixo: Optional[int] = 0
    valor_estoque_custo: Optional[float] = 0.0

    # Indicadores do Controle DAS Mensal (Sprint 5)
    das_status_mes_atual: Optional[str] = "Pendente"
    das_valor_mes_atual: Optional[float] = 0.0
    das_vencimento_mes_atual: Optional[str] = None
    das_dias_restantes: Optional[int] = None
    das_qtd_atrasados: Optional[int] = 0
    das_qtd_pendentes: Optional[int] = 0
    das_qtd_pagos: Optional[int] = 0
    das_alerta_tipo: Optional[str] = None
    das_alerta_mensagem: Optional[str] = None

    # Controle de Visibilidade RBAC (Sprint Security 2)
    is_restricted: Optional[bool] = False
    role: Optional[str] = None
