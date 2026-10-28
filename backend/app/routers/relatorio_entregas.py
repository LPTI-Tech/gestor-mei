from typing import Optional
from datetime import datetime, date, time
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.venda import Venda
from app.models.regiao_entrega import RegiaoEntrega
from app.models.motoboy import Motoboy
from app.models.user import User
from app.schemas.relatorio_entrega import (
    RelatorioEntregasResponse,
    RegiaoEntregaStat,
    MotoboyEntregaStat
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/relatorio-entregas", tags=["Relatórios de Entrega"])

@router.get("", response_model=RelatorioEntregasResponse)
def get_relatorio_entregas(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    empresa_id = current_user.empresa_id
    
    # Query base para pedidos de entrega
    query = db.query(Venda).filter(
        Venda.empresa_id == empresa_id,
        Venda.tipo_pedido == "ENTREGA"
    )

    if data_inicio:
        dt_start = datetime.combine(data_inicio, time.min)
        query = query.filter(Venda.data_hora >= dt_start)
    if data_fim:
        dt_end = datetime.combine(data_fim, time.max)
        query = query.filter(Venda.data_hora <= dt_end)

    pedidos_entrega = query.all()
    total_pedidos = len(pedidos_entrega)

    pedidos_entregues = sum(1 for p in pedidos_entrega if p.status_pedido == "Entregue")
    pedidos_em_transito = sum(1 for p in pedidos_entrega if p.status_pedido in ["Recebido", "Em Preparo", "Saiu para Entrega"])
    pedidos_cancelados = sum(1 for p in pedidos_entrega if p.status_pedido == "Cancelado" or p.status == "Cancelada")

    # Somatório de taxas cobradas de pedidos não cancelados
    total_taxas_cobradas = sum(
        p.taxa_entrega for p in pedidos_entrega if p.status_pedido != "Cancelado" and p.status != "Cancelada"
    )

    # Somatório de taxas pagas/devidas aos motoboys
    total_taxas_pagas_motoboy = sum(
        p.taxa_motoboy for p in pedidos_entrega if p.motoboy_id and p.status_pedido != "Cancelado" and p.status != "Cancelada"
    )

    saldo_taxas = round(total_taxas_cobradas - total_taxas_pagas_motoboy, 2)

    # 1. Entregas por Região
    regioes = db.query(RegiaoEntrega).filter(RegiaoEntrega.empresa_id == empresa_id).all()
    entregas_por_regiao = []
    
    # Group pedidos by regiao_entrega_id
    pedidos_validos = [p for p in pedidos_entrega if p.status_pedido != "Cancelado" and p.status != "Cancelada"]
    total_validos = len(pedidos_validos)

    regiao_dict = {r.id: r for r in regioes}
    regiao_counts = {}
    regiao_taxas = {}

    for p in pedidos_validos:
        rid = p.regiao_entrega_id
        regiao_counts[rid] = regiao_counts.get(rid, 0) + 1
        regiao_taxas[rid] = regiao_taxas.get(rid, 0.0) + p.taxa_entrega

    for rid, count in regiao_counts.items():
        if rid in regiao_dict:
            r_obj = regiao_dict[rid]
            r_nome = r_obj.nome
            r_padrao = r_obj.taxa_entrega
        else:
            r_nome = "Outras / Sem Região Definida"
            r_padrao = 0.0

        taxas_arr = round(regiao_taxas.get(rid, 0.0), 2)
        pct = round((count / total_validos) * 100, 1) if total_validos > 0 else 0.0
        entregas_por_regiao.append(RegiaoEntregaStat(
            regiao_id=rid,
            regiao_nome=r_nome,
            taxa_padrao=r_padrao,
            total_entregas=count,
            total_taxas_arrecadadas=taxas_arr,
            percentual_entregas=pct
        ))

    entregas_por_regiao.sort(key=lambda x: x.total_entregas, reverse=True)

    # 2. Entregas por Motoboy
    motoboys = db.query(Motoboy).filter(Motoboy.empresa_id == empresa_id).all()
    motoboy_dict = {m.id: m for m in motoboys}
    motoboy_counts = {}
    motoboy_devido = {}
    motoboy_arrecadado = {}

    for p in pedidos_validos:
        if p.motoboy_id:
            mid = p.motoboy_id
            motoboy_counts[mid] = motoboy_counts.get(mid, 0) + 1
            motoboy_devido[mid] = motoboy_devido.get(mid, 0.0) + p.taxa_motoboy
            motoboy_arrecadado[mid] = motoboy_arrecadado.get(mid, 0.0) + p.taxa_entrega

    entregas_por_motoboy = []
    for mid, count in motoboy_counts.items():
        m_obj = motoboy_dict.get(mid)
        m_nome = m_obj.nome if m_obj else f"Motoboy #{mid}"
        devido = round(motoboy_devido.get(mid, 0.0), 2)
        arrecadado = round(motoboy_arrecadado.get(mid, 0.0), 2)
        saldo_m = round(arrecadado - devido, 2)
        entregas_por_motoboy.append(MotoboyEntregaStat(
            motoboy_id=mid,
            motoboy_nome=m_nome,
            total_entregas=count,
            total_devido=devido,
            total_arrecadado_cliente=arrecadado,
            saldo_empresa=saldo_m
        ))

    entregas_por_motoboy.sort(key=lambda x: x.total_entregas, reverse=True)

    return RelatorioEntregasResponse(
        periodo_inicio=data_inicio.isoformat() if data_inicio else None,
        periodo_fim=data_fim.isoformat() if data_fim else None,
        total_pedidos_entrega=total_pedidos,
        pedidos_entregues=pedidos_entregues,
        pedidos_em_transito=pedidos_em_transito,
        pedidos_cancelados=pedidos_cancelados,
        total_taxas_cobradas=round(total_taxas_cobradas, 2),
        total_taxas_pagas_motoboy=round(total_taxas_pagas_motoboy, 2),
        saldo_taxas_logistica=saldo_taxas,
        entregas_por_regiao=entregas_por_regiao,
        entregas_por_motoboy=entregas_por_motoboy
    )
