from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User
from app.models.empresa import Empresa
from app.models.suporte_audit import AuditoriaSuporte
from app.schemas.suporte import (
    SessaoSuporteIniciar,
    SessaoSuporteEncerrar,
    AcaoSuporteCreate,
    AuditoriaSuporteResponse
)
from app.dependencies import require_master

router = APIRouter(prefix="/suporte", tags=["Suporte Master Mode"])


@router.post("/sessao/iniciar", response_model=AuditoriaSuporteResponse)
def iniciar_sessao_suporte(
    data: SessaoSuporteIniciar,
    request: Request,
    db: Session = Depends(get_db),
    master: User = Depends(require_master)
):
    """
    Registra auditoria de início de sessão de suporte do MASTER em uma empresa cliente.
    Armazena identificação do MASTER, empresa acessada, IP, User-Agent e data/hora oficial.
    """
    empresa = db.query(Empresa).filter(Empresa.id == data.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa ID {data.empresa_id} não encontrada para atendimento."
        )

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    audit = AuditoriaSuporte(
        master_id=master.id,
        master_email=master.email,
        master_nome=master.nome,
        empresa_id=empresa.id,
        empresa_nome=empresa.nome_fantasia or empresa.nome_empresarial,
        empresa_cnpj=empresa.cnpj,
        acao="INICIOU_SESSAO_SUPORTE",
        detalhes=f"MASTER {master.nome or master.email} iniciou sessão de suporte operacional na empresa '{empresa.nome_fantasia}'.",
        ip=client_ip,
        user_agent=user_agent,
        data_hora=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.post("/sessao/encerrar", response_model=AuditoriaSuporteResponse)
def encerrar_sessao_suporte(
    data: SessaoSuporteEncerrar,
    request: Request,
    db: Session = Depends(get_db),
    master: User = Depends(require_master)
):
    """
    Registra auditoria de encerramento da sessão de suporte do MASTER e retorno à visão global.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    empresa_id = data.empresa_id
    empresa_nome = None
    empresa_cnpj = None

    if empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        if empresa:
            empresa_nome = empresa.nome_fantasia or empresa.nome_empresarial
            empresa_cnpj = empresa.cnpj
    else:
        # Se empresa_id não informado, tenta buscar a última empresa acessada pelo MASTER
        ultimo = db.query(AuditoriaSuporte).filter(
            AuditoriaSuporte.master_id == master.id,
            AuditoriaSuporte.acao == "INICIOU_SESSAO_SUPORTE"
        ).order_by(desc(AuditoriaSuporte.data_hora)).first()
        if ultimo:
            empresa_id = ultimo.empresa_id
            empresa_nome = ultimo.empresa_nome
            empresa_cnpj = ultimo.empresa_cnpj
        else:
            empresa_id = master.empresa_id or 1

    audit = AuditoriaSuporte(
        master_id=master.id,
        master_email=master.email,
        master_nome=master.nome,
        empresa_id=empresa_id,
        empresa_nome=empresa_nome,
        empresa_cnpj=empresa_cnpj,
        acao="ENCERROU_SESSAO_SUPORTE",
        detalhes=f"MASTER {master.nome or master.email} encerrou sessão de suporte e retornou à Visão Global.",
        ip=client_ip,
        user_agent=user_agent,
        data_hora=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.post("/auditoria/acao", response_model=AuditoriaSuporteResponse)
def registrar_acao_suporte(
    data: AcaoSuporteCreate,
    request: Request,
    db: Session = Depends(get_db),
    master: User = Depends(require_master)
):
    """
    Registra auditoria explícita de uma ação operacional ou fiscal realizada pelo MASTER em contexto de suporte.
    """
    empresa = db.query(Empresa).filter(Empresa.id == data.empresa_id).first()
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    audit = AuditoriaSuporte(
        master_id=master.id,
        master_email=master.email,
        master_nome=master.nome,
        empresa_id=data.empresa_id,
        empresa_nome=(empresa.nome_fantasia or empresa.nome_empresarial) if empresa else None,
        empresa_cnpj=empresa.cnpj if empresa else None,
        acao=data.acao,
        detalhes=data.detalhes,
        ip=client_ip,
        user_agent=user_agent,
        data_hora=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.get("/auditoria", response_model=List[AuditoriaSuporteResponse])
def listar_auditoria_suporte(
    empresa_id: Optional[int] = Query(None, description="Filtrar por empresa cliente"),
    master_id: Optional[int] = Query(None, description="Filtrar por MASTER específico"),
    limit: int = Query(50, le=200, description="Quantidade máxima de registros"),
    db: Session = Depends(get_db),
    master: User = Depends(require_master)
):
    """
    Consulta o histórico de auditoria de sessões e ações de suporte executadas por usuários MASTER.
    Acesso restrito ao perfil MASTER.
    """
    query = db.query(AuditoriaSuporte)
    if empresa_id:
        query = query.filter(AuditoriaSuporte.empresa_id == empresa_id)
    if master_id:
        query = query.filter(AuditoriaSuporte.master_id == master_id)
    
    registros = query.order_by(desc(AuditoriaSuporte.data_hora)).limit(limit).all()
    return registros
