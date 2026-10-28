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
    
    email: str = payload.get("sub")
    empresa_id: int = payload.get("empresa_id")
    
    if email is None or empresa_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais do token inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(
        User.email == email,
        User.empresa_id == empresa_id,
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
    empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa vinculada não encontrada.",
        )
    return empresa


def require_admin(
    user: User = Depends(get_current_user)
) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao Administrador.",
        )
    return user


def require_operador(
    user: User = Depends(get_current_user)
) -> User:
    # Both ADMIN and OPERADOR can access
    if user.role not in [UserRole.ADMIN, UserRole.OPERADOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado.",
        )
    return user
