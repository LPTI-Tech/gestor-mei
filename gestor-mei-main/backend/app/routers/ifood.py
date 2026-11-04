from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, extract
from app.database import get_db
from app.models.ifood import LancamentoIFood
from app.models.user import User
from app.schemas.ifood import (
    LancamentoIFoodCreate,
    LancamentoIFoodResponse,
    IFoodSummaryResponse
)
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/ifood", tags=["iFood"])

@router.get("", response_model=IFoodSummaryResponse)
def list_ifood(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(LancamentoIFood).filter(LancamentoIFood.empresa_id == current_user.empresa_id)
    
    if data_inicio:
        query = query.filter(LancamentoIFood.data >= data_inicio)
    if data_fim:
        query = query.filter(LancamentoIFood.data <= data_fim)
    if mes:
        query = query.filter(extract('month', LancamentoIFood.data) == mes)
    if ano:
        query = query.filter(extract('year', LancamentoIFood.data) == ano)
        
    lancamentos = query.order_by(desc(LancamentoIFood.data), desc(LancamentoIFood.id)).all()
    
    total_bruto = sum(l.valor_bruto for l in lancamentos)
    total_taxas = sum(l.taxa_ifood for l in lancamentos)
    total_liquido = sum(l.valor_liquido for l in lancamentos)
    pct_medio = round((total_taxas / total_bruto * 100), 2) if total_bruto > 0 else 0.0
    
    return IFoodSummaryResponse(
        total_pedidos=len(lancamentos),
        total_bruto=round(total_bruto, 2),
        total_taxas=round(total_taxas, 2),
        total_liquido=round(total_liquido, 2),
        percentual_medio_taxa=pct_medio,
        lancamentos=[LancamentoIFoodResponse.model_validate(l) for l in lancamentos]
    )


@router.post("", response_model=LancamentoIFoodResponse)
def create_ifood_lancamento(
    data: LancamentoIFoodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    liquido = data.valor_liquido
    if liquido is None or liquido <= 0:
        liquido = round(data.valor_bruto - data.taxa_ifood, 2)
        
    lancamento = LancamentoIFood(
        empresa_id=current_user.empresa_id,
        data=data.data,
        numero_pedido=data.numero_pedido,
        valor_bruto=data.valor_bruto,
        taxa_ifood=data.taxa_ifood,
        valor_liquido=liquido,
        observacoes=data.observacoes
    )
    db.add(lancamento)
    db.commit()
    db.refresh(lancamento)
    return lancamento


@router.delete("/{lancamento_id}")
def delete_ifood_lancamento(
    lancamento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    item = db.query(LancamentoIFood).filter(
        LancamentoIFood.id == lancamento_id,
        LancamentoIFood.empresa_id == current_user.empresa_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Lançamento iFood não encontrado.")
        
    db.delete(item)
    db.commit()
    return {"message": "Lançamento excluído com sucesso."}
