from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database import get_db
from app.models.regiao_entrega import RegiaoEntrega
from app.models.venda import Venda
from app.models.user import User
from app.schemas.regiao_entrega import (
    RegiaoEntregaCreate,
    RegiaoEntregaUpdate,
    RegiaoEntregaResponse
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/regioes-entrega", tags=["Regiões de Entrega"])

@router.get("", response_model=List[RegiaoEntregaResponse])
def list_regioes(
    apenas_ativas: bool = True,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RegiaoEntrega).filter(RegiaoEntrega.empresa_id == current_user.empresa_id)
    
    if apenas_ativas:
        query = query.filter(RegiaoEntrega.ativo == True)
        
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(RegiaoEntrega.nome.ilike(search))
        
    regioes = query.order_by(RegiaoEntrega.nome.asc()).all()
    
    result = []
    for r in regioes:
        count_pedidos = db.query(func.count(Venda.id)).filter(
            Venda.empresa_id == current_user.empresa_id,
            Venda.regiao_entrega_id == r.id,
            Venda.status == "Concluída"
        ).scalar() or 0
        
        item = RegiaoEntregaResponse.model_validate(r)
        item.total_pedidos = count_pedidos
        result.append(item)
        
    return result


@router.post("", response_model=RegiaoEntregaResponse, status_code=status.HTTP_201_CREATED)
def create_regiao(
    data: RegiaoEntregaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if duplicate name in company
    existing = db.query(RegiaoEntrega).filter(
        RegiaoEntrega.empresa_id == current_user.empresa_id,
        RegiaoEntrega.nome.ilike(data.nome.strip())
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma região com este nome cadastrada.")
        
    regiao = RegiaoEntrega(
        empresa_id=current_user.empresa_id,
        nome=data.nome.strip(),
        taxa_entrega=round(float(data.taxa_entrega), 2),
        tempo_estimado_minutos=data.tempo_estimado_minutos or 30,
        ativo=data.ativo
    )
    db.add(regiao)
    db.commit()
    db.refresh(regiao)
    
    item = RegiaoEntregaResponse.model_validate(regiao)
    item.total_pedidos = 0
    return item


@router.get("/{regiao_id}", response_model=RegiaoEntregaResponse)
def get_regiao(
    regiao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    regiao = db.query(RegiaoEntrega).filter(
        RegiaoEntrega.id == regiao_id,
        RegiaoEntrega.empresa_id == current_user.empresa_id
    ).first()
    
    if not regiao:
        raise HTTPException(status_code=404, detail="Região de entrega não encontrada.")
        
    count_pedidos = db.query(func.count(Venda.id)).filter(
        Venda.empresa_id == current_user.empresa_id,
        Venda.regiao_entrega_id == regiao.id,
        Venda.status == "Concluída"
    ).scalar() or 0
    
    item = RegiaoEntregaResponse.model_validate(regiao)
    item.total_pedidos = count_pedidos
    return item


@router.put("/{regiao_id}", response_model=RegiaoEntregaResponse)
def update_regiao(
    regiao_id: int,
    data: RegiaoEntregaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    regiao = db.query(RegiaoEntrega).filter(
        RegiaoEntrega.id == regiao_id,
        RegiaoEntrega.empresa_id == current_user.empresa_id
    ).first()
    
    if not regiao:
        raise HTTPException(status_code=404, detail="Região de entrega não encontrada.")
        
    if data.nome is not None:
        regiao.nome = data.nome.strip()
    if data.taxa_entrega is not None:
        regiao.taxa_entrega = round(float(data.taxa_entrega), 2)
    if data.tempo_estimado_minutos is not None:
        regiao.tempo_estimado_minutos = data.tempo_estimado_minutos
    if data.ativo is not None:
        regiao.ativo = data.ativo
        
    db.commit()
    db.refresh(regiao)
    
    count_pedidos = db.query(func.count(Venda.id)).filter(
        Venda.empresa_id == current_user.empresa_id,
        Venda.regiao_entrega_id == regiao.id,
        Venda.status == "Concluída"
    ).scalar() or 0
    
    item = RegiaoEntregaResponse.model_validate(regiao)
    item.total_pedidos = count_pedidos
    return item


@router.delete("/{regiao_id}")
def delete_regiao(
    regiao_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    regiao = db.query(RegiaoEntrega).filter(
        RegiaoEntrega.id == regiao_id,
        RegiaoEntrega.empresa_id == current_user.empresa_id
    ).first()
    
    if not regiao:
        raise HTTPException(status_code=404, detail="Região de entrega não encontrada.")
        
    # Check if there are orders or customers linked
    has_orders = db.query(Venda.id).filter(Venda.regiao_entrega_id == regiao_id).first()
    if has_orders:
        regiao.ativo = False
        db.commit()
        return {"message": "Região inativada com sucesso (possui histórico de pedidos)."}
    else:
        db.delete(regiao)
        db.commit()
        return {"message": "Região excluída com sucesso."}
