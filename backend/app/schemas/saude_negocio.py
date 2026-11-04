from pydantic import BaseModel
from typing import List, Optional

class EvolucaoMensalSaude(BaseModel):
    mes: str
    receita: float
    despesa: float
    resultado: float
    margem_percentual: float

class InsightSaude(BaseModel):
    tipo: str # SUCCESS, WARNING, INFO, DANGER
    titulo: str
    descricao: str

class SaudeNegocioResponse(BaseModel):
    periodo_dias: int
    receita_total: float
    despesas_totais: float
    resultado_operacional: float
    margem_lucro_percentual: float
    ticket_medio: float
    maior_canal_venda: str
    valor_maior_canal: float
    maior_forma_pagamento: str
    valor_maior_forma: float
    score_saude: int # 0 a 100
    classificacao_saude: str # EXCELENTE, SAUDAVEL, ATENCAO, CRITICO
    
    evolucao_mensal: List[EvolucaoMensalSaude]
    insights: List[InsightSaude]
