from datetime import datetime, date, timedelta, time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database import get_db
from app.models.venda import Venda
from app.models.despesa import Despesa
from app.models.caixa import CaixaTurno, CaixaLancamento
from app.models.user import User
from app.models.produto import Produto
from app.schemas.dashboard import DashboardMetricsResponse, ChartPoint, BreakdownItem
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

MESES_NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

@router.get("", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    empresa_id = current_user.empresa_id
    today = date.today()
    now = datetime.utcnow()
    
    # Range definitions
    start_today = datetime.combine(today, time.min)
    end_today = datetime.combine(today, time.max)
    
    start_week = datetime.combine(today - timedelta(days=6), time.min)
    
    start_month = datetime(today.year, today.month, 1)
    if today.month == 12:
        end_month = datetime(today.year + 1, 1, 1)
    else:
        end_month = datetime(today.year, today.month + 1, 1)
        
    start_year = datetime(today.year, 1, 1)
    end_year = datetime(today.year + 1, 1, 1)
    
    # 1. Vendas
    venda_dia = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= start_today,
        Venda.data_hora <= end_today
    ).scalar()
    
    venda_semana = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= start_week,
        Venda.data_hora <= end_today
    ).scalar()
    
    venda_mes = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= start_month,
        Venda.data_hora < end_month
    ).scalar()
    
    venda_ano = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= start_year,
        Venda.data_hora < end_year
    ).scalar()
    
    qtd_vendas_mes = db.query(func.count(Venda.id)).filter(
        Venda.empresa_id == empresa_id,
        Venda.status == "Concluída",
        Venda.data_hora >= start_month,
        Venda.data_hora < end_month
    ).scalar() or 0
    
    ticket_medio = round(venda_mes / qtd_vendas_mes, 2) if qtd_vendas_mes > 0 else 0.0
    
    # 2. Caixa Atual
    caixa_atual = 0.0
    turno = db.query(CaixaTurno).filter(
        CaixaTurno.empresa_id == empresa_id,
        CaixaTurno.status == "ABERTO"
    ).order_by(CaixaTurno.data_abertura.desc()).first()
    
    if turno:
        vd_dinheiro = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
            Venda.empresa_id == empresa_id,
            Venda.caixa_turno_id == turno.id,
            Venda.forma_pagamento == "Dinheiro",
            Venda.status == "Concluída"
        ).scalar()
        
        ent = db.query(func.coalesce(func.sum(CaixaLancamento.valor), 0.0)).filter(
            CaixaLancamento.caixa_turno_id == turno.id,
            CaixaLancamento.tipo == "ENTRADA"
        ).scalar()
        
        sai = db.query(func.coalesce(func.sum(CaixaLancamento.valor), 0.0)).filter(
            CaixaLancamento.caixa_turno_id == turno.id,
            CaixaLancamento.tipo == "SAIDA"
        ).scalar()
        
        caixa_atual = round(turno.valor_inicial + vd_dinheiro + ent - sai, 2)
        
    # 3. Entradas, Saídas e Lucro no Mês
    # Despesas do mês
    despesas_mes = db.query(func.coalesce(func.sum(Despesa.valor), 0.0)).filter(
        Despesa.empresa_id == empresa_id,
        Despesa.data >= start_month.date(),
        Despesa.data < end_month.date()
    ).scalar()
    
    entradas_mes = round(venda_mes, 2)
    saidas_mes = round(despesas_mes, 2)
    lucro_operacional = round(entradas_mes - saidas_mes, 2)
    
    # 4. Gráfico Vendas por Dia (últimos 14 dias)
    vendas_por_dia: List[ChartPoint] = []
    for i in range(13, -1, -1):
        day_date = today - timedelta(days=i)
        d_start = datetime.combine(day_date, time.min)
        d_end = datetime.combine(day_date, time.max)
        
        res = db.query(
            func.coalesce(func.sum(Venda.valor_total), 0.0),
            func.count(Venda.id)
        ).filter(
            Venda.empresa_id == empresa_id,
            Venda.status == "Concluída",
            Venda.data_hora >= d_start,
            Venda.data_hora <= d_end
        ).first()
        
        day_str = day_date.strftime("%d/%m")
        vendas_por_dia.append(ChartPoint(
            label=day_str,
            valor=round(float(res[0]), 2),
            quantidade=int(res[1])
        ))
        
    # 5. Gráfico Vendas por Mês (12 meses do ano corrente)
    vendas_por_mes: List[ChartPoint] = []
    for m in range(1, 13):
        m_start = datetime(today.year, m, 1)
        if m == 12:
            m_end = datetime(today.year + 1, 1, 1)
        else:
            m_end = datetime(today.year, m + 1, 1)
            
        res_m = db.query(
            func.coalesce(func.sum(Venda.valor_total), 0.0),
            func.count(Venda.id)
        ).filter(
            Venda.empresa_id == empresa_id,
            Venda.status == "Concluída",
            Venda.data_hora >= m_start,
            Venda.data_hora < m_end
        ).first()
        
        vendas_por_mes.append(ChartPoint(
            label=MESES_NOMES[m - 1],
            valor=round(float(res_m[0]), 2),
            quantidade=int(res_m[1])
        ))
        
    # 6. Meios de Pagamento breakdown (no mês)
    formas = ["Dinheiro", "PIX", "Débito", "Crédito"]
    pagamentos_breakdown: List[BreakdownItem] = []
    for forma in formas:
        res_forma = db.query(
            func.coalesce(func.sum(Venda.valor_total), 0.0),
            func.count(Venda.id)
        ).filter(
            Venda.empresa_id == empresa_id,
            Venda.status == "Concluída",
            Venda.forma_pagamento == forma,
            Venda.data_hora >= start_month,
            Venda.data_hora < end_month
        ).first()
        
        v_forma = float(res_forma[0])
        q_forma = int(res_forma[1])
        pct_forma = round(v_forma / venda_mes * 100, 1) if venda_mes > 0 else 0.0
        
        pagamentos_breakdown.append(BreakdownItem(
            nome=forma,
            valor=round(v_forma, 2),
            quantidade=q_forma,
            percentual=pct_forma
        ))
        
    # 7. Origens de Venda breakdown (no mês)
    origens = ["Balcão", "WhatsApp", "Delivery Próprio", "iFood", "Telefone", "Outros"]
    origens_breakdown: List[BreakdownItem] = []
    for orig in origens:
        res_orig = db.query(
            func.coalesce(func.sum(Venda.valor_total), 0.0),
            func.count(Venda.id)
        ).filter(
            Venda.empresa_id == empresa_id,
            Venda.status == "Concluída",
            Venda.origem == orig,
            Venda.data_hora >= start_month,
            Venda.data_hora < end_month
        ).first()
        
        v_orig = float(res_orig[0])
        q_orig = int(res_orig[1])
        pct_orig = round(v_orig / venda_mes * 100, 1) if venda_mes > 0 else 0.0
        
        origens_breakdown.append(BreakdownItem(
            nome=orig,
            valor=round(v_orig, 2),
            quantidade=q_orig,
            percentual=pct_orig
        ))
        
    # 8. Indicadores de Estoque (Sprint 4)
    prods_est = db.query(Produto).filter(
        Produto.empresa_id == empresa_id,
        Produto.tipo == "PRODUTO",
        Produto.ativo == True
    ).all()
    total_itens_est = len(prods_est)
    itens_baixo_est = sum(1 for p in prods_est if (p.quantidade_estoque or 0.0) <= (p.estoque_minimo or 0.0))
    valor_est_custo = sum(float(p.quantidade_estoque or 0.0) * float(p.custo_unitario or 0.0) for p in prods_est)

    return DashboardMetricsResponse(
        venda_dia=round(venda_dia, 2),
        venda_semana=round(venda_semana, 2),
        venda_mes=round(venda_mes, 2),
        venda_ano=round(venda_ano, 2),
        caixa_atual=round(caixa_atual, 2),
        qtd_vendas_mes=qtd_vendas_mes,
        ticket_medio_mes=ticket_medio,
        entradas_mes=entradas_mes,
        saidas_mes=saidas_mes,
        lucro_operacional_mes=lucro_operacional,
        vendas_por_dia=vendas_por_dia,
        vendas_por_mes=vendas_por_mes,
        pagamentos_breakdown=pagamentos_breakdown,
        origens_breakdown=origens_breakdown,
        total_itens_estoque=total_itens_est,
        itens_estoque_baixo=itens_baixo_est,
        valor_estoque_custo=round(valor_est_custo, 2)
    )
