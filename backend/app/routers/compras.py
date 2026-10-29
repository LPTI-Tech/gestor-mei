from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime
from collections import defaultdict

from app.database import get_db
from app.models.empresa import Empresa
from app.models.user import User
from app.models.nfe import NfeImportada, ItemNfeImportada
from app.dependencies import get_current_user, get_current_empresa
from app.schemas.compras import (
    CompraItemResumo,
    CompraDetalheResponse,
    ItemCompraResponse,
    ResumoComprasResponse,
    UltimaCompraInfo,
    FornecedorPrincipalInfo,
    MesCompraInfo,
)

router = APIRouter(prefix="/compras", tags=["Módulo de Compras (NF-e)"])


@router.get("/resumo", response_model=ResumoComprasResponse)
def get_resumo_compras(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Retorna os indicadores consolidados de Compras para o Dashboard:
    - Total comprado no mês corrente
    - Total comprado no ano
    - Quantidade de notas fiscais faturadas no mês
    - Total histórico de notas
    - Última compra realizada
    - Fornecedor principal (maior volume financeiro)
    - Evolução de compras por mês
    - Top fornecedores parceiros
    """
    notas = (
        db.query(NfeImportada)
        .filter(NfeImportada.empresa_id == empresa.id)
        .order_by(NfeImportada.data_importacao.desc())
        .all()
    )

    now = datetime.utcnow()
    ano_atual = now.year
    mes_atual = now.month

    total_comprado_mes = 0.0
    total_comprado_ano = 0.0
    numero_notas_mes = 0
    numero_notas_total = len(notas)

    ultima_compra_info: Optional[UltimaCompraInfo] = None
    if notas:
        primeira = notas[0]
        ultima_compra_info = UltimaCompraInfo(
            id=primeira.id,
            numero_nota=primeira.numero_nota,
            fornecedor_nome=primeira.fornecedor_nome,
            valor_total=primeira.valor_total,
            data=primeira.data_importacao,
        )

    fornecedores_map = defaultdict(lambda: {"nome": "", "total": 0.0, "qtd": 0})
    meses_map = defaultdict(lambda: {"valor": 0.0, "qtd": 0})

    nomes_meses = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ]

    for n in notas:
        dt = n.data_importacao
        v = n.valor_total or 0.0

        if dt.year == ano_atual:
            total_comprado_ano += v
            if dt.month == mes_atual:
                total_comprado_mes += v
                numero_notas_mes += 1

            mes_label = f"{nomes_meses[dt.month - 1]}/{str(dt.year)[2:]}"
            meses_map[mes_label]["valor"] += v
            meses_map[mes_label]["qtd"] += 1

        cnpj_key = n.fornecedor_cnpj
        fornecedores_map[cnpj_key]["nome"] = n.fornecedor_nome
        fornecedores_map[cnpj_key]["total"] += v
        fornecedores_map[cnpj_key]["qtd"] += 1

    # Identifica fornecedor principal e top fornecedores
    sorted_fornecedores = sorted(
        fornecedores_map.items(),
        key=lambda item: item[1]["total"],
        reverse=True
    )

    top_fornecedores: List[FornecedorPrincipalInfo] = []
    for cnpj, dados in sorted_fornecedores[:5]:
        top_fornecedores.append(
            FornecedorPrincipalInfo(
                nome=dados["nome"],
                cnpj=cnpj,
                total_comprado=round(dados["total"], 2),
                quantidade_notas=dados["qtd"],
            )
        )

    fornecedor_principal_info = top_fornecedores[0] if top_fornecedores else None

    # Monta evolução dos meses
    compras_por_mes: List[MesCompraInfo] = []
    for m_label, m_dados in meses_map.items():
        compras_por_mes.append(
            MesCompraInfo(
                mes=m_label,
                valor=round(m_dados["valor"], 2),
                quantidade_notas=m_dados["qtd"],
            )
        )

    return ResumoComprasResponse(
        total_comprado_mes=round(total_comprado_mes, 2),
        total_comprado_ano=round(total_comprado_ano, 2),
        numero_notas_mes=numero_notas_mes,
        numero_notas_total=numero_notas_total,
        ultima_compra=ultima_compra_info,
        fornecedor_principal=fornecedor_principal_info,
        compras_por_mes=compras_por_mes,
        top_fornecedores=top_fornecedores,
    )


@router.get("", response_model=List[CompraItemResumo])
def listar_compras(
    busca: Optional[str] = None,
    ano: Optional[int] = None,
    mes: Optional[int] = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Lista o histórico completo de compras faturadas por notas fiscais.
    Suporta busca textual por fornecedor, CNPJ ou número da nota fiscal.
    """
    query = (
        db.query(NfeImportada)
        .filter(NfeImportada.empresa_id == empresa.id)
    )

    if busca:
        busca_term = f"%{busca.strip()}%"
        query = query.filter(
            (NfeImportada.fornecedor_nome.ilike(busca_term)) |
            (NfeImportada.fornecedor_cnpj.ilike(busca_term)) |
            (NfeImportada.numero_nota.ilike(busca_term)) |
            (NfeImportada.chave_acesso.ilike(busca_term))
        )

    compras = query.order_by(NfeImportada.data_importacao.desc()).limit(limit).all()

    result: List[CompraItemResumo] = []
    for n in compras:
        if ano and n.data_importacao.year != ano:
            continue
        if mes and n.data_importacao.month != mes:
            continue

        result.append(
            CompraItemResumo(
                id=n.id,
                empresa_id=n.empresa_id,
                chave_acesso=n.chave_acesso,
                numero_nota=n.numero_nota,
                serie=n.serie,
                data_emissao=n.data_emissao,
                valor_total=n.valor_total,
                fornecedor_cnpj=n.fornecedor_cnpj,
                fornecedor_nome=n.fornecedor_nome,
                fornecedor_uf=n.fornecedor_uf,
                total_itens=n.total_itens,
                data_importacao=n.data_importacao,
                usuario_nome=n.usuario.nome if n.usuario else None,
                observacao=n.observacao,
            )
        )
    return result


@router.get("/{compra_id}", response_model=CompraDetalheResponse)
def obter_detalhes_compra(
    compra_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Retorna os detalhes completos de uma compra faturada por NF-e,
    incluindo todos os itens faturados, fator de conversão e impacto em estoque.
    """
    nfe = (
        db.query(NfeImportada)
        .filter(NfeImportada.id == compra_id, NfeImportada.empresa_id == empresa.id)
        .first()
    )

    if not nfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compra / Nota Fiscal não encontrada."
        )

    itens_response: List[ItemCompraResponse] = []
    for it in nfe.itens:
        itens_response.append(
            ItemCompraResponse(
                id=it.id,
                produto_id=it.produto_id,
                produto_nome=it.produto.nome if it.produto else None,
                codigo_fornecedor=it.codigo_fornecedor,
                descricao_fornecedor=it.descricao_fornecedor,
                unidade_comercial=it.unidade_comercial,
                quantidade_comercial=it.quantidade_comercial,
                fator_conversao=it.fator_conversao,
                quantidade_entrada=it.quantidade_entrada,
                valor_unitario_nota=it.valor_unitario_nota,
                custo_unitario_calculado=it.custo_unitario_calculado,
                valor_total=it.valor_total,
            )
        )

    return CompraDetalheResponse(
        id=nfe.id,
        empresa_id=nfe.empresa_id,
        chave_acesso=nfe.chave_acesso,
        numero_nota=nfe.numero_nota,
        serie=nfe.serie,
        data_emissao=nfe.data_emissao,
        valor_total=nfe.valor_total,
        fornecedor_cnpj=nfe.fornecedor_cnpj,
        fornecedor_nome=nfe.fornecedor_nome,
        fornecedor_uf=nfe.fornecedor_uf,
        total_itens=nfe.total_itens,
        data_importacao=nfe.data_importacao,
        usuario_nome=nfe.usuario.nome if nfe.usuario else None,
        observacao=nfe.observacao,
        itens=itens_response,
    )

