import secrets
import hashlib
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.models.password_reset import PasswordResetToken, AuditoriaRecuperacaoSenha
from app.models.user_oauth import UserOAuthAccount
from app.models.login_audit import AuditoriaLogin
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    Token,
    EsqueciSenhaRequest,
    EsqueciSenhaResponse,
    ValidarTokenResetResponse,
    RedefinirSenhaRequest,
    RedefinirSenhaResponse,
    GoogleAuthRequest,
    MicrosoftAuthRequest,
    ProvedorVinculadoResponse,
    ProvedoresUsuarioResponse,
    AuditoriaLoginResponse
)
from app.schemas.user import UserResponse
from app.schemas.empresa import EmpresaResponse
from app.security import verify_password, hash_password, create_access_token
from app.dependencies import get_current_user, get_current_empresa, require_admin, require_master
from app.services.email_service import enviar_email_recuperacao
from app.services.oauth_service import (
    verify_google_credential,
    verify_microsoft_token,
    authenticate_or_link_social_user
)
from app.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["Autenticação"])

MENSAGEM_ANTI_ENUMERACAO = "Se existir uma conta vinculada a este e-mail, você receberá instruções para redefinir sua senha."


def _mascarar_email(email: str) -> str:
    """Mascara o e-mail para exibição segura (ex: leonidas@exemplo.com -> l***s@exemplo.com)."""
    try:
        usuario, dominio = email.split("@")
        if len(usuario) <= 2:
            usuario_mascarado = usuario[0] + "***"
        else:
            usuario_mascarado = usuario[0] + "***" + usuario[-1]
        return f"{usuario_mascarado}@{dominio}"
    except Exception:
        return "seu e-mail"


@router.post("/register", status_code=status.HTTP_403_FORBIDDEN)
def register_empresa():
    """
    Auto-cadastro público desativado por política de segurança RBAC.
    A criação de novas empresas e titulares é exclusiva da plataforma MASTER via POST /api/empresa.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="O auto-cadastro público está desativado. Novas empresas e proprietários devem ser provisionados exclusivamente pelo perfil MASTER da plataforma."
    )


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]
    email_clean = data.email.lower().strip()

    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(data.password, user.hashed_password):
        # Auditoria de tentativa incorreta
        audit_falha = AuditoriaLogin(
            user_id=user.id if user else None,
            email=email_clean,
            provider="LOCAL",
            sucesso=False,
            motivo_falha="E-mail ou senha incorretos",
            ip=client_ip,
            user_agent=user_agent,
            empresa_id=user.empresa_id if user else None
        )
        db.add(audit_falha)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )
    
    if not user.ativo:
        audit_bloq = AuditoriaLogin(
            user_id=user.id,
            email=email_clean,
            provider="LOCAL",
            sucesso=False,
            motivo_falha="Usuário inativo",
            ip=client_ip,
            user_agent=user_agent,
            empresa_id=user.empresa_id
        )
        db.add(audit_bloq)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Contate o administrador da sua empresa."
        )
    
    # Registra a data e hora do último acesso e auditoria de sucesso
    user.ultimo_acesso = datetime.utcnow()
    audit_ok = AuditoriaLogin(
        user_id=user.id,
        email=email_clean,
        provider="LOCAL",
        sucesso=True,
        motivo_falha=None,
        ip=client_ip,
        user_agent=user_agent,
        empresa_id=user.empresa_id
    )
    db.add(audit_ok)
    db.commit()

    nome_fantasia = "Plataforma LPTI Tech"
    if user.empresa_id is not None:
        empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
        if not empresa and user.role != UserRole.MASTER:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não localizada."
            )
        if empresa:
            nome_fantasia = empresa.nome_fantasia
    
    token_payload = {
        "sub": user.email,
        "empresa_id": user.empresa_id,
        "user_id": user.id,
        "role": user.role.value
    }
    access_token = create_access_token(token_payload)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        empresa_id=user.empresa_id,
        nome=user.nome,
        email=user.email,
        role=user.role,
        nome_fantasia=nome_fantasia
    )


# ============================================================================
# SPRINT RBAC 03: ENDPOINTS DE LOGIN SOCIAL (GOOGLE E MICROSOFT)
# ============================================================================

@router.post("/google", response_model=Token)
@limiter.limit("10/minute")
def login_google(request: Request, data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Autentica ou vincula um usuário via Google Identity Services (GIS).
    Valida criptograficamente o ID Token do Google, confirma verificação de e-mail,
    vincula a conta ao tenant correspondente e retorna a sessão autenticada.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    oauth_info = verify_google_credential(credential=data.credential, client_id=data.client_id)
    user, access_token, empresa = authenticate_or_link_social_user(
        db=db,
        oauth_info=oauth_info,
        client_ip=client_ip,
        user_agent=user_agent
    )

    nome_fantasia = empresa.nome_fantasia if empresa else "Plataforma LPTI Tech"

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        empresa_id=user.empresa_id,
        nome=user.nome,
        email=user.email,
        role=user.role,
        nome_fantasia=nome_fantasia
    )


@router.post("/microsoft", response_model=Token)
@limiter.limit("10/minute")
def login_microsoft(request: Request, data: MicrosoftAuthRequest, db: Session = Depends(get_db)):
    """
    Autentica ou vincula um usuário via Microsoft Identity Platform / Microsoft Entra ID.
    Valida o token via Microsoft Graph, confirma a titularidade do e-mail corporativo/pessoal,
    vincula a conta ao tenant correspondente e retorna a sessão autenticada.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    oauth_info = verify_microsoft_token(token=data.token, token_type=data.token_type or "access_token")
    user, access_token, empresa = authenticate_or_link_social_user(
        db=db,
        oauth_info=oauth_info,
        client_ip=client_ip,
        user_agent=user_agent
    )

    nome_fantasia = empresa.nome_fantasia if empresa else "Plataforma LPTI Tech"

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        empresa_id=user.empresa_id,
        nome=user.nome,
        email=user.email,
        role=user.role,
        nome_fantasia=nome_fantasia
    )


@router.get("/provedores", response_model=ProvedoresUsuarioResponse)
def listar_provedores_usuario(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Consulta quais métodos de acesso estão associados à conta do usuário autenticado:
    - Senha local cadastrada
    - Contas Google vinculadas
    - Contas Microsoft vinculadas
    """
    oauth_list = db.query(UserOAuthAccount).filter(UserOAuthAccount.user_id == current_user.id).all()
    
    provedores_resp = [
        ProvedorVinculadoResponse(
            id=o.id,
            provider=o.provider,
            email=o.email,
            name=o.name,
            picture_url=o.picture_url,
            created_at=o.created_at,
            last_login_at=o.last_login_at
        )
        for o in oauth_list
    ]

    return ProvedoresUsuarioResponse(
        has_password=bool(current_user.hashed_password),
        email=current_user.email,
        providers=provedores_resp
    )


@router.delete("/desvincular-provedor/{provider}")
def desvincular_provedor(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Desvincula um login social da conta.
    REGRA DE SEGURANÇA: Garante que o usuário possua ao menos outro método de acesso (senha local ou outro provedor).
    """
    provider_clean = provider.upper().strip()
    link = db.query(UserOAuthAccount).filter(
        UserOAuthAccount.user_id == current_user.id,
        UserOAuthAccount.provider == provider_clean
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum vínculo encontrado para o provedor '{provider_clean}'."
        )

    outros_links = db.query(UserOAuthAccount).filter(
        UserOAuthAccount.user_id == current_user.id,
        UserOAuthAccount.id != link.id
    ).count()

    if not current_user.hashed_password and outros_links == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desvincular seu único método de login sem antes cadastrar uma senha local ou outro provedor."
        )

    db.delete(link)
    db.commit()

    return {"message": f"Provedor {provider_clean} desvinculado com sucesso da sua conta."}


@router.get("/auditoria-login")
def listar_auditoria_login(
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Consulta o histórico de auditoria de acessos e logins do sistema (exclusivo para perfil MASTER).
    """
    registros = db.query(AuditoriaLogin).order_by(AuditoriaLogin.data_hora.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "email": r.email,
            "provider": r.provider,
            "sucesso": r.sucesso,
            "motivo_falha": r.motivo_falha,
            "ip": r.ip,
            "user_agent": r.user_agent,
            "empresa_id": r.empresa_id,
            "data_hora": r.data_hora.isoformat() if r.data_hora else None
        }
        for r in registros
    ]


@router.get("/me")
def get_me(
    x_empresa_id: Optional[str] = Header(None, alias="X-Empresa-ID"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    empresa_data = None
    target_empresa_id = user.empresa_id
    if user.role in [UserRole.MASTER, UserRole.CONSULTOR] and x_empresa_id:
        try:
            target_empresa_id = int(str(x_empresa_id).strip())
        except (ValueError, TypeError):
            pass

    if target_empresa_id:
        empresa = db.query(Empresa).filter(Empresa.id == target_empresa_id).first()
        if empresa:
            empresa_data = EmpresaResponse.model_validate(empresa)
    return {
        "user": UserResponse.model_validate(user),
        "empresa": empresa_data
    }


# ============================================================================
# FEATURE-001: RECUPERAÇÃO DE SENHA (COM PROTEÇÃO ANTI-ENUMERAÇÃO E AUDITORIA)
# ============================================================================

@router.post("/esqueci-senha", response_model=EsqueciSenhaResponse)
@limiter.limit("3/15minute")
def solicitar_recuperacao_senha(
    request: Request,
    data: EsqueciSenhaRequest,
    db: Session = Depends(get_db)
):
    """
    Solicita o link de redefinição de senha por e-mail com token temporário de 15 minutos.
    Protegido contra enumeração de usuários: a resposta é estritamente a mesma exista ou não o e-mail.
    Registra auditoria com IP e User-Agent.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]
    email_solicitado = data.email.lower().strip()

    user = db.query(User).filter(User.email == email_solicitado).first()

    if not user or not user.ativo:
        # Registra auditoria da tentativa com e-mail inexistente/inativo
        auditoria_falha = AuditoriaRecuperacaoSenha(
            user_id=None,
            email_solicitado=email_solicitado,
            evento="SOLICITACAO",
            sucesso=False,
            motivo_falha="E-mail inexistente ou usuário inativo",
            ip=client_ip,
            user_agent=user_agent,
            data_hora=datetime.utcnow()
        )
        db.add(auditoria_falha)
        db.commit()

        # Resposta idêntica para impedir enumeração de usuários
        return EsqueciSenhaResponse(mensagem=MENSAGEM_ANTI_ENUMERACAO)

    # 1. Invalida tokens anteriores não utilizados deste usuário
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.usado == False
    ).update({"usado": True, "usado_em": datetime.utcnow()})

    # 2. Gera novo token opaco criptográfico e armazena apenas seu hash SHA-256
    token_plano = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token_plano.encode("utf-8")).hexdigest()
    expira_em = datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)

    novo_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expira_em=expira_em,
        usado=False,
        created_at=datetime.utcnow()
    )
    db.add(novo_token)

    # 3. Registra auditoria de solicitação com sucesso
    auditoria_sucesso = AuditoriaRecuperacaoSenha(
        user_id=user.id,
        email_solicitado=user.email,
        evento="SOLICITACAO",
        sucesso=True,
        motivo_falha=None,
        ip=client_ip,
        user_agent=user_agent,
        data_hora=datetime.utcnow()
    )
    db.add(auditoria_sucesso)
    db.commit()

    # 4. Envia e-mail com link contendo o token_plano
    enviar_email_recuperacao(
        email_destinatario=user.email,
        nome_usuario=user.nome,
        token_plano=token_plano
    )

    return EsqueciSenhaResponse(mensagem=MENSAGEM_ANTI_ENUMERACAO)


@router.get("/validar-token-reset", response_model=ValidarTokenResetResponse)
@limiter.limit("10/minute")
def validar_token_reset(
    request: Request,
    token: str = Query(..., min_length=10),
    db: Session = Depends(get_db)
):
    """
    Valida se o token de redefinição é autêntico, está dentro da janela de 15 minutos e não foi reutilizado.
    Protegido com Rate Limiting estrito de 10 requisições por minuto por IP.
    """
    client_ip = request.client.host if request and request.client else None
    user_agent = (request.headers.get("user-agent", "")[:255]) if request else None

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    token_obj = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()

    if not token_obj or token_obj.usado or datetime.utcnow() > token_obj.expira_em:
        # Auditoria de tentativa com token inválido ou expirado
        motivo = "Token não encontrado" if not token_obj else ("Token já utilizado" if token_obj.usado else "Token expirado (>15 min)")
        audit_falha = AuditoriaRecuperacaoSenha(
            user_id=token_obj.user_id if token_obj else None,
            email_solicitado=token_obj.user.email if token_obj and token_obj.user else "desconhecido",
            evento="VALIDACAO_TOKEN",
            sucesso=False,
            motivo_falha=motivo,
            ip=client_ip,
            user_agent=user_agent,
            data_hora=datetime.utcnow()
        )
        db.add(audit_falha)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de redefinição expirado, inválido ou já utilizado. Por favor, solicite um novo link."
        )

    user = token_obj.user
    email_mascarado = _mascarar_email(user.email) if user else None

    return ValidarTokenResetResponse(
        valido=True,
        email_mascarado=email_mascarado,
        mensagem="Token válido para redefinição de senha."
    )


@router.post("/redefinir-senha", response_model=RedefinirSenhaResponse)
@limiter.limit("5/15minute")
def redefinir_senha(
    request: Request,
    data: RedefinirSenhaRequest,
    db: Session = Depends(get_db)
):
    """
    Conclui a redefinição de senha com validação de expiração e bloqueio absoluto de reutilização do token.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    token_hash = hashlib.sha256(data.token.encode("utf-8")).hexdigest()
    token_obj = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()

    if not token_obj or token_obj.usado or datetime.utcnow() > token_obj.expira_em:
        motivo = "Token não encontrado" if not token_obj else ("Token já utilizado" if token_obj.usado else "Token expirado (>15 min)")
        audit_falha = AuditoriaRecuperacaoSenha(
            user_id=token_obj.user_id if token_obj else None,
            email_solicitado=token_obj.user.email if token_obj and token_obj.user else "desconhecido",
            evento="REDEFINICAO_FALHA",
            sucesso=False,
            motivo_falha=motivo,
            ip=client_ip,
            user_agent=user_agent,
            data_hora=datetime.utcnow()
        )
        db.add(audit_falha)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de redefinição expirado, inválido ou já utilizado. Por favor, solicite um novo link."
        )

    user = db.query(User).filter(User.id == token_obj.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não localizado.")

    # 1. Atualiza a senha com hash seguro bcrypt
    user.hashed_password = hash_password(data.nova_senha)

    # 2. Marca o token como consumido para impedir qualquer reutilização
    token_obj.usado = True
    token_obj.usado_em = datetime.utcnow()

    # 3. Invalida quaisquer outros tokens pendentes deste usuário
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.usado == False
    ).update({"usado": True, "usado_em": datetime.utcnow()})

    # 4. Registra auditoria com sucesso
    audit_sucesso = AuditoriaRecuperacaoSenha(
        user_id=user.id,
        email_solicitado=user.email,
        evento="REDEFINICAO_SUCESSO",
        sucesso=True,
        motivo_falha=None,
        ip=client_ip,
        user_agent=user_agent,
        data_hora=datetime.utcnow()
    )
    db.add(audit_sucesso)
    db.commit()

    return RedefinirSenhaResponse(
        mensagem="Senha redefinida com sucesso! Você já pode entrar no sistema com sua nova senha."
    )


@router.get("/auditoria-recuperacao")
def listar_auditoria_recuperacao(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    master_user: User = Depends(require_master)
):
    """
    Consulta o histórico de auditoria de solicitações e redefinições de senha (acesso exclusivo MASTER).
    """
    registros = db.query(AuditoriaRecuperacaoSenha).order_by(
        AuditoriaRecuperacaoSenha.data_hora.desc()
    ).limit(limit).all()

    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "email_solicitado": r.email_solicitado,
            "evento": r.evento,
            "sucesso": r.sucesso,
            "motivo_falha": r.motivo_falha,
            "ip": r.ip,
            "user_agent": r.user_agent,
            "data_hora": r.data_hora.isoformat() if r.data_hora else None
        }
        for r in registros
    ]
