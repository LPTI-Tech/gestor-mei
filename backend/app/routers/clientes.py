from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from app.database import get_db
from app.models.cliente import Cliente
from app.models.regiao_entrega import RegiaoEntrega
from app.models.venda import Venda
from app.models.user import User
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/clientes", tags=["Clientes"])

def _format_cliente_response(c: Cliente, db: Session, empresa_id: int) -> ClienteResponse:
    stats = db.query(
        func.coalesce(func.sum(Venda.valor_total), 0.0),
        func.count(Venda.id)
    ).filter(
        Venda.empresa_id == empresa_id,
        Venda.cliente_id == c.id,
        Venda.status == "Concluída"
    ).first()
    
    c_res = ClienteResponse.model_validate(c)
    c_res.total_compras = round(float(stats[0]), 2)
    c_res.qtd_pedidos = int(stats[1])
    if c.regiao:
        c_res.regiao_nome = c.regiao.nome
        c_res.regiao_taxa = c.regiao.taxa_entrega
    return c_res


@router.get("", response_model=List[ClienteResponse])
def list_clientes(
    q: Optional[str] = None,
    apenas_ativos: bool = True,
    regiao_id: Optional[int] = None,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Cliente).filter(Cliente.empresa_id == current_user.empresa_id)
    
    if apenas_ativos:
        query = query.filter(Cliente.ativo == True)
        
    if regiao_id:
        query = query.filter(Cliente.regiao_id == regiao_id)
        
    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Cliente.nome.ilike(search),
                Cliente.telefone.ilike(search),
                Cliente.cpf_cnpj.ilike(search),
                Cliente.email.ilike(search),
                Cliente.endereco.ilike(search)
            )
        )
        
    clientes = query.order_by(Cliente.nome.asc()).limit(limit).all()
    return [_format_cliente_response(c, db, current_user.empresa_id) for c in clientes]


@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def create_cliente(
    data: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If regiao_id passed, verify it belongs to current empresa
    if data.regiao_id:
        regiao = db.query(RegiaoEntrega).filter(
            RegiaoEntrega.id == data.regiao_id,
            RegiaoEntrega.empresa_id == current_user.empresa_id
        ).first()
        if not regiao:
            raise HTTPException(status_code=404, detail="Região de entrega não encontrada.")

    cliente = Cliente(
        empresa_id=current_user.empresa_id,
        regiao_id=data.regiao_id,
        nome=data.nome.strip(),
        telefone=data.telefone.strip() if data.telefone else None,
        cpf_cnpj=data.cpf_cnpj.strip() if data.cpf_cnpj else None,
        email=data.email.strip().lower() if data.email else None,
        endereco=data.endereco.strip() if data.endereco else None,
        observacoes=data.observacoes.strip() if data.observacoes else None,
        ativo=data.ativo
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return _format_cliente_response(cliente, db, current_user.empresa_id)


@router.get("/{cliente_id}", response_model=ClienteResponse)
def get_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.empresa_id == current_user.empresa_id
    ).first()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
        
    return _format_cliente_response(cliente, db, current_user.empresa_id)


@router.put("/{cliente_id}", response_model=ClienteResponse)
def update_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.empresa_id == current_user.empresa_id
    ).first()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
        
    if data.regiao_id is not None:
        if data.regiao_id != 0:
            regiao = db.query(RegiaoEntrega).filter(
                RegiaoEntrega.id == data.regiao_id,
                RegiaoEntrega.empresa_id == current_user.empresa_id
            ).first()
            if not regiao:
                raise HTTPException(status_code=404, detail="Região de entrega não encontrada.")
            cliente.regiao_id = data.regiao_id
        else:
            cliente.regiao_id = None

    if data.nome is not None:
        cliente.nome = data.nome.strip()
    if data.telefone is not None:
        cliente.telefone = data.telefone.strip() if data.telefone else None
    if data.cpf_cnpj is not None:
        cliente.cpf_cnpj = data.cpf_cnpj.strip() if data.cpf_cnpj else None
    if data.email is not None:
        cliente.email = data.email.strip().lower() if data.email else None
    if data.endereco is not None:
        cliente.endereco = data.endereco.strip() if data.endereco else None
    if data.observacoes is not None:
        cliente.observacoes = data.observacoes.strip() if data.observacoes else None
    if data.ativo is not None:
        cliente.ativo = data.ativo
        
    db.commit()
    db.refresh(cliente)
    return _format_cliente_response(cliente, db, current_user.empresa_id)


@router.delete("/{cliente_id}")
def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.empresa_id == current_user.empresa_id
    ).first()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
        
    # Check if client has associated sales
    has_sales = db.query(Venda.id).filter(
        Venda.empresa_id == current_user.empresa_id,
        Venda.cliente_id == cliente_id
    ).first()
    
    if has_sales:
        cliente.ativo = False
        db.commit()
        return {"message": "Cliente desativado com sucesso (possui histórico de vendas)."}
    else:
        db.delete(cliente)
        db.commit()
        return {"message": "Cliente excluído com sucesso."}
