from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session
from datetime import datetime
import re

from app.database import get_db
from app.models.empresa import Empresa
from app.models.user import User
from app.models.produto import Produto
from app.models.estoque import MovimentacaoEstoque
from app.models.nfe import ProdutoVinculoXML, NfeImportada, ItemNfeImportada
from app.dependencies import get_current_user, get_current_empresa
from app.services.nfe_parser import parse_nfe_xml, NfeParserError
from app.schemas.nfe import (
    NfePreviewResponse,
    ItemNfePreview,
    FornecedorNfe,
    ProdutoVinculoCreate,
    ProdutoVinculoResponse,
    NfeImportarRequest,
    NfeImportarResultadoResponse,
    ProdutoAtualizadoInfo,
    NfeImportadaResponse,
    ItemNfeImportadaResponse,
)

router = APIRouter(prefix="/nfe", tags=["XML NF-e - Entrada de Mercadorias"])


def _clean_digits(val: Optional[str]) -> str:
    if not val:
        return ""
    return re.sub(r"\D", "", val)


@router.post("/preview-xml", response_model=NfePreviewResponse)
async def preview_nfe_xml(
    request: Request,
    file: Optional[UploadFile] = File(None),
    xml_text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Recebe um arquivo XML de NF-e (ou string com conteúdo XML), realiza a leitura
    estruturada dos dados do fornecedor, cabeçalho e itens, cruzando com os vínculos
    já existentes no banco para sugerir o De-Para de produtos e fator de conversão.
    Verifica também se a nota fiscal já foi importada anteriormente.
    """
    xml_bytes: bytes = b""

    if file is not None:
        xml_bytes = await file.read()
    elif xml_text:
        xml_bytes = xml_text.encode("utf-8")
    else:
        body = await request.body()
        if body:
            xml_bytes = body
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum arquivo XML ou conteúdo foi enviado para análise."
            )

    try:
        parsed = parse_nfe_xml(xml_bytes)
    except NfeParserError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    chave_acesso_parsed = parsed["chave_acesso"].strip()

    # Verifica se a nota já foi importada para a mesma empresa
    nota_previa = db.query(NfeImportada).filter(
        NfeImportada.empresa_id == empresa.id,
        NfeImportada.chave_acesso == chave_acesso_parsed
    ).first()

    ja_importada = (nota_previa is not None)
    data_previa_str = nota_previa.data_importacao.strftime("%d/%m/%Y às %H:%M") if nota_previa else None

    fornecedor_data = parsed["fornecedor"]
    fornecedor_cnpj_clean = _clean_digits(fornecedor_data.get("cnpj", ""))

    # Validação simples de destinatário: alerta se o CNPJ destinatário for diferente do CNPJ da empresa
    destinatario_cnpj_clean = _clean_digits(parsed.get("destinatario_cnpj"))
    empresa_cnpj_clean = _clean_digits(empresa.cnpj)
    destinatario_valido = True
    if destinatario_cnpj_clean and empresa_cnpj_clean:
        destinatario_valido = (destinatario_cnpj_clean == empresa_cnpj_clean)

    # Carrega vínculos prévios salvos para a empresa
    vinculos = db.query(ProdutoVinculoXML).filter(
        ProdutoVinculoXML.empresa_id == empresa.id
    ).all()
    vinculos_map = {
        (_clean_digits(v.fornecedor_cnpj), v.codigo_fornecedor.strip()): v
        for v in vinculos
    }

    # Carrega produtos cadastrados da empresa
    produtos = db.query(Produto).filter(
        Produto.empresa_id == empresa.id,
        Produto.ativo == True
    ).all()
    produtos_by_id = {p.id: p for p in produtos}

    itens_preview: List[ItemNfePreview] = []
    itens_vinculados_count = 0
    itens_pendentes_count = 0

    for item in parsed.get("itens", []):
        c_prod = item["codigo_fornecedor"].strip()
        descricao_forn = item["descricao_fornecedor"].strip()
        fator = 1.0
        status_vinc = "PENDENTE"
        prod_id_vinc: Optional[int] = None
        prod_nome_vinc: Optional[str] = None

        # 1. Verifica se já existe vínculo exato (Fornecedor CNPJ + cProd)
        vinculo_existente = vinculos_map.get((fornecedor_cnpj_clean, c_prod))
        if vinculo_existente and vinculo_existente.produto_id in produtos_by_id:
            status_vinc = "VINCULADO"
            prod_id_vinc = vinculo_existente.produto_id
            prod_nome_vinc = produtos_by_id[vinculo_existente.produto_id].nome
            fator = vinculo_existente.fator_conversao or 1.0
            itens_vinculados_count += 1
        else:
            # 2. Tenta sugestão inteligente por similaridade de nome
            sugestao: Optional[Produto] = None
            desc_lower = descricao_forn.lower()
            for p in produtos:
                p_nome_lower = p.nome.lower()
                if p_nome_lower in desc_lower or desc_lower in p_nome_lower:
                    sugestao = p
                    break

            if sugestao:
                status_vinc = "SUGESTAO"
                prod_id_vinc = sugestao.id
                prod_nome_vinc = sugestao.nome
                fator = 1.0
            else:
                status_vinc = "PENDENTE"
                fator = 1.0

            itens_pendentes_count += 1

        # Cálculo da quantidade no estoque e custo unitário resultante
        qtd_comercial = item["quantidade_comercial"]
        v_un_com = item["valor_unitario"]

        qtd_estoque = round(qtd_comercial * fator, 4)
        custo_unit = round(v_un_com / fator, 4) if fator > 0 else v_un_com

        itens_preview.append(
            ItemNfePreview(
                numero_item=item["numero_item"],
                codigo_fornecedor=c_prod,
                descricao_fornecedor=descricao_forn,
                ean=item.get("ean"),
                ncm=item.get("ncm"),
                cfop=item.get("cfop"),
                unidade_comercial=item["unidade_comercial"],
                quantidade_comercial=qtd_comercial,
                valor_unitario=v_un_com,
                valor_total=item["valor_total"],
                produto_id_vinculado=prod_id_vinc,
                produto_nome_vinculado=prod_nome_vinc,
                fator_conversao=fator,
                status_vinculo=status_vinc,
                quantidade_estoque_entrada=qtd_estoque,
                custo_unitario_calculado=custo_unit,
            )
        )

    return NfePreviewResponse(
        chave_acesso=chave_acesso_parsed,
        numero_nota=parsed["numero_nota"],
        serie=parsed["serie"],
        data_emissao=parsed["data_emissao"],
        valor_total=parsed["valor_total"],
        fornecedor=FornecedorNfe(**fornecedor_data),
        destinatario_cnpj=parsed.get("destinatario_cnpj"),
        destinatario_valido=destinatario_valido,
        ja_importada=ja_importada,
        data_importacao_previa=data_previa_str,
        total_itens=len(itens_preview),
        itens_vinculados=itens_vinculados_count,
        itens_pendentes=itens_pendentes_count,
        itens=itens_preview,
    )


# =======================================================
# Endpoint Principal da Fase 2: POST /api/nfe/importar
# =======================================================

@router.post("/importar", response_model=NfeImportarResultadoResponse, status_code=status.HTTP_201_CREATED)
def importar_nfe(
    req: NfeImportarRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Efetiva a entrada de mercadorias no estoque a partir dos dados do XML da NF-e:
    1. Impede importação duplicada da mesma nota fiscal (mesma chave de acesso).
    2. Registra o cabeçalho e fornecedor na tabela de histórico de importações.
    3. Atualiza automaticamente a quantidade em estoque para cada produto.
    4. Atualiza o custo unitário do produto.
    5. Registra a movimentação de estoque (Tipo: ENTRADA, Motivo: Importação XML NF-e).
    6. Atualiza o vínculo De-Para na tabela produtos_vinculo_xml para compras futuras.
    """
    chave_acesso = req.chave_acesso.strip()
    if not chave_acesso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chave de acesso da NF-e é obrigatória."
        )

    # 1. Impede importação duplicada da mesma nota
    nota_existente = db.query(NfeImportada).filter(
        NfeImportada.empresa_id == empresa.id,
        NfeImportada.chave_acesso == chave_acesso
    ).first()

    if nota_existente:
        data_formatada = nota_existente.data_importacao.strftime("%d/%m/%Y às %H:%M")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Esta NF-e (Chave: {chave_acesso}) já foi importada anteriormente para sua empresa em {data_formatada}. Não é permitido importar a mesma nota em duplicidade."
        )

    if not req.itens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum item informado para importação de estoque."
        )

    # 2. Registra o cabeçalho no histórico de importações
    fornecedor_cnpj_clean = _clean_digits(req.fornecedor_cnpj)
    nfe_db = NfeImportada(
        empresa_id=empresa.id,
        chave_acesso=chave_acesso,
        numero_nota=req.numero_nota.strip(),
        serie=req.serie.strip() if req.serie else "1",
        data_emissao=req.data_emissao,
        valor_total=req.valor_total,
        fornecedor_cnpj=fornecedor_cnpj_clean,
        fornecedor_nome=req.fornecedor_nome.strip(),
        fornecedor_uf=req.fornecedor_uf.strip().upper() if req.fornecedor_uf else None,
        total_itens=len(req.itens),
        usuario_id=current_user.id,
        data_importacao=datetime.utcnow(),
        observacao=req.observacao,
    )
    db.add(nfe_db)
    db.flush()

    produtos_atualizados: List[ProdutoAtualizadoInfo] = []

    for item in req.itens:
        produto = db.query(Produto).filter(
            Produto.id == item.produto_id,
            Produto.empresa_id == empresa.id
        ).first()

        if not produto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto com ID {item.produto_id} não foi encontrado no catálogo da sua empresa."
            )

        fator = item.fator_conversao if (item.fator_conversao and item.fator_conversao > 0) else 1.0
        qtd_entrada = round(item.quantidade_comercial * fator, 4)
        custo_unit = round(item.valor_unitario / fator, 4) if fator > 0 else item.valor_unitario

        # 3. Registra item no histórico da NF-e
        item_db = ItemNfeImportada(
            nfe_importada_id=nfe_db.id,
            produto_id=produto.id,
            codigo_fornecedor=item.codigo_fornecedor.strip(),
            descricao_fornecedor=item.descricao_fornecedor,
            unidade_comercial=item.unidade_comercial or "UN",
            quantidade_comercial=item.quantidade_comercial,
            fator_conversao=fator,
            quantidade_entrada=qtd_entrada,
            valor_unitario_nota=item.valor_unitario,
            custo_unitario_calculado=custo_unit,
            valor_total=item.valor_total,
        )
        db.add(item_db)

        # 4. Atualiza quantidade em estoque e custo unitário
        qtd_anterior = produto.quantidade_estoque or 0.0
        custo_anterior = produto.custo_unitario or 0.0
        qtd_nova = round(qtd_anterior + qtd_entrada, 4)

        produto.quantidade_estoque = qtd_nova
        custo_atualizado = False
        custo_novo = custo_anterior
        if item.atualizar_custo:
            produto.custo_unitario = custo_unit
            custo_novo = custo_unit
            custo_atualizado = True

        # 5. Registra movimentação de estoque
        obs_mov = (
            f"NF-e: {req.numero_nota} Série: {req.serie or '1'} | "
            f"Fornecedor: {req.fornecedor_nome} (CNPJ: {req.fornecedor_cnpj}) | "
            f"Chave: {chave_acesso}"
        )
        mov = MovimentacaoEstoque(
            empresa_id=empresa.id,
            produto_id=produto.id,
            tipo="ENTRADA",
            quantidade=qtd_entrada,
            motivo="Importação XML NF-e",
            usuario_id=current_user.id,
            data_movimentacao=datetime.utcnow(),
            observacao=obs_mov,
        )
        db.add(mov)

        # 6. Atualiza vínculo De-Para se solicitado
        if item.atualizar_vinculo:
            c_prod = item.codigo_fornecedor.strip()
            vinculo = db.query(ProdutoVinculoXML).filter(
                ProdutoVinculoXML.empresa_id == empresa.id,
                ProdutoVinculoXML.fornecedor_cnpj == fornecedor_cnpj_clean,
                ProdutoVinculoXML.codigo_fornecedor == c_prod
            ).first()

            if vinculo:
                vinculo.produto_id = produto.id
                vinculo.fator_conversao = fator
                vinculo.fornecedor_nome = req.fornecedor_nome
                if item.descricao_fornecedor:
                    vinculo.descricao_fornecedor = item.descricao_fornecedor
                vinculo.updated_at = datetime.utcnow()
            else:
                novo_vinculo = ProdutoVinculoXML(
                    empresa_id=empresa.id,
                    fornecedor_cnpj=fornecedor_cnpj_clean,
                    fornecedor_nome=req.fornecedor_nome,
                    codigo_fornecedor=c_prod,
                    descricao_fornecedor=item.descricao_fornecedor,
                    produto_id=produto.id,
                    fator_conversao=fator,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(novo_vinculo)

        produtos_atualizados.append(
            ProdutoAtualizadoInfo(
                produto_id=produto.id,
                nome=produto.nome,
                quantidade_anterior=qtd_anterior,
                quantidade_adicionada=qtd_entrada,
                quantidade_nova=qtd_nova,
                custo_anterior=custo_anterior,
                custo_novo=custo_novo,
                custo_atualizado=custo_atualizado,
            )
        )

    db.commit()
    db.refresh(nfe_db)

    return NfeImportarResultadoResponse(
        sucesso=True,
        mensagem=f"NF-e {req.numero_nota} importada com sucesso! {len(produtos_atualizados)} produto(s) atualizado(s) no estoque.",
        nfe_id=nfe_db.id,
        chave_acesso=chave_acesso,
        numero_nota=req.numero_nota,
        total_itens_processados=len(produtos_atualizados),
        produtos_atualizados=produtos_atualizados,
    )


# =======================================================
# Endpoints de Histórico de Importações
# =======================================================

@router.get("/historico", response_model=List[NfeImportadaResponse])
def listar_historico_nfe(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Retorna o histórico de todas as notas fiscais importadas para a empresa,
    ordenadas da mais recente para a mais antiga.
    """
    notas = (
        db.query(NfeImportada)
        .filter(NfeImportada.empresa_id == empresa.id)
        .order_by(NfeImportada.data_importacao.desc())
        .all()
    )

    result: List[NfeImportadaResponse] = []
    for n in notas:
        result.append(
            NfeImportadaResponse(
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


@router.get("/historico/{nfe_id}", response_model=NfeImportadaResponse)
def obter_detalhes_nfe_importada(
    nfe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Retorna os detalhes completos de uma NF-e importada, incluindo a lista de itens.
    """
    n = (
        db.query(NfeImportada)
        .filter(NfeImportada.id == nfe_id, NfeImportada.empresa_id == empresa.id)
        .first()
    )
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nota Fiscal importada não encontrada."
        )

    itens_response: List[ItemNfeImportadaResponse] = []
    for it in n.itens:
        itens_response.append(
            ItemNfeImportadaResponse(
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

    return NfeImportadaResponse(
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
        itens=itens_response,
    )


# =======================================================
# Endpoints de Gestão de Vínculos De-Para
# =======================================================

@router.get("/vinculos", response_model=List[ProdutoVinculoResponse])
def list_vinculos_xml(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Lista todos os vínculos cadastrados entre códigos de produtos de fornecedores
    e os produtos do catálogo do Gestor MEI.
    """
    vinculos = (
        db.query(ProdutoVinculoXML)
        .filter(ProdutoVinculoXML.empresa_id == empresa.id)
        .order_by(ProdutoVinculoXML.updated_at.desc())
        .all()
    )

    result: List[ProdutoVinculoResponse] = []
    for v in vinculos:
        result.append(
            ProdutoVinculoResponse(
                id=v.id,
                empresa_id=v.empresa_id,
                fornecedor_cnpj=v.fornecedor_cnpj,
                fornecedor_nome=v.fornecedor_nome,
                codigo_fornecedor=v.codigo_fornecedor,
                descricao_fornecedor=v.descricao_fornecedor,
                ean_fornecedor=v.ean_fornecedor,
                produto_id=v.produto_id,
                produto_nome=v.produto.nome if v.produto else None,
                fator_conversao=v.fator_conversao,
                created_at=v.created_at,
                updated_at=v.updated_at,
            )
        )
    return result


@router.post("/vinculos", response_model=ProdutoVinculoResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_vinculo(
    req: ProdutoVinculoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Cria ou atualiza um vínculo entre o código do item no fornecedor e um produto local,
    com o respectivo fator de conversão de unidades.
    """
    produto = db.query(Produto).filter(
        Produto.id == req.produto_id,
        Produto.empresa_id == empresa.id
    ).first()
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto especificado não foi encontrado no catálogo da sua empresa."
        )

    clean_cnpj = _clean_digits(req.fornecedor_cnpj)
    fator = req.fator_conversao if (req.fator_conversao and req.fator_conversao > 0) else 1.0

    vinculo = db.query(ProdutoVinculoXML).filter(
        ProdutoVinculoXML.empresa_id == empresa.id,
        ProdutoVinculoXML.fornecedor_cnpj == clean_cnpj,
        ProdutoVinculoXML.codigo_fornecedor == req.codigo_fornecedor.strip()
    ).first()

    if vinculo:
        vinculo.produto_id = req.produto_id
        vinculo.fator_conversao = fator
        if req.fornecedor_nome:
            vinculo.fornecedor_nome = req.fornecedor_nome
        if req.descricao_fornecedor:
            vinculo.descricao_fornecedor = req.descricao_fornecedor
        if req.ean_fornecedor:
            vinculo.ean_fornecedor = req.ean_fornecedor
        vinculo.updated_at = datetime.utcnow()
    else:
        vinculo = ProdutoVinculoXML(
            empresa_id=empresa.id,
            fornecedor_cnpj=clean_cnpj,
            fornecedor_nome=req.fornecedor_nome,
            codigo_fornecedor=req.codigo_fornecedor.strip(),
            descricao_fornecedor=req.descricao_fornecedor,
            ean_fornecedor=req.ean_fornecedor,
            produto_id=req.produto_id,
            fator_conversao=fator,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(vinculo)

    db.commit()
    db.refresh(vinculo)

    return ProdutoVinculoResponse(
        id=vinculo.id,
        empresa_id=vinculo.empresa_id,
        fornecedor_cnpj=vinculo.fornecedor_cnpj,
        fornecedor_nome=vinculo.fornecedor_nome,
        codigo_fornecedor=vinculo.codigo_fornecedor,
        descricao_fornecedor=vinculo.descricao_fornecedor,
        ean_fornecedor=vinculo.ean_fornecedor,
        produto_id=vinculo.produto_id,
        produto_nome=produto.nome,
        fator_conversao=vinculo.fator_conversao,
        created_at=vinculo.created_at,
        updated_at=vinculo.updated_at,
    )


@router.delete("/vinculos/{vinculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vinculo(
    vinculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa),
):
    """
    Remove um vínculo entre código de fornecedor e produto.
    """
    vinculo = db.query(ProdutoVinculoXML).filter(
        ProdutoVinculoXML.id == vinculo_id,
        ProdutoVinculoXML.empresa_id == empresa.id
    ).first()

    if not vinculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vínculo não encontrado."
        )

    db.delete(vinculo)
    db.commit()
    return None
