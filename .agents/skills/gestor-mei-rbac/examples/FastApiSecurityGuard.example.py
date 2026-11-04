"""
FastAPI RBAC & Multi-tenant Security Guard Example
Implementação de referência para proteção de rotas no Gestor MEI.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole

def get_current_user(db: Session = Depends(get_db)):
    # Simulação da dependência de extração do JWT Bearer token
    ...

def require_roles(*allowed_roles: UserRole):
    """
    Injeção de dependência que valida se o usuário possui um dos papéis permitidos.
    Lança HTTPException 403 Forbidden caso contrário.
    """
    def role_validator(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado: Perfil '{current_user.role.value}' não possui permissão para acessar este recurso."
            )
        return current_user
    return role_validator

def verify_tenant_isolation(requested_empresa_id: int, current_user: User):
    """
    Garante que usuários comuns (OWNER, OPERATOR, CONSULTOR) não acessem dados de outro tenant.
    Apenas MASTER possui prerrogativa de chave mestre.
    """
    if current_user.role == UserRole.MASTER:
        return True
    
    if current_user.empresa_id != requested_empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Violação de segurança multiempresa: Tentativa de acesso a dados de outro tenant."
        )
    return True

