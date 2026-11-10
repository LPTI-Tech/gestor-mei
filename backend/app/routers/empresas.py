import os
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.schemas.empresa import (
    EmpresaResponse,
    EmpresaUpdate,
    EmpresaCreateMaster,
    TransferirPropriedadeRequest,
    ModulosConfigUpdate,
    ConfiguracaoEstoqueUpdate,
    EmpresaMasterListItem,
    EmpresaMasterOwner,
    EmpresaStatusUpdate,
    MetricasGlobaisResponse
)
from app.dependencies import (
    get_current_empresa,
    require_admin,
    require_master
)
from app.security import hash_password
from app.services.storage_service import storage_service
from app.services.image_service import validate_image_upload, optimize_and_convert_to_webp

router = APIRouter(prefix="/empresa", tags=["Empresa"])


@router.get("", response_model=EmpresaResponse)
def get_empresa_info(empresa: Empresa = Depends(get_current_empresa)):
    return empresa


@router.put("", response_model=EmpresaResponse)
def update_empresa_info(
    data: EmpresaUpdate,
    empresa: Empresa = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(empresa, key, value)
    
    db.commit()
    db.refresh(empresa)
    return empresa


@router.put("/modulos", response_model=EmpresaResponse)
def update_modulos_config(
    data: ModulosConfigUpdate,
    empresa: Empresa = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    empresa.modulo_delivery = data.modulo_delivery
    empresa.modulo_motoboy = data.modulo_motoboy
    empresa.modulo_ifood = data.modulo_ifood
    empresa.modulo_estoque = data.modulo_estoque
    if data.permitir_estoque_negativo is not None:
        empresa.permitir_estoque_negativo = data.permitir_estoque_negativo
    db.commit()
    db.refresh(empresa)
    return empresa


@router.put("/estoque-config", response_model=EmpresaResponse)
def update_estoque_config(
    data: ConfiguracaoEstoqueUpdate,
    empresa: Empresa = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    empresa.permitir_estoque_negativo = data.permitir_estoque_negativo
    db.commit()
    db.refresh(empresa)
    return empresa


# ============================================================================
# OPERAÇÕES EXCLUSIVAS DO PERFIL MASTER (PLATAFORMA LPTI TECH)
# ============================================================================

@router.get("/metricas-globais", response_model=MetricasGlobaisResponse)
def get_metricas_globais_master(
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Retorna consolidação dos principais indicadores de plataforma para o Dashboard MASTER:
    - Total de empresas
    - Empresas ativas vs. bloqueadas
    - Total de proprietários (OWNER), operadores, consultores e MASTERs.
    """
    total_empresas = db.query(Empresa).count()
    empresas_ativas = db.query(Empresa).filter(Empresa.ativo == True).count()
    empresas_bloqueadas = db.query(Empresa).filter(Empresa.ativo == False).count()

    total_owners = db.query(User).filter(User.role.in_([UserRole.OWNER, UserRole.ADMIN])).count()
    total_operadores = db.query(User).filter(User.role.in_([UserRole.OPERATOR, UserRole.OPERADOR])).count()
    total_consultores = db.query(User).filter(User.role == UserRole.CONSULTOR).count()
    total_masters = db.query(User).filter(User.role == UserRole.MASTER).count()

    return MetricasGlobaisResponse(
        total_empresas=total_empresas,
        empresas_ativas=empresas_ativas,
        empresas_bloqueadas=empresas_bloqueadas,
        total_owners=total_owners,
        total_operadores=total_operadores,
        total_consultores=total_consultores,
        total_masters=total_masters
    )


@router.get("/todas", response_model=List[EmpresaMasterListItem])
def listar_todas_empresas_master(
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Lista todas as empresas cadastradas na plataforma com seus titulares (OWNER),
    total de usuários e status operacional.
    Acesso estritamente exclusivo ao perfil MASTER.
    """
    empresas = db.query(Empresa).order_by(Empresa.id.asc()).all()
    resultado = []
    for emp in empresas:
        owner_user = db.query(User).filter(
            User.empresa_id == emp.id,
            User.role == UserRole.OWNER
        ).first()
        total_users = db.query(User).filter(User.empresa_id == emp.id).count()

        owner_info = None
        if owner_user:
            owner_info = EmpresaMasterOwner(
                id=owner_user.id,
                nome=owner_user.nome,
                email=owner_user.email,
                ativo=owner_user.ativo,
                ultimo_acesso=owner_user.ultimo_acesso
            )

        emp_dict = EmpresaResponse.model_validate(emp).model_dump()
        resultado.append(EmpresaMasterListItem(
            **emp_dict,
            owner=owner_info,
            total_usuarios=total_users
        ))
    return resultado


@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
def criar_empresa_master(
    data: EmpresaCreateMaster,
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Cria uma nova empresa cliente na plataforma.
    Acesso estritamente exclusivo ao perfil MASTER.
    """
    existente = db.query(Empresa).filter(Empresa.cnpj == data.cnpj).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma empresa cadastrada com este CNPJ."
        )

    nova_empresa = Empresa(
        nome_empresarial=data.nome_empresarial,
        nome_fantasia=data.nome_fantasia,
        cnpj=data.cnpj,
        cpf_proprietario=data.cpf_proprietario,
        endereco=data.endereco,
        telefone=data.telefone,
        email=data.email,
        limite_mei_anual=data.limite_mei_anual or 81000.00,
        segmento=data.segmento or "ALIMENTACAO",
        modulo_delivery=data.modulo_delivery if data.modulo_delivery is not None else True,
        modulo_motoboy=data.modulo_motoboy if data.modulo_motoboy is not None else True,
        modulo_ifood=data.modulo_ifood if data.modulo_ifood is not None else True,
        modulo_estoque=data.modulo_estoque if data.modulo_estoque is not None else False,
        permitir_estoque_negativo=data.permitir_estoque_negativo if data.permitir_estoque_negativo is not None else True
    )
    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)

    # Se foram enviados dados do OWNER titular inicial, cadastra-o
    if data.email_owner and data.senha_owner:
        email_clean = data.email_owner.lower().strip()
        user_exist = db.query(User).filter(User.email == email_clean).first()
        if not user_exist:
            owner = User(
                empresa_id=nova_empresa.id,
                nome=data.nome_owner or "Proprietário Titular",
                email=email_clean,
                hashed_password=hash_password(data.senha_owner),
                role=UserRole.OWNER,
                ativo=True,
                criado_por_id=master_user.id
            )
            db.add(owner)
            db.commit()

    return nova_empresa


@router.delete("/{empresa_id}")
def excluir_empresa_master(
    empresa_id: int,
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Exclui uma empresa cliente e seus vínculos.
    Acesso estritamente exclusivo ao perfil MASTER.
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    # Exclui usuários da empresa
    db.query(User).filter(User.empresa_id == empresa_id).delete()
    db.delete(empresa)
    db.commit()
    return {"message": f"Empresa '{empresa.nome_fantasia}' excluída com sucesso pela gestão MASTER."}


@router.post("/{empresa_id}/transferir-propriedade")
def transferir_propriedade_master(
    empresa_id: int,
    data: TransferirPropriedadeRequest,
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Transfere a titularidade (OWNER) de uma empresa para outro usuário da empresa.
    Acesso estritamente exclusivo ao perfil MASTER.
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    novo_owner = db.query(User).filter(
        User.id == data.novo_owner_user_id,
        User.empresa_id == empresa_id
    ).first()
    if not novo_owner:
        raise HTTPException(
            status_code=404,
            detail="O usuário indicado para novo titular não pertence a esta empresa."
        )

    # Rebaixa o(s) antigo(s) OWNER(s) da empresa para OPERATOR
    db.query(User).filter(
        User.empresa_id == empresa_id,
        User.role == UserRole.OWNER,
        User.id != novo_owner.id
    ).update({"role": UserRole.OPERATOR})

    # Promove o novo usuário para OWNER
    novo_owner.role = UserRole.OWNER
    db.commit()

    return {
        "message": f"Propriedade da empresa '{empresa.nome_fantasia}' transferida com sucesso para '{novo_owner.nome}'."
    }


@router.patch("/{empresa_id}/status", response_model=EmpresaResponse)
def toggle_status_empresa_master(
    empresa_id: int,
    data: EmpresaStatusUpdate,
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Bloqueia ou desbloqueia uma empresa cliente com motivo opcional.
    Acesso estritamente exclusivo ao perfil MASTER.
    """
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    empresa.ativo = data.ativo
    empresa.motivo_bloqueio = data.motivo_bloqueio if not data.ativo else None
    db.commit()
    db.refresh(empresa)
    return empresa



# ============================================================================
# ENDPOINTS DE LOGOTIPO DA EMPRESA (Sprint Operação Real 1)
# ============================================================================

def _stream_empresa_logo(empresa_id: int, db: Session):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa or not empresa.logo_url:
        raise HTTPException(status_code=404, detail="Logotipo não encontrado para esta empresa.")

    res = storage_service.get_company_logo_stream(empresa_id=empresa_id)
    if not res:
        raise HTTPException(status_code=404, detail="Arquivo de logotipo não encontrado no armazenamento.")

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


@router.post("/logo", response_model=EmpresaResponse)
def upload_empresa_logo(
    file: UploadFile = File(...),
    empresa: Empresa = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Upload do logotipo oficial da empresa.
    Otimiza e converte para WebP (máx 600x600 px) e armazena no Cloudflare R2 com fallback local.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    content = file.file.read()
    valido, msg_erro = validate_image_upload(content, file.content_type)
    if not valido:
        raise HTTPException(status_code=400, detail=msg_erro)

    try:
        webp_bytes, content_type = optimize_and_convert_to_webp(content, max_size=(600, 600), quality=90)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar logotipo: {str(e)}")

    storage_service.save_company_logo(
        webp_bytes,
        empresa_id=empresa.id,
        content_type=content_type
    )

    empresa.logo_url = f"/api/empresa/{empresa.id}/logo"
    db.commit()
    db.refresh(empresa)
    return empresa


@router.get("/logo")
def get_current_empresa_logo(
    empresa: Empresa = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    """
    Retorna o logotipo da empresa autenticada no contexto atual.
    """
    return _stream_empresa_logo(empresa.id, db)


@router.get("/{empresa_id}/logo")
def get_empresa_logo_by_id(
    empresa_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna o logotipo da empresa pelo ID da empresa.
    Público para renderização de layouts, PDFs e DANFE sem bloqueio de sessão.
    """
    return _stream_empresa_logo(empresa_id, db)


@router.delete("/logo", response_model=EmpresaResponse)
def delete_empresa_logo(
    empresa: Empresa = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Remove o logotipo da empresa do storage e do cadastro.
    """
    storage_service.delete_company_logo(empresa_id=empresa.id)

    empresa.logo_url = None
    db.commit()
    db.refresh(empresa)
    return empresa
