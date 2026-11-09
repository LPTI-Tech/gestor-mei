import os
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.produto import Produto
from app.models.user import User
from app.schemas.produto import ProdutoCreate, ProdutoUpdate, ProdutoResponse
from app.dependencies import get_current_user, require_admin
from app.services.storage_service import storage_service
from app.services.image_service import validate_image_upload, optimize_and_convert_to_webp

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
    nome_clean = (data.nome or "").strip()
    if not nome_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome do produto é obrigatório."
        )

    # Validação de unicidade por empresa (case-insensitive e trim)
    existente = db.query(Produto).filter(
        Produto.empresa_id == current_user.empresa_id,
        func.lower(func.trim(Produto.nome)) == nome_clean.lower()
    ).first()

    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um produto com este nome nesta empresa."
        )

    produto = Produto(
        empresa_id=current_user.empresa_id,
        nome=nome_clean,
        tipo=data.tipo,
        categoria=data.categoria,
        preco_venda=data.preco_venda,
        custo_unitario=data.custo_unitario or 0.0,
        quantidade_estoque=data.quantidade_estoque or 0.0,
        estoque_minimo=data.estoque_minimo or 0.0,
        ativo=data.ativo
    )
    db.add(produto)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um produto com este nome nesta empresa."
        )

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

    if "nome" in update_data and update_data["nome"] is not None:
        nome_clean = update_data["nome"].strip()
        if not nome_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome do produto não pode ser vazio."
            )

        # Validação de unicidade por empresa (excluindo o próprio item)
        existente = db.query(Produto).filter(
            Produto.empresa_id == current_user.empresa_id,
            Produto.id != produto_id,
            func.lower(func.trim(Produto.nome)) == nome_clean.lower()
        ).first()

        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um produto com este nome nesta empresa."
            )
        update_data["nome"] = nome_clean

    for key, value in update_data.items():
        setattr(produto, key, value)
        
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um produto com este nome nesta empresa."
        )

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
        
    if produto.imagem_nome:
        storage_service.delete_product_image(produto.imagem_nome, current_user.empresa_id)

    db.delete(produto)
    db.commit()
    return {"message": "Produto excluído com sucesso."}


# ============================================================================
# ENDPOINTS DE IMAGEM DO PRODUTO (Sprint Operação Real 1)
# ============================================================================

@router.post("/{produto_id}/imagem", response_model=ProdutoResponse)
def upload_produto_imagem(
    produto_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload de foto principal do produto.
    Valida a imagem, redimensiona e converte automaticamente para WebP de alta eficiência,
    e persiste no Cloudflare R2 com fallback local transparente.
    """
    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    content = file.file.read()
    valido, msg_erro = validate_image_upload(content, file.content_type)
    if not valido:
        raise HTTPException(status_code=400, detail=msg_erro)

    # Converte e otimiza para WebP
    try:
        webp_bytes, content_type = optimize_and_convert_to_webp(content, max_size=(800, 800), quality=85)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar imagem: {str(e)}")

    # Remove imagem antiga do storage se existir
    if produto.imagem_nome:
        storage_service.delete_product_image(produto.imagem_nome, current_user.empresa_id)

    # Gera nome seguro: prod_{id}_{timestamp}.webp
    safe_name = f"prod_{produto_id}_{int(time.time())}.webp"
    storage_service.save_product_image(
        webp_bytes,
        safe_name,
        empresa_id=current_user.empresa_id,
        produto_id=produto_id,
        content_type=content_type
    )

    produto.imagem_nome = safe_name
    produto.imagem_url = f"/api/produtos/{produto_id}/imagem"
    db.commit()
    db.refresh(produto)
    produto.estoque_baixo = (produto.tipo == "PRODUTO" and (produto.quantidade_estoque or 0.0) <= (produto.estoque_minimo or 0.0))
    return produto


@router.get("/{produto_id}/imagem")
def get_produto_imagem(
    produto_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna o stream da imagem do produto (Cloudflare R2 ou fallback local).
    Público para renderização de catálogos e PDV com cache de navegador.
    """
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto or not produto.imagem_nome:
        raise HTTPException(status_code=404, detail="Imagem não encontrada para este produto.")

    res = storage_service.get_product_image_stream(produto.imagem_nome, empresa_id=produto.empresa_id)
    if not res:
        raise HTTPException(status_code=404, detail="Arquivo de imagem não encontrado no armazenamento.")

    stream, content_type, size, provider_name = res

    headers = {
        "Cache-Control": "public, max-age=86400",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Storage-Provider": provider_name,
    }
    if size:
        headers["Content-Length"] = str(size)

    def iter_stream():
        try:
            while True:
                chunk = stream.read(65536)
                if not chunk:
                    break
                yield chunk
        finally:
            if hasattr(stream, "close"):
                stream.close()

    return StreamingResponse(iter_stream(), media_type=content_type, headers=headers)


@router.delete("/{produto_id}/imagem", response_model=ProdutoResponse)
def delete_produto_imagem(
    produto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a imagem do produto do storage e limpa a referência no banco de dados.
    """
    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    if produto.imagem_nome:
        storage_service.delete_product_image(produto.imagem_nome, current_user.empresa_id)

    produto.imagem_nome = None
    produto.imagem_url = None
    db.commit()
    db.refresh(produto)
    produto.estoque_baixo = (produto.tipo == "PRODUTO" and (produto.quantidade_estoque or 0.0) <= (produto.estoque_minimo or 0.0))
    return produto
