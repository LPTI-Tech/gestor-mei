from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.produto import Produto
from app.models.user import User
from app.schemas.produto import ProdutoCreate, ProdutoUpdate, ProdutoResponse
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/produtos", tags=["Produtos"])

@router.get("", response_model=List[ProdutoResponse])
def list_produtos(
    categoria: Optional[str] = None,
    tipo: Optional[str] = None,
    apenas_ativos: bool = False,
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Produto).filter(Produto.empresa_id == current_user.empresa_id)
    
    if categoria and categoria != "Todos":
        query = query.filter(Produto.categoria == categoria)
        
    if tipo and tipo != "Todos":
        query = query.filter(Produto.tipo == tipo)
        
    if apenas_ativos:
        query = query.filter(Produto.ativo == True)
        
    if busca:
        query = query.filter(Produto.nome.ilike(f"%{busca}%"))
        
    produtos = query.order_by(Produto.nome.asc()).all()
    for p in produtos:
        p.estoque_baixo = (p.tipo == "PRODUTO" and (p.quantidade_estoque or 0.0) <= (p.estoque_minimo or 0.0))
    return produtos


@router.post("", response_model=ProdutoResponse)
def create_produto(
    data: ProdutoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    produto = Produto(
        empresa_id=current_user.empresa_id,
        nome=data.nome,
        tipo=data.tipo,
        categoria=data.categoria,
        preco_venda=data.preco_venda,
        custo_unitario=data.custo_unitario or 0.0,
        quantidade_estoque=data.quantidade_estoque or 0.0,
        estoque_minimo=data.estoque_minimo or 0.0,
        ativo=data.ativo
    )
    db.add(produto)
    db.commit()
    db.refresh(produto)
    produto.estoque_baixo = (produto.tipo == "PRODUTO" and (produto.quantidade_estoque or 0.0) <= (produto.estoque_minimo or 0.0))
    return produto


@router.get("/{produto_id}", response_model=ProdutoResponse)
def get_produto(
    produto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()
    
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
        
    produto.estoque_baixo = (produto.tipo == "PRODUTO" and (produto.quantidade_estoque or 0.0) <= (produto.estoque_minimo or 0.0))
    return produto


@router.put("/{produto_id}", response_model=ProdutoResponse)
def update_produto(
    produto_id: int,
    data: ProdutoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()
    
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
        
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(produto, key, value)
        
    db.commit()
    db.refresh(produto)
    produto.estoque_baixo = (produto.tipo == "PRODUTO" and (produto.quantidade_estoque or 0.0) <= (produto.estoque_minimo or 0.0))
    return produto


@router.delete("/{produto_id}")
def delete_produto(
    produto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()
    
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
        
    db.delete(produto)
    db.commit()
    return {"message": "Produto excluído com sucesso."}
