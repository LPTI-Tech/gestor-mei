from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, date

from app.database import get_db
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.models.venda import Venda
from app.models.produto import Produto
from app.models.das import DasMensal
from app.models.nfe import NfeImportada
from app.dependencies import get_current_user, require_consultor_or_admin
from app.schemas.consultor import (
    ClienteConsultorItemResponse,
    ResumoConsultorResponse,
    ScoreCliente,
    UltimaCompraResumo,
)

router = APIRouter(prefix="/consultor", tags=["Painel do Consultor LPTI Tech"])


def _calcular_metricas_empresa(empresa: Empresa, db: Session, ano_atual: int) -> ClienteConsultorItemResponse:
    """Calcula todas as métricas financeiras, fiscais e patrimoniais de uma empresa cliente."""
    hoje = date.today()
    ano_start = datetime(ano_atual, 1, 1)
    ano_end = datetime(ano_atual + 1, 1, 1)

    # 1. Faturamento Anual (Vendas Concluídas no ano corrente)
    vendas = (
        db.query(Venda)
        .filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            Venda.data_hora >= ano_start,
            Venda.data_hora < ano_end,
        )
        .all()
    )
    faturamento_anual = sum(v.valor_total or 0.0 for v in vendas)
    limite_mei = empresa.limite_mei_anual or 81000.00
    percentual_limite = round((faturamento_anual / limite_mei) * 100, 1) if limite_mei > 0 else 0.0
    proximo_limite = percentual_limite >= 80.0
    estourou_limite = percentual_limite >= 100.0

    # 2. Status do DAS Mensal
    guias_das = (
        db.query(DasMensal)
        .filter(DasMensal.empresa_id == empresa.id, DasMensal.ano == ano_atual)
        .all()
    )

    qtd_atrasados = 0
    das_vence_em_breve = False
    tem_pendente = False

    for g in guias_das:
        # Se venceu e não está pago, conta como atrasado
        if g.status == "Atrasado" or (g.status == "Pendente" and g.vencimento < hoje):
            qtd_atrasados += 1
        elif g.status == "Pendente":
            tem_pendente = True
            dias_restantes = (g.vencimento - hoje).days
            if 0 <= dias_restantes <= 7:
                das_vence_em_breve = True

    if qtd_atrasados > 0:
        status_das_str = "Atrasado"
    elif tem_pendente:
        status_das_str = "Pendente"
    else:
        status_das_str = "Em dia"

    # 3. Quantidade de Produtos Críticos (Estoque <= Estoque Mínimo)
    produtos_criticos = (
        db.query(Produto)
        .filter(
            Produto.empresa_id == empresa.id,
            Produto.ativo == True,
            Produto.quantidade_estoque <= Produto.estoque_minimo,
        )
        .all()
    )
    qtd_produtos_criticos = len(produtos_criticos)
    nomes_produtos_criticos = [p.nome for p in produtos_criticos[:5]]

    # 4. Última Compra Registrada (NF-e de entrada)
    ultima_nfe = (
        db.query(NfeImportada)
        .filter(NfeImportada.empresa_id == empresa.id)
        .order_by(NfeImportada.data_importacao.desc())
        .first()
    )
    ultima_compra_info: Optional[UltimaCompraResumo] = None
    if ultima_nfe:
        ultima_compra_info = UltimaCompraResumo(
            id=ultima_nfe.id,
            numero_nota=ultima_nfe.numero_nota,
            fornecedor_nome=ultima_nfe.fornecedor_nome,
            valor_total=ultima_nfe.valor_total,
            data=ultima_nfe.data_importacao,
        )

    # 5. Score da Saúde do Negócio
    # 🔴 Crítico: DAS em atraso OU Faturamento >= 100% OU 3+ produtos críticos
    # 🟡 Atenção: Faturamento >= 80% OU 1-2 produtos críticos OU DAS vence em breve
    # 🟢 Saudável: Situação regular em todos os quesitos
    if qtd_atrasados > 0:
        score = ScoreCliente.CRITICO
        score_motivo = f"Possui {qtd_atrasados} guia(s) DAS em atraso."
    elif estourou_limite:
        score = ScoreCliente.CRITICO
        score_motivo = f"Faturamento anual atingiu {percentual_limite}%, estourando o limite do MEI."
    elif qtd_produtos_criticos >= 3:
        score = ScoreCliente.CRITICO
        score_motivo = f"{qtd_produtos_criticos} produtos com estoque zerado ou em nível crítico."
    elif proximo_limite:
        score = ScoreCliente.ATENCAO
        score_motivo = f"Faturamento em {percentual_limite}% do teto anual do MEI (atenção ao desenquadramento)."
    elif qtd_produtos_criticos > 0:
        score = ScoreCliente.ATENCAO
        score_motivo = f"{qtd_produtos_criticos} produto(s) abaixo do estoque mínimo de segurança."
    elif das_vence_em_breve:
        score = ScoreCliente.ATENCAO
        score_motivo = "Guia DAS mensal com vencimento próximo (menos de 7 dias)."
    else:
        score = ScoreCliente.SAUDAVEL
        score_motivo = "Negócio em conformidade fiscal, patrimonial e com margem segura do limite MEI."

    return ClienteConsultorItemResponse(
        id=empresa.id,
        nome_fantasia=empresa.nome_fantasia,
        nome_empresarial=empresa.nome_empresarial,
        cnpj=empresa.cnpj,
        telefone=empresa.telefone,
        email=empresa.email,
        segmento=empresa.segmento,
        status_das=status_das_str,
        qtd_das_atrasados=qtd_atrasados,
        das_vence_em_breve=das_vence_em_breve,
        faturamento_anual=round(faturamento_anual, 2),
        limite_mei_anual=limite_mei,
        percentual_limite_mei=percentual_limite,
        proximo_limite_mei=proximo_limite,
        estourou_limite_mei=estourou_limite,
        quantidade_produtos_criticos=qtd_produtos_criticos,
        produtos_criticos_nomes=nomes_produtos_criticos,
        ultima_compra=ultima_compra_info,
        score=score,
        score_motivo=score_motivo,
    )


@router.get("/resumo", response_model=ResumoConsultorResponse)
def get_resumo_consultor(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_consultor_or_admin),
):
    """
    Retorna o resumo executivo de todos os clientes da carteira do consultor:
    - Clientes ativos
    - DAS em atraso
    - Estoque crítico
    - Próximos do limite MEI
    - Totalizadores de scores (Saudável, Atenção, Crítico)
    """
    empresas = db.query(Empresa).all()
    ano_atual = datetime.utcnow().year

    total_clientes_ativos = len(empresas)
    total_das_atrasado = 0
    total_estoque_critico = 0
    total_proximo_limite = 0
    total_saudaveis = 0
    total_atencao = 0
    total_criticos = 0

    for emp in empresas:
        dados = _calcular_metricas_empresa(emp, db, ano_atual)

        if dados.qtd_das_atrasados > 0:
            total_das_atrasado += 1

        if dados.quantidade_produtos_criticos > 0:
            total_estoque_critico += 1

        if dados.proximo_limite_mei:
            total_proximo_limite += 1

        if dados.score == ScoreCliente.SAUDAVEL:
            total_saudaveis += 1
        elif dados.score == ScoreCliente.ATENCAO:
            total_atencao += 1
        elif dados.score == ScoreCliente.CRITICO:
            total_criticos += 1

    return ResumoConsultorResponse(
        total_clientes_ativos=total_clientes_ativos,
        total_das_atrasado=total_das_atrasado,
        total_estoque_critico=total_estoque_critico,
        total_proximo_limite=total_proximo_limite,
        total_saudaveis=total_saudaveis,
        total_atencao=total_atencao,
        total_criticos=total_criticos,
    )


@router.get("/clientes", response_model=List[ClienteConsultorItemResponse])
def listar_clientes_consultor(
    busca: Optional[str] = None,
    filtro_das_atrasado: Optional[bool] = None,
    filtro_estoque_critico: Optional[bool] = None,
    filtro_proximo_limite: Optional[bool] = None,
    score: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_consultor_or_admin),
):
    """
    Lista todos os clientes da consultoria com indicadores de saúde,
    suportando busca e filtros avançados.
    """
    query = db.query(Empresa)

    if busca:
        busca_term = f"%{busca.strip()}%"
        query = query.filter(
            (Empresa.nome_fantasia.ilike(busca_term)) |
            (Empresa.nome_empresarial.ilike(busca_term)) |
            (Empresa.cnpj.ilike(busca_term))
        )

    empresas = query.all()
    ano_atual = datetime.utcnow().year
    resultados: List[ClienteConsultorItemResponse] = []

    for emp in empresas:
        item = _calcular_metricas_empresa(emp, db, ano_atual)

        # Aplica filtros
        if filtro_das_atrasado and item.qtd_das_atrasados == 0:
            continue

        if filtro_estoque_critico and item.quantidade_produtos_criticos == 0:
            continue

        if filtro_proximo_limite and not item.proximo_limite_mei:
            continue

        if score and score.upper() != "TODOS" and item.score.value != score.upper():
            continue

        resultados.append(item)

    # Ordena prioritariamente por Críticos primeiro, depois Atenção, depois Saudável
    ordem_score = {ScoreCliente.CRITICO: 0, ScoreCliente.ATENCAO: 1, ScoreCliente.SAUDAVEL: 2}
    resultados.sort(key=lambda x: (ordem_score.get(x.score, 3), -x.percentual_limite_mei))

    return resultados


@router.get("/clientes/{empresa_id}", response_model=ClienteConsultorItemResponse)
def obter_detalhes_cliente_consultor(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_consultor_or_admin),
):
    """Retorna a visão diagnóstica aprofundada de um cliente da consultoria."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente / Empresa não encontrada.",
        )

    ano_atual = datetime.utcnow().year
    return _calcular_metricas_empresa(empresa, db, ano_atual)

