import os
import re
import time
import uuid
from typing import List, Optional
from datetime import datetime
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.models.produto import Produto
from app.models.fornecedor import Fornecedor
from app.models.nfe import NfeImportada, ItemNfeImportada
from app.models.estoque import MovimentacaoEstoque
from app.dependencies import get_current_user, get_current_empresa
from app.schemas.compras import (
    CompraItemResumo,
    CompraDetalheResponse,
    ItemCompraResponse,
    ResumoComprasResponse,
    UltimaCompraInfo,
    FornecedorPrincipalInfo,
    MesCompraInfo,
    CompraManualCreate,
    CompraManualResponse,
    FornecedorResponse,
    UploadComprovanteResponse,
)

router = APIRouter(prefix="/compras", tags=["Módulo de Compras (NF-e e Manual)"])


def _clean_digits(val: Optional[str]) -> str:
    if not val:
        return ""
    return re.sub(r"\D", "", val)


# =======================================================
# Upload de Comprovantes (JPG, PNG, WEBP, PDF)
# =======================================================

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/octet-stream"  # alguns clientes enviam octet-stream para pdfs
}


@router.post("/upload-comprovante", response_model=UploadComprovanteResponse)
def upload_comprovante_compra(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Realiza o upload seguro de comprovante de compra manual (recibo, cupom ou nota).
    Formatos aceitos: JPG, PNG, WEBP, PDF. Limite: 10MB.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum arquivo enviado."
        )

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de arquivo não suportado ({ext}). Envie um arquivo JPG, PNG, WEBP ou PDF."
        )

    # Cria diretório se não existir
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dir = os.path.join(base_dir, "uploads", "comprovantes")
    os.makedirs(target_dir, exist_ok=True)

    # Gera nome seguro com UUID e empresa
    unique_id = uuid.uuid4().hex[:12]
    safe_name = f"emp_{empresa.id}_{unique_id}{ext}"
    target_path = os.path.join(target_dir, safe_name)

    content = file.file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tamanho do arquivo excede o limite permitido de 10 MB."
        )

    with open(target_path, "wb") as f:
        f.write(content)

    relative_url = f"/uploads/comprovantes/{safe_name}"
    tipo_formatado = ext.replace(".", "").upper()

    return UploadComprovanteResponse(
        url=relative_url,
        nome_original=file.filename,
        tipo=tipo_formatado
    )


# =======================================================
# Fornecedores (Sugestões e Autocomplete)
# =======================================================

@router.get("/fornecedores/sugestoes", response_model=List[FornecedorResponse])
def listar_sugestoes_fornecedores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Retorna a lista de fornecedores cadastrados na empresa para preenchimento ágil.
    """
    fornecedores = (
        db.query(Fornecedor)
        .filter(Fornecedor.empresa_id == empresa.id, Fornecedor.ativo == True)
        .order_by(Fornecedor.nome.asc())
        .all()
    )
    return fornecedores


# =======================================================
# Lançamento de Compra Manual (Sprint 8B)
# =======================================================

@router.post("/manual", response_model=CompraManualResponse, status_code=status.HTTP_201_CREATED)
def criar_compra_manual(
    dados: CompraManualCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Efetiva o lançamento de uma Compra Manual:
    1. Persiste ou reutiliza o fornecedor automaticamente.
    2. Registra o cabeçalho de compra unificado em nfe_importadas (origem='MANUAL').
    3. Dá entrada imediata de estoque nos produtos selecionados considerando fator de conversão.
    4. Atualiza custo unitário do produto (se solicitado por item).
    5. Registra movimentações de estoque rastreáveis (tipo='ENTRADA', motivo='Compra Manual').
    """
    # Operador não pode lançar compras
    if current_user.role == UserRole.OPERATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operadores não possuem permissão para realizar compras ou entrada de estoque."
        )

    if not dados.itens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A compra deve possuir ao menos 1 item."
        )

    # 1. Tratamento do Fornecedor (Reutiliza ou Cadastra automaticamente)
    nome_forn = dados.fornecedor_nome.strip()
    cnpj_cpf_limpo = _clean_digits(dados.fornecedor_cnpj_cpf) if dados.fornecedor_cnpj_cpf else ""

    fornecedor_existente = None
    if cnpj_cpf_limpo:
        fornecedor_existente = (
            db.query(Fornecedor)
            .filter(
                Fornecedor.empresa_id == empresa.id,
                Fornecedor.cnpj_cpf == cnpj_cpf_limpo
            )
            .first()
        )

    if not fornecedor_existente:
        fornecedor_existente = (
            db.query(Fornecedor)
            .filter(
                Fornecedor.empresa_id == empresa.id,
                func.lower(Fornecedor.nome) == nome_forn.lower()
            )
            .first()
        )

    if fornecedor_existente:
        # Atualiza dados complementares se informados e estavam vazios
        if cnpj_cpf_limpo and not fornecedor_existente.cnpj_cpf:
            fornecedor_existente.cnpj_cpf = cnpj_cpf_limpo
        if dados.fornecedor_telefone and not fornecedor_existente.telefone:
            fornecedor_existente.telefone = dados.fornecedor_telefone
        if dados.fornecedor_uf and not fornecedor_existente.uf:
            fornecedor_existente.uf = dados.fornecedor_uf.upper()
        if dados.fornecedor_cidade and not fornecedor_existente.cidade:
            fornecedor_existente.cidade = dados.fornecedor_cidade
    else:
        # Cadastra novo fornecedor automaticamente
        novo_fornecedor = Fornecedor(
            empresa_id=empresa.id,
            nome=nome_forn,
            cnpj_cpf=cnpj_cpf_limpo if cnpj_cpf_limpo else None,
            telefone=dados.fornecedor_telefone,
            uf=dados.fornecedor_uf.upper() if dados.fornecedor_uf else None,
            cidade=dados.fornecedor_cidade,
            ativo=True,
            created_at=datetime.utcnow()
        )
        db.add(novo_fornecedor)
        db.flush()

    # 2. Gera chave única e número do documento
    timestamp_str = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_suffix = uuid.uuid4().hex[:6].upper()
    chave_acesso = f"MAN-{empresa.id}-{timestamp_str}-{random_suffix}"

    numero_doc = (dados.numero_documento or "").strip()
    if not numero_doc:
        numero_doc = f"MAN-{int(time.time()) % 1000000:06d}"

    data_emissao_str = dados.data_emissao or datetime.utcnow().strftime("%Y-%m-%d")

    # Calcula valor total somando itens
    valor_total_compra = sum(float(it.valor_total) for it in dados.itens)

    # 3. Cria registro unificado de compra
    compra_db = NfeImportada(
        empresa_id=empresa.id,
        chave_acesso=chave_acesso,
        numero_nota=numero_doc,
        serie=dados.serie or "MAN",
        data_emissao=data_emissao_str,
        valor_total=round(valor_total_compra, 2),
        fornecedor_cnpj=cnpj_cpf_limpo or "00000000000000",
        fornecedor_nome=nome_forn,
        fornecedor_uf=dados.fornecedor_uf.upper() if dados.fornecedor_uf else None,
        total_itens=len(dados.itens),
        usuario_id=current_user.id,
        data_importacao=datetime.utcnow(),
        observacao=dados.observacao,
        origem="MANUAL",
        forma_pagamento=dados.forma_pagamento or "OUTRO",
        anexo_url=dados.anexo_url,
        anexo_nome=dados.anexo_nome,
        anexo_tipo=dados.anexo_tipo,
    )
    db.add(compra_db)
    db.flush()

    # 4. Processa itens, entrada de estoque e atualização de custos
    for item in dados.itens:
        produto = (
            db.query(Produto)
            .filter(Produto.id == item.produto_id, Produto.empresa_id == empresa.id)
            .first()
        )
        if not produto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto ID {item.produto_id} não encontrado no catálogo da empresa."
            )

        fator = item.fator_conversao if (item.fator_conversao and item.fator_conversao > 0) else 1.0
        qtd_entrada = round(item.quantidade * fator, 4)
        custo_unit_calculado = round(item.valor_unitario / fator, 4) if fator > 0 else item.valor_unitario

        # Cria item no histórico
        item_db = ItemNfeImportada(
            nfe_importada_id=compra_db.id,
            produto_id=produto.id,
            codigo_fornecedor=f"MAN-{produto.id}",
            descricao_fornecedor=produto.nome,
            unidade_comercial=item.unidade or "UN",
            quantidade_comercial=item.quantidade,
            fator_conversao=fator,
            quantidade_entrada=qtd_entrada,
            valor_unitario_nota=item.valor_unitario,
            custo_unitario_calculado=custo_unit_calculado,
            valor_total=item.valor_total,
        )
        db.add(item_db)

        # Atualiza estoque
        saldo_anterior = produto.quantidade_estoque or 0.0
        novo_saldo = round(saldo_anterior + qtd_entrada, 4)
        produto.quantidade_estoque = novo_saldo

        # Atualiza custo se solicitado
        if item.atualizar_custo:
            produto.custo_unitario = custo_unit_calculado

        # Movimentação rastreável de estoque
        obs_mov = (
            f"Compra Manual doc {numero_doc} | "
            f"Fornecedor: {nome_forn} | "
            f"Qtd: {item.quantidade} {item.unidade} (Fator {fator} -> +{qtd_entrada})"
        )
        mov = MovimentacaoEstoque(
            empresa_id=empresa.id,
            produto_id=produto.id,
            tipo="ENTRADA",
            quantidade=qtd_entrada,
            motivo="Compra Manual",
            usuario_id=current_user.id,
            data_movimentacao=datetime.utcnow(),
            observacao=obs_mov,
        )
        db.add(mov)

    db.commit()
    db.refresh(compra_db)

    return CompraManualResponse(
        sucesso=True,
        mensagem=f"Compra Manual {numero_doc} registrada com sucesso! {len(dados.itens)} produto(s) deram entrada no estoque.",
        compra_id=compra_db.id,
        chave_acesso=chave_acesso,
        numero_documento=numero_doc,
        valor_total=compra_db.valor_total,
        total_itens=compra_db.total_itens,
    )


# =======================================================
# Consultas e Histórico de Compras (NF-e + Manual)
# =======================================================

@router.get("/resumo", response_model=ResumoComprasResponse)
def get_resumo_compras(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Retorna os indicadores consolidados de Compras para o Dashboard:
    Total comprado no mês, ano, evolução e fornecedores principais.
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

        forn_key = n.fornecedor_cnpj if n.fornecedor_cnpj and n.fornecedor_cnpj != "00000000000000" else n.fornecedor_nome
        fornecedores_map[forn_key]["nome"] = n.fornecedor_nome
        fornecedores_map[forn_key]["total"] += v
        fornecedores_map[forn_key]["qtd"] += 1

    # Identifica fornecedor principal e top fornecedores
    sorted_fornecedores = sorted(
        fornecedores_map.items(),
        key=lambda item: item[1]["total"],
        reverse=True
    )

    top_fornecedores: List[FornecedorPrincipalInfo] = []
    for f_id, dados in sorted_fornecedores[:5]:
        top_fornecedores.append(
            FornecedorPrincipalInfo(
                nome=dados["nome"],
                cnpj=f_id,
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
    origem: Optional[str] = None,
    ano: Optional[int] = None,
    mes: Optional[int] = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Lista o histórico completo de compras (XML NF-e e Manuais).
    Suporta filtro por busca textual, origem ('XML_NFE' ou 'MANUAL'), ano e mês.
    """
    query = (
        db.query(NfeImportada)
        .filter(NfeImportada.empresa_id == empresa.id)
    )

    if origem:
        query = query.filter(NfeImportada.origem == origem)

    if busca:
        busca_term = f"%{busca.strip()}%"
        query = query.filter(
            (NfeImportada.fornecedor_nome.ilike(busca_term)) |
            (NfeImportada.fornecedor_cnpj.ilike(busca_term)) |
            (NfeImportada.numero_nota.ilike(busca_term)) |
            (NfeImportada.chave_acesso.ilike(busca_term))
        )

    limit_val = limit if isinstance(limit, int) else (getattr(limit, "default", 100) or 100)
    compras = query.order_by(NfeImportada.data_importacao.desc()).limit(limit_val).all()

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
                origem=getattr(n, "origem", "XML_NFE") or "XML_NFE",
                forma_pagamento=getattr(n, "forma_pagamento", None),
                anexo_url=getattr(n, "anexo_url", None),
                anexo_nome=getattr(n, "anexo_nome", None),
                anexo_tipo=getattr(n, "anexo_tipo", None),
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
    Retorna os detalhes completos de uma compra (NF-e ou Manual),
    incluindo itens, fator de conversão, custos e anexos.
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
        origem=getattr(nfe, "origem", "XML_NFE") or "XML_NFE",
        forma_pagamento=getattr(nfe, "forma_pagamento", None),
        anexo_url=getattr(nfe, "anexo_url", None),
        anexo_nome=getattr(nfe, "anexo_nome", None),
        anexo_tipo=getattr(nfe, "anexo_tipo", None),
        itens=itens_response,
    )
