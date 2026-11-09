import logging
import requests
from datetime import datetime
from typing import Dict, Any, Tuple, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.user_oauth import UserOAuthAccount
from app.models.login_audit import AuditoriaLogin
from app.security import create_access_token

logger = logging.getLogger("gestor_mei.oauth")

def verify_google_credential(credential: str, client_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Valida a credencial (ID Token) do Google emitida pelo Google Identity Services (GIS).
    Utiliza o endpoint oficial de validação criptográfica do Google (tokeninfo)
    garantindo verificação de assinatura, validade temporal e confirmação de e-mail verificado.
    Suporta mock em ambiente de desenvolvimento/testes para execução autônoma.
    """
    clean_cred = credential.strip()
    
    # 1. Suporte a Mock em Desenvolvimento para testes unitários automatizados
    if settings.is_development and clean_cred.startswith("mock-google-"):
        parts = clean_cred.replace("mock-google-", "").split(":")
        sub = parts[0] if len(parts) > 1 else f"google_mock_{parts[0]}"
        email = parts[1] if len(parts) > 1 else parts[0]
        return {
            "provider": "GOOGLE",
            "provider_user_id": sub,
            "email": email.lower().strip(),
            "name": f"Google User ({email})",
            "picture_url": None,
            "email_verified": True
        }

    # 2. Chamada ao endpoint oficial do Google Identity
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={clean_cred}"
        resp = requests.get(url, timeout=10)
    except Exception as e:
        logger.error(f"[OAUTH GOOGLE] Falha de comunicação com Google: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível validar o login com o Google. Verifique sua conexão com a internet."
        )

    if resp.status_code != 200:
        logger.warning(f"[OAUTH GOOGLE] Token inválido ou expirado. Status: {resp.status_code}, Resposta: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação do Google inválido, expirado ou revogado."
        )

    data = resp.json()

    # 3. Verificação de integridade de e-mail (Segurança Obrigatória)
    email_verified = data.get("email_verified")
    if str(email_verified).lower() not in ("true", "1"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O endereço de e-mail associado à conta Google não foi verificado pelo Google."
        )

    # 4. Verificação de audiência (Client ID) se configurado
    expected_client_id = client_id or settings.GOOGLE_CLIENT_ID
    if expected_client_id and data.get("aud") != expected_client_id:
        logger.warning(f"[OAUTH GOOGLE] Client ID divergente. Esperado: {expected_client_id}, Recebido: {data.get('aud')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A credencial do Google foi gerada para outra aplicação (Client ID não corresponde)."
        )

    return {
        "provider": "GOOGLE",
        "provider_user_id": data["sub"],
        "email": data["email"].lower().strip(),
        "name": data.get("name"),
        "picture_url": data.get("picture"),
        "email_verified": True
    }


def verify_microsoft_token(token: str, token_type: str = "access_token") -> Dict[str, Any]:
    """
    Valida o token da Microsoft Identity Platform / Microsoft Entra ID.
    - Se access_token: consulta a API Microsoft Graph (https://graph.microsoft.com/v1.0/me).
    - Suporta mock em ambiente de desenvolvimento/testes.
    """
    clean_token = token.strip()

    # 1. Suporte a Mock em Desenvolvimento para testes unitários automatizados
    if settings.is_development and clean_token.startswith("mock-microsoft-"):
        parts = clean_token.replace("mock-microsoft-", "").split(":")
        sub = parts[0] if len(parts) > 1 else f"ms_mock_{parts[0]}"
        email = parts[1] if len(parts) > 1 else parts[0]
        return {
            "provider": "MICROSOFT",
            "provider_user_id": sub,
            "email": email.lower().strip(),
            "name": f"Microsoft User ({email})",
            "picture_url": None,
            "email_verified": True
        }

    # 2. Chamada ao Microsoft Graph
    headers = {"Authorization": f"Bearer {clean_token}"}
    try:
        resp = requests.get("https://graph.microsoft.com/v1.0/me", headers=headers, timeout=10)
    except Exception as e:
        logger.error(f"[OAUTH MICROSOFT] Falha de comunicação com Microsoft Graph: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível validar o login com a Microsoft. Verifique sua conexão com a internet."
        )

    if resp.status_code != 200:
        logger.warning(f"[OAUTH MICROSOFT] Token inválido ou expirado. Status: {resp.status_code}, Resposta: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token da conta Microsoft inválido, expirado ou não autorizado."
        )

    data = resp.json()
    email = (data.get("mail") or data.get("userPrincipalName", "")).lower().strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível identificar o e-mail da sua conta Microsoft. Conceda permissão de leitura de perfil."
        )

    return {
        "provider": "MICROSOFT",
        "provider_user_id": data["id"],
        "email": email,
        "name": data.get("displayName"),
        "picture_url": None,
        "email_verified": True
    }


def authenticate_or_link_social_user(
    db: Session,
    oauth_info: Dict[str, Any],
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Tuple[User, str, Optional[Empresa]]:
    """
    Executa o fluxo completo de autenticação e vinculação de provedor social (ENTREGA 3, 4 e 5):
    1. Verifica se a conta social já está vinculada (provider + provider_user_id).
    2. Se não estiver, localiza usuário pelo e-mail e vincula automaticamente (Vinculação de Contas).
    3. Se o e-mail não existir no sistema, bloqueia com 403 amigável (garantindo isolamento multiempresa e provisionamento pelo MASTER/OWNER).
    4. Registra auditoria completa em auditoria_login.
    5. Emite JWT com isolamento de tenant.
    """
    provider = oauth_info["provider"]
    provider_uid = oauth_info["provider_user_id"]
    email = oauth_info["email"]
    name = oauth_info.get("name")
    picture_url = oauth_info.get("picture_url")

    # 1. Busca vínculo existente
    oauth_record = db.query(UserOAuthAccount).filter(
        UserOAuthAccount.provider == provider,
        UserOAuthAccount.provider_user_id == provider_uid
    ).first()

    user: Optional[User] = None

    if oauth_record:
        user = oauth_record.user
        if not user:
            # Registro órfão
            audit = AuditoriaLogin(
                user_id=None,
                email=email,
                provider=provider,
                sucesso=False,
                motivo_falha="Vínculo órfão (usuário deletado)",
                ip=client_ip,
                user_agent=user_agent
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Conta de usuário não encontrada para este login social."
            )

        if not user.ativo:
            audit = AuditoriaLogin(
                user_id=user.id,
                email=email,
                provider=provider,
                sucesso=False,
                motivo_falha="Usuário inativo",
                ip=client_ip,
                user_agent=user_agent,
                empresa_id=user.empresa_id
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário inativo. Contate o administrador da sua empresa."
            )

        # Atualiza último login social
        oauth_record.last_login_at = datetime.utcnow()
        if picture_url and not oauth_record.picture_url:
            oauth_record.picture_url = picture_url
        user.ultimo_acesso = datetime.utcnow()

        audit = AuditoriaLogin(
            user_id=user.id,
            email=email,
            provider=provider,
            sucesso=True,
            motivo_falha=None,
            ip=client_ip,
            user_agent=user_agent,
            empresa_id=user.empresa_id
        )
        db.add(audit)
        db.commit()

    else:
        # 2. Não possui vínculo por UID. Verifica se o e-mail já existe na base de usuários
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # E-mail não pertence a nenhuma empresa cadastrada
            audit = AuditoriaLogin(
                user_id=None,
                email=email,
                provider=provider,
                sucesso=False,
                motivo_falha="E-mail não vinculado a nenhum tenant cadastrado",
                ip=client_ip,
                user_agent=user_agent
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Nenhuma conta vinculada ao e-mail '{email}'. Solicite ao administrador da sua empresa ou à LPTI Tech o provisionamento do seu acesso."
            )

        if not user.ativo:
            audit = AuditoriaLogin(
                user_id=user.id,
                email=email,
                provider=provider,
                sucesso=False,
                motivo_falha="Usuário inativo",
                ip=client_ip,
                user_agent=user_agent,
                empresa_id=user.empresa_id
            )
            db.add(audit)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário inativo. Contate o administrador da sua empresa."
            )

        # ENTREGA 5: Vincula o provedor à conta existente do usuário
        existing_provider_link = db.query(UserOAuthAccount).filter(
            UserOAuthAccount.user_id == user.id,
            UserOAuthAccount.provider == provider
        ).first()

        if existing_provider_link:
            existing_provider_link.provider_user_id = provider_uid
            existing_provider_link.email = email
            existing_provider_link.name = name or existing_provider_link.name
            existing_provider_link.picture_url = picture_url or existing_provider_link.picture_url
            existing_provider_link.last_login_at = datetime.utcnow()
        else:
            new_oauth = UserOAuthAccount(
                user_id=user.id,
                provider=provider,
                provider_user_id=provider_uid,
                email=email,
                name=name,
                picture_url=picture_url,
                email_verified=True,
                created_at=datetime.utcnow(),
                last_login_at=datetime.utcnow()
            )
            db.add(new_oauth)

        user.ultimo_acesso = datetime.utcnow()

        audit = AuditoriaLogin(
            user_id=user.id,
            email=email,
            provider=provider,
            sucesso=True,
            motivo_falha="VINCULACAO_AUTOMATICA",
            ip=client_ip,
            user_agent=user_agent,
            empresa_id=user.empresa_id
        )
        db.add(audit)
        db.commit()

    # 3. Resolve empresa e gera token Bearer
    empresa: Optional[Empresa] = None
    nome_fantasia = "Plataforma LPTI Tech"
    if user.empresa_id is not None:
        empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
        if empresa:
            nome_fantasia = empresa.nome_fantasia

    token_payload = {
        "sub": user.email,
        "empresa_id": user.empresa_id,
        "user_id": user.id,
        "role": user.role.value
    }
    access_token = create_access_token(token_payload)

    return user, access_token, empresa
