from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.security import decode_token
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.empresa_consultor import EmpresaConsultor

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extrai e valida o usuário a partir do token Bearer JWT.
    Remove totalmente suporte a autenticação via Query String (?token=...), exigindo cabeçalho Authorization: Bearer.
    Valida vigência, emissor oficial (iss) e integridade de status e perfil.
    """
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
    
    # Validação do emissor oficial RFC 7519
    iss = payload.get("iss")
    if iss and iss != settings.JWT_ISSUER:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Emissor do token inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: Optional[int] = payload.get("user_id")
    email: Optional[str] = payload.get("sub")
    empresa_id: Optional[int] = payload.get("empresa_id")
    role_str: Optional[str] = payload.get("role")
    
    if not email and not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais do token inválidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user: Optional[User] = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário associado ao token não encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário inativo. Contate o suporte.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validação de integridade do perfil (role)
    user_role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_str and user_role_val != role_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais do token inválidas (perfil modificado).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_current_empresa(
    x_empresa_id: Optional[str] = Header(None, alias="X-Empresa-ID"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Empresa:
    """
    Resolve o contexto de tenant (Empresa) garantindo isolamento absoluto:
    - OWNER / OPERATOR: restrito estritamente a user.empresa_id. Se X-Empresa-ID divergir, retorna 403 Forbidden.
    - CONSULTOR: aceita X-Empresa-ID apenas se comprovado vínculo ativo em EmpresaConsultor (ou empresa primária).
    - MASTER: exige definição de contexto via X-Empresa-ID ou user.empresa_id (retorna 400 Bad Request se ausente).
    - ELIMINAÇÃO TOTAL de fallback genérico para a primeira empresa do banco.
    """
    parsed_header_id: Optional[int] = None
    if x_empresa_id is not None and str(x_empresa_id).strip() != "":
        try:
            parsed_header_id = int(str(x_empresa_id).strip())
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Identificador de empresa no cabeçalho 'X-Empresa-ID' inválido."
            )

    # 1. Perfil MASTER da plataforma
    if user.role == UserRole.MASTER:
        target_id = parsed_header_id or user.empresa_id
        if not target_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Perfil MASTER deve especificar a empresa de contexto através do cabeçalho 'X-Empresa-ID'."
            )
        empresa = db.query(Empresa).filter(Empresa.id == target_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Empresa ID {target_id} não encontrada."
            )
        return empresa

    # 2. Perfil CONSULTOR
    if user.role == UserRole.CONSULTOR:
        target_id = parsed_header_id or user.empresa_id
        if not target_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Consultor deve especificar o cabeçalho 'X-Empresa-ID' para selecionar a empresa de atendimento."
            )

        # Validação de autorização relacional
        tem_vinculo = db.query(EmpresaConsultor).filter(
            EmpresaConsultor.empresa_id == target_id,
            EmpresaConsultor.user_id == user.id,
            EmpresaConsultor.ativo == True
        ).first()

        if not tem_vinculo and user.empresa_id != target_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Consultor não possui autorização para acessar esta empresa."
            )

        empresa = db.query(Empresa).filter(Empresa.id == target_id).first()
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não encontrada."
            )
        if not empresa.ativo:
            motivo_txt = f": {empresa.motivo_bloqueio}" if empresa.motivo_bloqueio else "."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Empresa suspensa temporariamente pela administração{motivo_txt}"
            )
        return empresa

    # 3. Perfis vinculados estritamente à sua empresa (OWNER, OPERATOR, ADMIN)
    if parsed_header_id is not None and parsed_header_id != user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado a dados de outra empresa."
        )

    if not user.empresa_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não possui empresa vinculada."
        )

    empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa vinculada não encontrada."
        )
    if not empresa.ativo:
        motivo_txt = f": {empresa.motivo_bloqueio}" if empresa.motivo_bloqueio else "."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Empresa suspensa temporariamente pela administração{motivo_txt}"
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
