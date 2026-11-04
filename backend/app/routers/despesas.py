from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, extract
from app.database import get_db
from app.models.despesa import Despesa
from app.models.user import User
from app.schemas.despesa import DespesaCreate, DespesaUpdate, DespesaResponse
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/despesas", tags=["Despesas"])

@router.get("", response_model=List[DespesaResponse])
def list_despesas(
    categoria: Optional[str] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    forma_pagamento: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Despesa).filter(Despesa.empresa_id == current_user.empresa_id)
    
    if categoria and categoria != "Todas":
        query = query.filter(Despesa.categoria == categoria)
        
    if data_inicio:
        query = query.filter(Despesa.data >= data_inicio)
    if data_fim:
        query = query.filter(Despesa.data <= data_fim)
        
    if mes:
        query = query.filter(extract('month', Despesa.data) == mes)
    if ano:
        query = query.filter(extract('year', Despesa.data) == ano)
        
    if forma_pagamento and forma_pagamento != "Todas":
        query = query.filter(Despesa.forma_pagamento == forma_pagamento)
        
    return query.order_by(desc(Despesa.data), desc(Despesa.id)).limit(limit).all()


@router.get("/resumo")
def get_resumo_despesas(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Despesa.categoria, func.sum(Despesa.valor).label("total")).filter(
        Despesa.empresa_id == current_user.empresa_id
    )
    
    if mes:
        query = query.filter(extract('month', Despesa.data) == mes)
    if ano:
        query = query.filter(extract('year', Despesa.data) == ano)
        
    results = query.group_by(Despesa.categoria).all()
    
    total_geral = sum(r.total for r in results) if results else 0.0
    categorias_breakdown = [
        {
            "categoria": r.categoria,
            "total": round(float(r.total), 2),
            "percentual": round((float(r.total) / total_geral * 100), 1) if total_geral > 0 else 0.0
        }
        for r in results
    ]
    
    return {
        "total_geral": round(total_geral, 2),
        "por_categoria": sorted(categorias_breakdown, key=lambda x: x["total"], reverse=True)
    }


@router.post("", response_model=DespesaResponse)
def create_despesa(
    data: DespesaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    despesa = Despesa(
        empresa_id=current_user.empresa_id,
        data=data.data,
        categoria=data.categoria,
        descricao=data.descricao,
        valor=data.valor,
        forma_pagamento=data.forma_pagamento
    )
    db.add(despesa)
    db.commit()
    db.refresh(despesa)
    return despesa


@router.put("/{despesa_id}", response_model=DespesaResponse)
def update_despesa(
    despesa_id: int,
    data: DespesaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    despesa = db.query(Despesa).filter(
        Despesa.id == despesa_id,
        Despesa.empresa_id == current_user.empresa_id
    ).first()
    
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada.")
        
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(despesa, key, value)
        
    db.commit()
    db.refresh(despesa)
    return despesa


@router.delete("/{despesa_id}")
def delete_despesa(
    despesa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    despesa = db.query(Despesa).filter(
        Despesa.id == despesa_id,
        Despesa.empresa_id == current_user.empresa_id
    ).first()
    
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada.")
        
    db.delete(despesa)
    db.commit()
    return {"message": "Despesa excluída com sucesso."}
