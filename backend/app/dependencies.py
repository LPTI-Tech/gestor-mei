from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import decode_token
from app.models.user import User, UserRole
from app.models.empresa import Empresa

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária. Token não fornecido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: Optional[str] = payload.get("sub")
    empresa_id: Optional[int] = payload.get("empresa_id")
    role_str: Optional[str] = payload.get("role")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais do token inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Se o perfil for MASTER da plataforma, empresa_id pode ser None
    if role_str == "MASTER":
        user = db.query(User).filter(
            User.email == email,
            User.ativo == True
        ).first()
    else:
        # Usuários vinculados a empresa (OWNER, OPERATOR, CONSULTOR)
        if empresa_id is not None:
            user = db.query(User).filter(
                User.email == email,
                User.empresa_id == empresa_id,
                User.ativo == True
            ).first()
        else:
            user = db.query(User).filter(
                User.email == email,
                User.ativo == True
            ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_current_empresa(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Empresa:
    target_empresa_id = user.empresa_id
    if target_empresa_id is None:
        # MASTER sem empresa vinculada usa a primeira empresa disponível como contexto padrão
        empresa = db.query(Empresa).first()
    else:
        empresa = db.query(Empresa).filter(Empresa.id == target_empresa_id).first()

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa vinculada não encontrada.",
        )
    return empresa


def require_master(
    user: User = Depends(get_current_user)
) -> User:
    """Exige perfil MASTER da plataforma LPTI Tech."""
    if user.role != UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso exclusivo ao perfil MASTER da plataforma.",
        )
    return user


def require_owner(
    user: User = Depends(get_current_user)
) -> User:
    """Exige perfil OWNER (Proprietário) ou MASTER."""
    if user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.MASTER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao Proprietário (OWNER).",
        )
    return user


def require_owner_or_master(
    user: User = Depends(get_current_user)
) -> User:
    """Exige perfil OWNER ou MASTER."""
    if user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.MASTER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao Proprietário ou Administrador MASTER.",
        )
    return user


def require_admin(
    user: User = Depends(get_current_user)
) -> User:
    """Alias retrocompatível: OWNER e MASTER atuam como administradores."""
    return require_owner_or_master(user)


def require_operador(
    user: User = Depends(get_current_user)
) -> User:
    """Acesso para MASTER, OWNER ou OPERATOR."""
    if user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.MASTER, UserRole.OPERATOR, UserRole.OPERADOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado.",
        )
    return user


def require_consultor_or_admin(
    user: User = Depends(get_current_user)
) -> User:
    """Acesso para CONSULTOR, OWNER ou MASTER."""
    if user.role not in [UserRole.OWNER, UserRole.ADMIN, UserRole.MASTER, UserRole.CONSULTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a Consultores e Administradores.",
        )
    return user


def require_consultor(
    user: User = Depends(get_current_user)
) -> User:
    """Acesso para CONSULTOR ou MASTER."""
    if user.role not in [UserRole.CONSULTOR, UserRole.MASTER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao perfil Consultor.",
        )
    return user
