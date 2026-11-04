from pydantic import BaseModel
from typing import List, Dict, Optional

class MesMeiItem(BaseModel):
    mes_num: int
    mes_nome: str
    faturamento_produtos: float
    faturamento_servicos: float
    faturamento_total: float
    qtd_vendas: int
    ticket_medio: float
    acumulado_ate_o_mes: float

class CanalReceitaItem(BaseModel):
    canal: str
    valor: float
    percentual: float

class FormaPagamentoReceitaItem(BaseModel):
    forma: str
    valor: float
    percentual: float

class RelatorioMeiResponse(BaseModel):
    ano: int
    limite_mei_anual: float
    limite_proporcional: float
    faturamento_acumulado_ano: float
    faturamento_restante: float
    percentual_utilizado: float
    media_mensal: float
    projecao_anual: float
    status_enquadramento: str # SEGURO, ATENCAO, ALERTA, EXCEDIDO_ATE_20, DESENQUADRAMENTO
    mensagem_status: str
    
    meses: List[MesMeiItem]
    receita_por_forma_pagamento: List[FormaPagamentoReceitaItem]
    receita_por_canal: List[CanalReceitaItem]
    
    # Dados da empresa para DASN-SIMEI
    nome_empresarial: str
    nome_fantasia: str
    cnpj: str
    cpf_proprietario: str
