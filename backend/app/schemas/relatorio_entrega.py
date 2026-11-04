from pydantic import BaseModel
from typing import List, Optional

class RegiaoEntregaStat(BaseModel):
    regiao_id: Optional[int] = None
    regiao_nome: str
    taxa_padrao: float
    total_entregas: int
    total_taxas_arrecadadas: float
    percentual_entregas: float

class MotoboyEntregaStat(BaseModel):
    motoboy_id: Optional[int] = None
    motoboy_nome: str
    total_entregas: int
    total_devido: float
    total_arrecadado_cliente: float
    saldo_empresa: float  # total_arrecadado_cliente - total_devido

class RelatorioEntregasResponse(BaseModel):
    periodo_inicio: Optional[str] = None
    periodo_fim: Optional[str] = None
    total_pedidos_entrega: int
    pedidos_entregues: int
    pedidos_em_transito: int
    pedidos_cancelados: int
    total_taxas_cobradas: float
    total_taxas_pagas_motoboy: float
    saldo_taxas_logistica: float  # total_taxas_cobradas - total_taxas_pagas_motoboy
    entregas_por_regiao: List[RegiaoEntregaStat] = []
    entregas_por_motoboy: List[MotoboyEntregaStat] = []
