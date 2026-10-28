from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from app.database import get_db
from app.models.produto import Produto
from app.models.estoque import MovimentacaoEstoque
from app.models.user import User
from app.dependencies import get_current_user
from app.schemas.estoque import (
    EntradaEstoqueRequest,
    SaidaEstoqueRequest,
    AjusteEstoqueRequest,
    MovimentacaoEstoqueCreate,
    MovimentacaoEstoqueResponse,
    ResumoEstoqueGeral,
    ResumoEstoqueItem,
)

router = APIRouter(prefix="/estoque", tags=["Controle de Estoque"])


def _format_movimentacao_response(mov: MovimentacaoEstoque) -> MovimentacaoEstoqueResponse:
    return MovimentacaoEstoqueResponse(
        id=mov.id,
        empresa_id=mov.empresa_id,
        produto_id=mov.produto_id,
        produto_nome=mov.produto.nome if mov.produto else None,
        tipo=mov.tipo,
        quantidade=mov.quantidade,
        motivo=mov.motivo,
        usuario_id=mov.usuario_id,
        usuario_nome=mov.usuario.nome if mov.usuario else None,
        data_movimentacao=mov.data_movimentacao,
        observacao=mov.observacao,
    )


@router.get("/resumo", response_model=ResumoEstoqueGeral)
def get_resumo_estoque(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o panorama geral do estoque: total de itens, itens em nível crítico/baixo,
    valorização patrimonial a preço de custo e potencial de venda.
    """
    produtos = db.query(Produto).filter(
        Produto.empresa_id == current_user.empresa_id,
        Produto.tipo == "PRODUTO",
        Produto.ativo == True
    ).order_by(Produto.nome.asc()).all()

    total_itens = len(produtos)
    itens_baixo = 0
    valor_custo_total = 0.0
    valor_venda_total = 0.0
    itens_list: List[ResumoEstoqueItem] = []

    for p in produtos:
        qtd = float(p.quantidade_estoque or 0.0)
        min_est = float(p.estoque_minimo or 0.0)
        custo = float(p.custo_unitario or 0.0)
        preco = float(p.preco_venda or 0.0)

        is_baixo = (qtd <= min_est)
        if is_baixo:
            itens_baixo += 1

        val_custo = round(qtd * custo, 2)
        val_venda = round(qtd * preco, 2)
        valor_custo_total += val_custo
        valor_venda_total += val_venda

        itens_list.append(ResumoEstoqueItem(
            id=p.id,
            nome=p.nome,
            categoria=p.categoria,
            tipo=p.tipo,
            quantidade_estoque=qtd,
            estoque_minimo=min_est,
            custo_unitario=custo,
            preco_venda=preco,
            estoque_baixo=is_baixo,
            valor_total_custo=val_custo,
            valor_total_venda=val_venda,
        ))

    return ResumoEstoqueGeral(
        total_itens=total_itens,
        itens_estoque_baixo=itens_baixo,
        valor_total_custo=round(valor_custo_total, 2),
        valor_total_venda=round(valor_venda_total, 2),
        itens=itens_list,
    )


@router.get("/baixo", response_model=List[ResumoEstoqueItem])
def get_produtos_estoque_baixo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna apenas os produtos cujo saldo em estoque está menor ou igual ao estoque mínimo.
    """
    produtos = db.query(Produto).filter(
        Produto.empresa_id == current_user.empresa_id,
        Produto.tipo == "PRODUTO",
        Produto.ativo == True
    ).all()

    alerta_list: List[ResumoEstoqueItem] = []
    for p in produtos:
        qtd = float(p.quantidade_estoque or 0.0)
        min_est = float(p.estoque_minimo or 0.0)
        if qtd <= min_est:
            custo = float(p.custo_unitario or 0.0)
            preco = float(p.preco_venda or 0.0)
            alerta_list.append(ResumoEstoqueItem(
                id=p.id,
                nome=p.nome,
                categoria=p.categoria,
                tipo=p.tipo,
                quantidade_estoque=qtd,
                estoque_minimo=min_est,
                custo_unitario=custo,
                preco_venda=preco,
                estoque_baixo=True,
                valor_total_custo=round(qtd * custo, 2),
                valor_total_venda=round(qtd * preco, 2),
            ))

    return sorted(alerta_list, key=lambda x: x.quantidade_estoque)


@router.get("/movimentacoes", response_model=List[MovimentacaoEstoqueResponse])
def list_movimentacoes(
    produto_id: Optional[int] = None,
    tipo: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o histórico cronológico de movimentações de estoque da empresa.
    """
    query = db.query(MovimentacaoEstoque).filter(
        MovimentacaoEstoque.empresa_id == current_user.empresa_id
    )

    if produto_id:
        query = query.filter(MovimentacaoEstoque.produto_id == produto_id)

    if tipo and tipo != "Todos":
        query = query.filter(MovimentacaoEstoque.tipo == tipo)

    movs = query.order_by(desc(MovimentacaoEstoque.data_movimentacao)).limit(limit).all()
    return [_format_movimentacao_response(m) for m in movs]


@router.post("/entrada", response_model=MovimentacaoEstoqueResponse, status_code=status.HTTP_201_CREATED)
def registrar_entrada_estoque(
    data: EntradaEstoqueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra entrada manual de mercadorias no estoque.
    Atualiza a quantidade do produto e opcionalmente seu custo unitário.
    """
    if data.quantidade <= 0:
        raise HTTPException(status_code=400, detail="A quantidade de entrada deve ser maior que zero.")

    produto = db.query(Produto).filter(
        Produto.id == data.produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    # Atualiza saldo e custo
    produto.quantidade_estoque = float(produto.quantidade_estoque or 0.0) + float(data.quantidade)
    if data.custo_unitario is not None and data.custo_unitario > 0:
        produto.custo_unitario = float(data.custo_unitario)

    mov = MovimentacaoEstoque(
        empresa_id=current_user.empresa_id,
        produto_id=produto.id,
        tipo="ENTRADA",
        quantidade=float(data.quantidade),
        motivo=data.motivo or "Entrada / Reposição de Mercadoria",
        usuario_id=current_user.id,
        data_movimentacao=datetime.utcnow(),
        observacao=data.observacao,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return _format_movimentacao_response(mov)


@router.post("/saida", response_model=MovimentacaoEstoqueResponse, status_code=status.HTTP_201_CREATED)
def registrar_saida_estoque(
    data: SaidaEstoqueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra saída manual de mercadorias (perdas, consumo interno, descarte, validade vencida).
    """
    if data.quantidade <= 0:
        raise HTTPException(status_code=400, detail="A quantidade de saída deve ser maior que zero.")

    produto = db.query(Produto).filter(
        Produto.id == data.produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto.quantidade_estoque = float(produto.quantidade_estoque or 0.0) - float(data.quantidade)

    mov = MovimentacaoEstoque(
        empresa_id=current_user.empresa_id,
        produto_id=produto.id,
        tipo="SAIDA",
        quantidade=float(data.quantidade),
        motivo=data.motivo or "Saída Manual",
        usuario_id=current_user.id,
        data_movimentacao=datetime.utcnow(),
        observacao=data.observacao,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return _format_movimentacao_response(mov)


@router.post("/ajuste", response_model=MovimentacaoEstoqueResponse, status_code=status.HTTP_201_CREATED)
def registrar_ajuste_estoque(
    data: AjusteEstoqueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ajusta a quantidade de estoque para um valor absoluto após conferência/inventário.
    """
    if data.nova_quantidade < 0:
        raise HTTPException(status_code=400, detail="A nova quantidade não pode ser negativa.")

    produto = db.query(Produto).filter(
        Produto.id == data.produto_id,
        Produto.empresa_id == current_user.empresa_id
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    estoque_anterior = float(produto.quantidade_estoque or 0.0)
    diferenca = float(data.nova_quantidade) - estoque_anterior
    produto.quantidade_estoque = float(data.nova_quantidade)

    obs = f"Inventário: saldo corrigido de {estoque_anterior:.2f} para {data.nova_quantidade:.2f}."
    if data.observacao:
        obs += f" Obs: {data.observacao}"

    mov = MovimentacaoEstoque(
        empresa_id=current_user.empresa_id,
        produto_id=produto.id,
        tipo="AJUSTE",
        quantidade=abs(diferenca),
        motivo=data.motivo or "Ajuste de Inventário",
        usuario_id=current_user.id,
        data_movimentacao=datetime.utcnow(),
        observacao=obs,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return _format_movimentacao_response(mov)


@router.post("/movimentacao", response_model=MovimentacaoEstoqueResponse, status_code=status.HTTP_201_CREATED)
def registrar_movimentacao_generica(
    data: MovimentacaoEstoqueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint unificado de movimentação de estoque (ENTRADA, SAIDA, AJUSTE).
    """
    tipo_upper = data.tipo.upper()
    if tipo_upper not in ["ENTRADA", "SAIDA", "AJUSTE"]:
        raise HTTPException(status_code=400, detail="Tipo inválido. Use ENTRADA, SAIDA ou AJUSTE.")

    if tipo_upper == "ENTRADA":
        return registrar_entrada_estoque(
            EntradaEstoqueRequest(
                produto_id=data.produto_id,
                quantidade=data.quantidade,
                custo_unitario=data.custo_unitario,
                motivo=data.motivo or "Entrada Manual",
                observacao=data.observacao,
            ),
            db,
            current_user
        )
    elif tipo_upper == "SAIDA":
        return registrar_saida_estoque(
            SaidaEstoqueRequest(
                produto_id=data.produto_id,
                quantidade=data.quantidade,
                motivo=data.motivo or "Saída Manual",
                observacao=data.observacao,
            ),
            db,
            current_user
        )
    else:  # AJUSTE
        return registrar_ajuste_estoque(
            AjusteEstoqueRequest(
                produto_id=data.produto_id,
                nova_quantidade=data.quantidade,
                motivo=data.motivo or "Ajuste Manual",
                observacao=data.observacao,
            ),
            db,
            current_user
        )

