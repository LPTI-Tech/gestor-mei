from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from app.database import get_db
from app.models.venda import Venda
from app.models.despesa import Despesa
from app.models.user import User
from app.schemas.saude_negocio import (
    SaudeNegocioResponse,
    EvolucaoMensalSaude,
    InsightSaude
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/saude-negocio", tags=["Saúde do Negócio"])

MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

@router.get("", response_model=SaudeNegocioResponse)
def get_saude_negocio(
    dias: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    empresa_id = current_user.empresa_id
    today = date.today()
    dt_inicio = datetime.utcnow() - timedelta(days=dias)
    d_inicio_date = dt_inicio.date()
    
    # 1. Total Receita
    res_vendas = db.query(
        func.coalesce(func.sum(Venda.valor_total), 0.0),
        func.count(Venda.id)
    ).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= dt_inicio
    ).first()
    
    receita_total = round(float(res_vendas[0]), 2)
    qtd_vendas = int(res_vendas[1])
    ticket_medio = round(receita_total / qtd_vendas, 2) if qtd_vendas > 0 else 0.0
    
    # 2. Total Despesas
    res_desp = db.query(
        func.coalesce(func.sum(Despesa.valor), 0.0)
    ).filter(
        Despesa.empresa_id == empresa_id,
        Despesa.data >= d_inicio_date
    ).scalar()
    
    despesas_totais = round(float(res_desp), 2)
    
    # 3. Resultado Operacional e Margem
    resultado_operacional = round(receita_total - despesas_totais, 2)
    margem = round((resultado_operacional / receita_total * 100), 1) if receita_total > 0 else 0.0
    
    # 4. Maior canal de venda
    canais_res = db.query(
        Venda.origem,
        func.sum(Venda.valor_total).label("total")
    ).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= dt_inicio
    ).group_by(Venda.origem).order_by(desc("total")).first()
    
    maior_canal = canais_res.origem if canais_res else "Nenhum"
    valor_maior_canal = round(float(canais_res.total), 2) if canais_res else 0.0
    
    # 5. Maior forma de pagamento
    pagamentos_res = db.query(
        Venda.forma_pagamento,
        func.sum(Venda.valor_total).label("total")
    ).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= dt_inicio
    ).group_by(Venda.forma_pagamento).order_by(desc("total")).first()
    
    maior_pagto = pagamentos_res.forma_pagamento if pagamentos_res else "Nenhum"
    valor_maior_pagto = round(float(pagamentos_res.total), 2) if pagamentos_res else 0.0
    
    # 6. Evolução últimos 6 meses
    evolucao_mensal: List[EvolucaoMensalSaude] = []
    for i in range(5, -1, -1):
        target_m = today.month - i
        target_y = today.year
        while target_m <= 0:
            target_m += 12
            target_y -= 1
            
        m_start = datetime(target_y, target_m, 1)
        if target_m == 12:
            m_end = datetime(target_y + 1, 1, 1)
        else:
            m_end = datetime(target_y, target_m + 1, 1)
            
        rec_m = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
            Venda.empresa_id == empresa_id,
            Venda.status == "Concluída",
            Venda.data_hora >= m_start,
            Venda.data_hora < m_end
        ).scalar()
        
        desp_m = db.query(func.coalesce(func.sum(Despesa.valor), 0.0)).filter(
            Despesa.empresa_id == empresa_id,
            Despesa.data >= m_start.date(),
            Despesa.data < m_end.date()
        ).scalar()
        
        r_val = round(float(rec_m), 2)
        d_val = round(float(desp_m), 2)
        res_m_val = round(r_val - d_val, 2)
        m_pct = round((res_m_val / r_val * 100), 1) if r_val > 0 else 0.0
        
        evolucao_mensal.append(EvolucaoMensalSaude(
            mes=f"{MESES_ABREV[target_m - 1]}/{str(target_y)[2:]}",
            receita=r_val,
            despesa=d_val,
            resultado=res_m_val,
            margem_percentual=m_pct
        ))
        
    # 7. Score e Diagnóstico de Saúde
    score = 50
    if receita_total > 0:
        if margem >= 30:
            score += 35
        elif margem >= 15:
            score += 20
        elif margem >= 5:
            score += 5
        elif margem < 0:
            score -= 30
            
        if ticket_medio >= 35.0:
            score += 15
        elif ticket_medio >= 20.0:
            score += 10
            
    score = max(5, min(98, score))
    
    if score >= 80:
        classificacao = "EXCELENTE"
    elif score >= 60:
        classificacao = "SAUDAVEL"
    elif score >= 40:
        classificacao = "ATENCAO"
    else:
        classificacao = "CRITICO"
        
    # 8. Automated Business Insights for Small Food & Commerce MEIs
    insights: List[InsightSaude] = []
    
    # Margem insight
    if margem >= 20:
        insights.append(InsightSaude(
            tipo="SUCCESS",
            titulo="Margem de Lucro Saudável",
            descricao=f"Sua margem operacional está em {margem}%. Isso garante segurança para reinvestir no seu negócio e manter uma reserva de emergência."
        ))
    elif margem > 0:
        insights.append(InsightSaude(
            tipo="WARNING",
            titulo="Margem Operacional Apertada",
            descricao=f"Sua margem está em {margem}%. Considere renegociar fornecedores de insumos ou ajustar levemente preços de pratos/produtos de maior saída."
        ))
    else:
        insights.append(InsightSaude(
            tipo="DANGER",
            titulo="Atenção: Despesas Superando Vendas",
            descricao=f"Nos últimos {dias} dias as despesas (R$ {despesas_totais:,.2f}) superaram as entradas (R$ {receita_total:,.2f}). Revise compras e custos fixos urgentemente."
        ))
        
    # Canal insight
    if maior_canal == "iFood" and valor_maior_canal > (receita_total * 0.45):
        insights.append(InsightSaude(
            tipo="WARNING",
            titulo="Alta Dependência do iFood",
            descricao=f"{maior_canal} representa mais de 45% do faturamento. Fidelize clientes para pedir pelo WhatsApp próprio e economize em taxas de comissão!"
        ))
    elif maior_canal in ["WhatsApp", "Balcão"]:
        insights.append(InsightSaude(
            tipo="SUCCESS",
            titulo="Vendas Diretas Fortes",
            descricao=f"Seu canal principal é {maior_canal} (R$ {valor_maior_canal:,.2f}). Excelente! Vendas diretas possuem custo de intermediação zero."
        ))
        
    # Forma pagamento insight
    if maior_pagto == "PIX" or maior_pagto == "Dinheiro":
        insights.append(InsightSaude(
            tipo="INFO",
            titulo="Liquidez Imediata em Caixa",
            descricao=f"{maior_pagto} é a principal forma de recebimento. Isso traz capital de giro imediato sem descontos de antecipação de cartão."
        ))
        
    return SaudeNegocioResponse(
        periodo_dias=dias,
        receita_total=receita_total,
        despesas_totais=despesas_totais,
        resultado_operacional=resultado_operacional,
        margem_lucro_percentual=margem,
        ticket_medio=ticket_medio,
        maior_canal_venda=maior_canal,
        valor_maior_canal=valor_maior_canal,
        maior_forma_pagamento=maior_pagto,
        valor_maior_forma=valor_maior_pagto,
        score_saude=score,
        classificacao_saude=classificacao,
        evolucao_mensal=evolucao_mensal,
        insights=insights
    )
