from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database import get_db
from app.models.motoboy import Motoboy, EntregaMotoboy
from app.models.user import User
from app.schemas.motoboy import (
    MotoboyCreate,
    MotoboyUpdate,
    MotoboyResponse,
    EntregaMotoboyCreate,
    EntregaMotoboyResponse,
    MotoboyRelatorioResponse,
    MotoboyResumoItem
)
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/motoboys", tags=["Motoboys"])

@router.get("", response_model=List[MotoboyResponse])
def list_motoboys(
    apenas_ativos: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Motoboy).filter(Motoboy.empresa_id == current_user.empresa_id)
    if apenas_ativos:
        query = query.filter(Motoboy.ativo == True)
    return query.order_by(Motoboy.nome.asc()).all()


@router.post("", response_model=MotoboyResponse)
def create_motoboy(
    data: MotoboyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    motoboy = Motoboy(
        empresa_id=current_user.empresa_id,
        nome=data.nome,
        telefone=data.telefone,
        valor_por_entrega=data.valor_por_entrega,
        ativo=data.ativo
    )
    db.add(motoboy)
    db.commit()
    db.refresh(motoboy)
    return motoboy


@router.put("/{motoboy_id}", response_model=MotoboyResponse)
def update_motoboy(
    motoboy_id: int,
    data: MotoboyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    motoboy = db.query(Motoboy).filter(
        Motoboy.id == motoboy_id,
        Motoboy.empresa_id == current_user.empresa_id
    ).first()
    
    if not motoboy:
        raise HTTPException(status_code=404, detail="Motoboy não encontrado.")
        
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(motoboy, key, value)
        
    db.commit()
    db.refresh(motoboy)
    return motoboy


@router.delete("/{motoboy_id}")
def delete_motoboy(
    motoboy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    motoboy = db.query(Motoboy).filter(
        Motoboy.id == motoboy_id,
        Motoboy.empresa_id == current_user.empresa_id
    ).first()
    
    if not motoboy:
        raise HTTPException(status_code=404, detail="Motoboy não encontrado.")
        
    db.delete(motoboy)
    db.commit()
    return {"message": "Motoboy excluído com sucesso."}


# Entregas / Corridas
@router.get("/entregas", response_model=List[EntregaMotoboyResponse])
def list_entregas(
    motoboy_id: Optional[int] = None,
    status_pagamento: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EntregaMotoboy).filter(EntregaMotoboy.empresa_id == current_user.empresa_id)
    
    if motoboy_id:
        query = query.filter(EntregaMotoboy.motoboy_id == motoboy_id)
    if status_pagamento and status_pagamento != "Todos":
        query = query.filter(EntregaMotoboy.status_pagamento == status_pagamento)
        
    entregas = query.order_by(desc(EntregaMotoboy.data_hora)).limit(limit).all()
    
    results = []
    for e in entregas:
        mb_name = e.motoboy.nome if e.motoboy else "Desconhecido"
        resp = EntregaMotoboyResponse.model_validate(e)
        resp.motoboy_nome = mb_name
        results.append(resp)
        
    return results


@router.post("/entregas", response_model=EntregaMotoboyResponse)
def create_entrega(
    data: EntregaMotoboyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    motoboy = db.query(Motoboy).filter(
        Motoboy.id == data.motoboy_id,
        Motoboy.empresa_id == current_user.empresa_id
    ).first()
    
    if not motoboy:
        raise HTTPException(status_code=404, detail="Motoboy não encontrado.")
        
    val = data.valor_entrega if data.valor_entrega is not None else motoboy.valor_por_entrega
    dt = data.data_hora if data.data_hora else datetime.utcnow()
    dt_pgto = datetime.utcnow() if data.status_pagamento == "PAGO" else None
    
    entrega = EntregaMotoboy(
        empresa_id=current_user.empresa_id,
        motoboy_id=motoboy.id,
        numero_pedido=data.numero_pedido,
        valor_entrega=val,
        status_pagamento=data.status_pagamento,
        data_pagamento=dt_pgto,
        observacoes=data.observacoes,
        data_hora=dt
    )
    db.add(entrega)
    db.commit()
    db.refresh(entrega)
    
    resp = EntregaMotoboyResponse.model_validate(entrega)
    resp.motoboy_nome = motoboy.nome
    return resp


@router.put("/entregas/{entrega_id}/quitar", response_model=EntregaMotoboyResponse)
def quitar_entrega(
    entrega_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entrega = db.query(EntregaMotoboy).filter(
        EntregaMotoboy.id == entrega_id,
        EntregaMotoboy.empresa_id == current_user.empresa_id
    ).first()
    
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada.")
        
    entrega.status_pagamento = "PAGO"
    entrega.data_pagamento = datetime.utcnow()
    db.commit()
    db.refresh(entrega)
    
    resp = EntregaMotoboyResponse.model_validate(entrega)
    resp.motoboy_nome = entrega.motoboy.nome if entrega.motoboy else ""
    return resp


@router.post("/quitar-todas/{motoboy_id}")
def quitar_todas_motoboy(
    motoboy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entregas = db.query(EntregaMotoboy).filter(
        EntregaMotoboy.empresa_id == current_user.empresa_id,
        EntregaMotoboy.motoboy_id == motoboy_id,
        EntregaMotoboy.status_pagamento == "PENDENTE"
    ).all()
    
    now = datetime.utcnow()
    for e in entregas:
        e.status_pagamento = "PAGO"
        e.data_pagamento = now
        
    db.commit()
    return {"message": f"{len(entregas)} entregas quitadas com sucesso."}


@router.get("/relatorio", response_model=MotoboyRelatorioResponse)
def get_motoboy_relatorio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    motoboys = db.query(Motoboy).filter(Motoboy.empresa_id == current_user.empresa_id).all()
    
    resumos = []
    total_geral_devido = 0.0
    total_geral_pago = 0.0
    total_entregas_geral = 0
    
    for mb in motoboys:
        entregas = db.query(EntregaMotoboy).filter(
            EntregaMotoboy.empresa_id == current_user.empresa_id,
            EntregaMotoboy.motoboy_id == mb.id
        ).all()
        
        qtd = len(entregas)
        devido = sum(e.valor_entrega for e in entregas)
        pago = sum(e.valor_entrega for e in entregas if e.status_pagamento == "PAGO")
        pendente = devido - pago
        
        total_entregas_geral += qtd
        total_geral_devido += devido
        total_geral_pago += pago
        
        resumos.append(MotoboyResumoItem(
            motoboy_id=mb.id,
            nome=mb.nome,
            telefone=mb.telefone,
            total_entregas=qtd,
            total_devido=round(devido, 2),
            total_pago=round(pago, 2),
            saldo_pendente=round(pendente, 2)
        ))
        
    return MotoboyRelatorioResponse(
        resumos=resumos,
        total_geral_devido=round(total_geral_devido, 2),
        total_geral_pago=round(total_geral_pago, 2),
        total_geral_pendente=round(total_geral_devido - total_geral_pago, 2),
        total_entregas_geral=total_entregas_geral
    )
