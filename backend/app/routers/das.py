from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.das import DasMensal
from app.models.user import User
from app.dependencies import get_current_user
from app.schemas.das import (
    DasMensalCreate,
    DasMensalUpdate,
    DasMensalResponse,
    DasRegistrarPagamentoRequest,
    DasAlterarStatusRequest,
    DasGerarAnoRequest,
    DasResumoResponse,
    DasVencimentosResponse,
)

router = APIRouter(prefix="/das", tags=["Controle DAS Mensal"])

MESES_NOMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

def format_das_response(das: DasMensal, hoje: Optional[date] = None) -> DasMensalResponse:
    if hoje is None:
        hoje = date.today()
    
    nome_mes = MESES_NOMES[das.mes - 1] if 1 <= das.mes <= 12 else f"Mês {das.mes}"
    competencia = f"{nome_mes} / {das.ano}"
    dias = (das.vencimento - hoje).days
    
    if das.status == "Pago":
        alerta = "pago"
    elif das.vencimento < hoje or das.status == "Atrasado":
        alerta = "vencido"
    elif dias == 0:
        alerta = "vence_hoje"
    elif 0 < dias <= 7:
        alerta = "vence_7_dias"
    else:
        alerta = "em_dia"

    return DasMensalResponse(
        id=das.id,
        empresa_id=das.empresa_id,
        ano=das.ano,
        mes=das.mes,
        valor=round(float(das.valor), 2),
        vencimento=das.vencimento,
        status=das.status,
        data_pagamento=das.data_pagamento,
        observacao=das.observacao,
        nome_mes=nome_mes,
        competencia_formatada=competencia,
        dias_para_vencimento=dias,
        alerta_vencimento=alerta,
        created_at=das.created_at,
        updated_at=das.updated_at
    )

def sincronizar_e_garantir_ano(
    db: Session,
    empresa_id: int,
    ano: int,
    valor_mensal: float = 75.60
) -> List[DasMensal]:
    hoje = date.today()
    existentes = db.query(DasMensal).filter(
        DasMensal.empresa_id == empresa_id,
        DasMensal.ano == ano
    ).all()
    
    meses_existentes = {d.mes for d in existentes}
    novos = []
    
    for m in range(1, 13):
        if m not in meses_existentes:
            venc = date(ano, m, 20)
            status_inicial = "Atrasado" if (venc < hoje) else "Pendente"
            novo_das = DasMensal(
                empresa_id=empresa_id,
                ano=ano,
                mes=m,
                valor=valor_mensal,
                vencimento=venc,
                status=status_inicial,
                data_pagamento=None,
                observacao=None
            )
            db.add(novo_das)
            novos.append(novo_das)
            
    if novos:
        db.commit()

    # Atualizar automaticamente para Atrasado os pendentes cujo vencimento já passou
    todos = db.query(DasMensal).filter(
        DasMensal.empresa_id == empresa_id,
        DasMensal.ano == ano
    ).order_by(DasMensal.mes.asc()).all()

    alterou = False
    for d in todos:
        if d.status == "Pendente" and d.vencimento < hoje:
            d.status = "Atrasado"
            alterou = True
    if alterou:
        db.commit()

    return todos


@router.get("", response_model=List[DasMensalResponse])
def listar_das(
    ano: Optional[int] = Query(None, description="Ano de competência"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrar por status: Pago, Pendente, Atrasado"),
    auto_gerar: bool = Query(True, description="Gera automaticamente os 12 meses se não existirem"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os DAS da empresa logada para o ano selecionado.
    Por padrão, inicializa automaticamente as guias do ano para conveniência do MEI.
    """
    empresa_id = current_user.empresa_id
    ano_alvo = ano or date.today().year

    if auto_gerar:
        sincronizar_e_garantir_ano(db, empresa_id, ano_alvo)

    query = db.query(DasMensal).filter(
        DasMensal.empresa_id == empresa_id,
        DasMensal.ano == ano_alvo
    )

    if status_filter:
        query = query.filter(DasMensal.status == status_filter)

    itens = query.order_by(DasMensal.mes.asc()).all()
    hoje = date.today()
    return [format_das_response(i, hoje) for i in itens]


@router.get("/vencimentos", response_model=DasVencimentosResponse)
def consultar_vencimentos(
    ano: Optional[int] = Query(None, description="Ano de competência"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consulta os vencimentos e alertas ativos:
    - Guias com vencimento nos próximos 7 dias
    - Guias em atraso (vencidas)
    - Guias pagas
    - Próximo vencimento prioritário
    """
    empresa_id = current_user.empresa_id
    ano_alvo = ano or date.today().year
    hoje = date.today()

    sincronizar_e_garantir_ano(db, empresa_id, ano_alvo)

    todos = db.query(DasMensal).filter(
        DasMensal.empresa_id == empresa_id,
        DasMensal.ano == ano_alvo
    ).order_by(DasMensal.mes.asc()).all()

    formatados = [format_das_response(d, hoje) for d in todos]

    das_vence_em_7_dias = [
        d for d in formatados
        if d.status != "Pago" and d.dias_para_vencimento is not None and 0 <= d.dias_para_vencimento <= 7
    ]

    das_vencidos = [
        d for d in formatados
        if d.status == "Atrasado" or (d.status != "Pago" and d.vencimento < hoje)
    ]

    das_pagos = [d for d in formatados if d.status == "Pago"]

    # Próximo a vencer (prioridade: vencidos primeiro, depois o pendente mais próximo)
    proximo_a_vencer = None
    if das_vencidos:
        proximo_a_vencer = das_vencidos[0]
    elif das_vence_em_7_dias:
        proximo_a_vencer = das_vence_em_7_dias[0]
    else:
        pendentes_futuros = [d for d in formatados if d.status == "Pendente" and d.vencimento >= hoje]
        if pendentes_futuros:
            proximo_a_vencer = pendentes_futuros[0]

    # Cálculos para o Resumo
    total_pago = sum(d.valor for d in das_pagos)
    total_atrasado = sum(d.valor for d in das_vencidos)
    pendentes_normais = [d for d in formatados if d.status == "Pendente" and d.vencimento >= hoje]
    total_pendente = sum(d.valor for d in pendentes_normais)

    # DAS do mês atual
    das_mes_atual = next((d for d in formatados if d.mes == hoje.month), None)

    # Definir alerta principal
    if das_vencidos:
        qtd = len(das_vencidos)
        alerta_principal = f"Atenção: Você possui {qtd} guia(s) DAS em atraso. Regularize para evitar multas."
        tipo_alerta = "error"
    elif das_vence_em_7_dias:
        d = das_vence_em_7_dias[0]
        if d.dias_para_vencimento == 0:
            alerta_principal = f"Seu DAS de {d.nome_mes} vence hoje (dia {d.vencimento.strftime('%d/%m')})!"
        elif d.dias_para_vencimento == 1:
            alerta_principal = f"Seu DAS de {d.nome_mes} vence amanhã (dia {d.vencimento.strftime('%d/%m')})!"
        else:
            alerta_principal = f"Seu DAS de {d.nome_mes} vence em {d.dias_para_vencimento} dias."
        tipo_alerta = "warning"
    elif das_mes_atual and das_mes_atual.status == "Pago":
        alerta_principal = f"DAS de {das_mes_atual.nome_mes} está quitado. Sua empresa está regular!"
        tipo_alerta = "success"
    else:
        alerta_principal = "Todas as obrigações do DAS estão em conformidade."
        tipo_alerta = "info"

    resumo = DasResumoResponse(
        ano=ano_alvo,
        total_pago=round(total_pago, 2),
        total_pendente=round(total_pendente, 2),
        total_atrasado=round(total_atrasado, 2),
        qtd_pago=len(das_pagos),
        qtd_pendente=len(pendentes_normais),
        qtd_atrasado=len(das_vencidos),
        total_guias=len(formatados),
        das_mes_atual=das_mes_atual,
        proximo_vencimento=proximo_a_vencer,
        alerta_principal=alerta_principal,
        tipo_alerta=tipo_alerta
    )

    return DasVencimentosResponse(
        ano=ano_alvo,
        das_vence_em_7_dias=das_vence_em_7_dias,
        das_vencidos=das_vencidos,
        das_pagos=das_pagos,
        proximo_a_vencer=proximo_a_vencer,
        resumo=resumo
    )


@router.get("/resumo", response_model=DasResumoResponse)
def obter_resumo_das(
    ano: Optional[int] = Query(None, description="Ano de competência"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna o resumo consolidado de valores, status e alertas do DAS para o ano.
    """
    vencimentos_resp = consultar_vencimentos(ano=ano, db=db, current_user=current_user)
    return vencimentos_resp.resumo


@router.post("/gerar-ano", response_model=List[DasMensalResponse])
def gerar_guias_ano(
    payload: DasGerarAnoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gera ou sincroniza as 12 guias mensais para o ano especificado.
    """
    empresa_id = current_user.empresa_id
    todos = sincronizar_e_garantir_ano(
        db, empresa_id, payload.ano, payload.valor_mensal or 75.60
    )
    hoje = date.today()
    return [format_das_response(d, hoje) for d in todos]


@router.get("/{das_id}", response_model=DasMensalResponse)
def obter_das(
    das_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    das = db.query(DasMensal).filter(
        DasMensal.id == das_id,
        DasMensal.empresa_id == current_user.empresa_id
    ).first()

    if not das:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guia DAS não encontrada."
        )

    return format_das_response(das)


@router.post("/{das_id}/pagamento", response_model=DasMensalResponse)
def registrar_pagamento(
    das_id: int,
    payload: DasRegistrarPagamentoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra o pagamento da guia DAS:
    - Altera o status para 'Pago'
    - Salva a data do pagamento (padrão: hoje)
    - Atualiza observação ou valor se fornecidos
    """
    das = db.query(DasMensal).filter(
        DasMensal.id == das_id,
        DasMensal.empresa_id == current_user.empresa_id
    ).first()

    if not das:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guia DAS não encontrada."
        )

    das.status = "Pago"
    das.data_pagamento = payload.data_pagamento or date.today()

    if payload.valor is not None and payload.valor > 0:
        das.valor = payload.valor

    if payload.observacao is not None:
        das.observacao = payload.observacao

    das.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(das)

    return format_das_response(das)


@router.patch("/{das_id}/status", response_model=DasMensalResponse)
def alterar_status(
    das_id: int,
    payload: DasAlterarStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Altera manualmente o status da guia DAS:
    - 'Pago': define data_pagamento se não informada
    - 'Pendente' ou 'Atrasado': remove data_pagamento caso não seja informada
    """
    status_permitidos = ["Pago", "Pendente", "Atrasado"]
    if payload.status not in status_permitidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status inválido. Use um dos seguintes: {', '.join(status_permitidos)}"
        )

    das = db.query(DasMensal).filter(
        DasMensal.id == das_id,
        DasMensal.empresa_id == current_user.empresa_id
    ).first()

    if not das:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guia DAS não encontrada."
        )

    das.status = payload.status

    if payload.status == "Pago":
        das.data_pagamento = payload.data_pagamento or das.data_pagamento or date.today()
    else:
        # Se alterou para Pendente ou Atrasado, remove data_pagamento a menos que explicitamente fornecida
        das.data_pagamento = payload.data_pagamento

    if payload.observacao is not None:
        das.observacao = payload.observacao

    das.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(das)

    return format_das_response(das)


@router.put("/{das_id}", response_model=DasMensalResponse)
def atualizar_das(
    das_id: int,
    payload: DasMensalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    das = db.query(DasMensal).filter(
        DasMensal.id == das_id,
        DasMensal.empresa_id == current_user.empresa_id
    ).first()

    if not das:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guia DAS não encontrada."
        )

    if payload.valor is not None:
        das.valor = payload.valor
    if payload.vencimento is not None:
        das.vencimento = payload.vencimento
    if payload.status is not None:
        das.status = payload.status
    if payload.data_pagamento is not None:
        das.data_pagamento = payload.data_pagamento
    if payload.observacao is not None:
        das.observacao = payload.observacao

    das.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(das)

    return format_das_response(das)

