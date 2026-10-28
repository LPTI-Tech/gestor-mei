from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database import get_db
from app.models.caixa import CaixaTurno, CaixaLancamento
from app.models.venda import Venda
from app.models.user import User
from app.schemas.caixa import (
    CaixaAberturaRequest,
    CaixaFechamentoRequest,
    CaixaLancamentoCreate,
    CaixaLancamentoResponse,
    CaixaTurnoResponse,
    CaixaStatusResponse
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/caixa", tags=["Caixa"])

@router.get("/status", response_model=CaixaStatusResponse)
def get_caixa_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    turno = db.query(CaixaTurno).filter(
        CaixaTurno.empresa_id == current_user.empresa_id,
        CaixaTurno.status == "ABERTO"
    ).order_by(desc(CaixaTurno.data_abertura)).first()
    
    if not turno:
        return CaixaStatusResponse(
            is_aberto=False,
            turno_atual=None,
            saldo_dinheiro_atual=0.0,
            total_entradas_dinheiro=0.0,
            total_saidas_dinheiro=0.0,
            vendas_dinheiro_no_turno=0.0
        )
        
    # Calculate current live expected balance
    # 1. Starting cash
    saldo = turno.valor_inicial
    
    # 2. Vendas em dinheiro neste turno
    vendas_dinheiro = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
        Venda.empresa_id == current_user.empresa_id,
        Venda.caixa_turno_id == turno.id,
        Venda.forma_pagamento == "Dinheiro",
        Venda.status == "Concluída"
    ).scalar()
    
    # 3. Lançamentos extras de entrada
    entradas = db.query(func.coalesce(func.sum(CaixaLancamento.valor), 0.0)).filter(
        CaixaLancamento.caixa_turno_id == turno.id,
        CaixaLancamento.tipo == "ENTRADA"
    ).scalar()
    
    # 4. Lançamentos de saída
    saidas = db.query(func.coalesce(func.sum(CaixaLancamento.valor), 0.0)).filter(
        CaixaLancamento.caixa_turno_id == turno.id,
        CaixaLancamento.tipo == "SAIDA"
    ).scalar()
    
    saldo_atual = round(saldo + vendas_dinheiro + entradas - saidas, 2)
    
    return CaixaStatusResponse(
        is_aberto=True,
        turno_atual=CaixaTurnoResponse.model_validate(turno),
        saldo_dinheiro_atual=saldo_atual,
        total_entradas_dinheiro=round(entradas, 2),
        total_saidas_dinheiro=round(saidas, 2),
        vendas_dinheiro_no_turno=round(vendas_dinheiro, 2)
    )


@router.post("/abrir", response_model=CaixaTurnoResponse)
def abrir_caixa(
    data: CaixaAberturaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if there is an active shift
    aberto = db.query(CaixaTurno).filter(
        CaixaTurno.empresa_id == current_user.empresa_id,
        CaixaTurno.status == "ABERTO"
    ).first()
    
    if aberto:
        raise HTTPException(
            status_code=400,
            detail="Já existe um turno de caixa aberto. Feche o turno atual antes de abrir um novo."
        )
        
    novo_turno = CaixaTurno(
        empresa_id=current_user.empresa_id,
        user_abertura_id=current_user.id,
        valor_inicial=data.valor_inicial,
        observacoes=data.observacoes,
        status="ABERTO",
        data_abertura=datetime.utcnow()
    )
    db.add(novo_turno)
    db.commit()
    db.refresh(novo_turno)
    return novo_turno


@router.post("/lancamento", response_model=CaixaLancamentoResponse)
def add_lancamento(
    data: CaixaLancamentoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    turno = db.query(CaixaTurno).filter(
        CaixaTurno.empresa_id == current_user.empresa_id,
        CaixaTurno.status == "ABERTO"
    ).order_by(desc(CaixaTurno.data_abertura)).first()
    
    if not turno:
        raise HTTPException(
            status_code=400,
            detail="Não há caixa aberto no momento para registrar lançamentos."
        )
        
    lancamento = CaixaLancamento(
        empresa_id=current_user.empresa_id,
        caixa_turno_id=turno.id,
        user_id=current_user.id,
        tipo=data.tipo.upper(),
        categoria=data.categoria,
        descricao=data.descricao,
        valor=data.valor,
        data_hora=datetime.utcnow()
    )
    db.add(lancamento)
    db.commit()
    db.refresh(lancamento)
    return lancamento


@router.post("/fechar", response_model=CaixaTurnoResponse)
def fechar_caixa(
    data: CaixaFechamentoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    turno = db.query(CaixaTurno).filter(
        CaixaTurno.empresa_id == current_user.empresa_id,
        CaixaTurno.status == "ABERTO"
    ).order_by(desc(CaixaTurno.data_abertura)).first()
    
    if not turno:
        raise HTTPException(
            status_code=400,
            detail="Não há caixa aberto no momento para fechar."
        )
        
    # Compute expected balance
    vendas_dinheiro = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
        Venda.empresa_id == current_user.empresa_id,
        Venda.caixa_turno_id == turno.id,
        Venda.forma_pagamento == "Dinheiro",
        Venda.status == "Concluída"
    ).scalar()
    
    entradas = db.query(func.coalesce(func.sum(CaixaLancamento.valor), 0.0)).filter(
        CaixaLancamento.caixa_turno_id == turno.id,
        CaixaLancamento.tipo == "ENTRADA"
    ).scalar()
    
    saidas = db.query(func.coalesce(func.sum(CaixaLancamento.valor), 0.0)).filter(
        CaixaLancamento.caixa_turno_id == turno.id,
        CaixaLancamento.tipo == "SAIDA"
    ).scalar()
    
    esperado = round(turno.valor_inicial + vendas_dinheiro + entradas - saidas, 2)
    diferenca = round(data.valor_informado - esperado, 2)
    
    turno.data_fechamento = datetime.utcnow()
    turno.user_fechamento_id = current_user.id
    turno.valor_informado = data.valor_informado
    turno.valor_esperado = esperado
    turno.diferenca = diferenca
    turno.status = "FECHADO"
    if data.observacoes:
        turno.observacoes = (turno.observacoes or "") + ("\nFechamento: " + data.observacoes)
        
    db.commit()
    db.refresh(turno)
    return turno


@router.get("/historico", response_model=List[CaixaTurnoResponse])
def get_caixa_historico(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(CaixaTurno).filter(
        CaixaTurno.empresa_id == current_user.empresa_id
    ).order_by(desc(CaixaTurno.data_abertura)).limit(limit).all()
