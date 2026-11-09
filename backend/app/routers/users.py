from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.empresa_consultor import EmpresaConsultor
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserResetPasswordRequest,
    UserRoleUpdateRequest,
    VinculoConsultorCreate,
    VinculoConsultorResponse
)
from app.security import hash_password
from app.dependencies import (
    get_current_user,
    require_admin,
    require_owner_or_master,
    require_master
)

router = APIRouter(prefix="/users", tags=["Gestão de Usuários & RBAC"])


def _formatar_usuario_response(u: User) -> UserResponse:
    """Monta o schema de resposta com o nome do criador e nome da empresa preenchidos."""
    criador_nome = u.criador.nome if u.criador else None
    empresa_nome = u.empresa.nome_fantasia if u.empresa else None
    return UserResponse(
        id=u.id,
        empresa_id=u.empresa_id,
        empresa_nome=empresa_nome,
        nome=u.nome,
        email=u.email,
        role=u.role,
        ativo=u.ativo,
        created_at=u.created_at,
        ultimo_acesso=u.ultimo_acesso,
        criado_por_id=u.criado_por_id,
        criado_por_nome=criador_nome
    )


# ============================================================================
# 1. LISTAGEM DE USUÁRIOS
# ============================================================================

@router.get("", response_model=List[UserResponse])
def list_users(
    empresa_id: Optional[int] = Query(None, description="Filtrar por empresa (apenas para MASTER)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Lista os usuários da empresa.
    REGRA CRÍTICA: O perfil MASTER é da plataforma LPTI Tech e NUNCA aparece na lista comum de clientes!
    """
    query = db.query(User).filter(User.role != UserRole.MASTER)

    if current_user.role == UserRole.MASTER:
        if empresa_id is not None:
            query = query.filter(User.empresa_id == empresa_id)
        elif current_user.empresa_id is not None:
            query = query.filter(User.empresa_id == current_user.empresa_id)
        # Se for MASTER e empresa_id for omitido, retorna todos os usuários de empresas
    else:
        # Usuário OWNER ou operador: apenas usuários da própria empresa
        query = query.filter(User.empresa_id == current_user.empresa_id)

    users = query.order_by(User.created_at.asc()).all()
    return [_formatar_usuario_response(u) for u in users]


# ============================================================================
# 2. CRIAÇÃO DE USUÁRIOS
# ============================================================================

@router.post("", response_model=UserResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Cria um novo usuário na empresa.
    REGRAS DE RBAC:
    - Apenas MASTER pode criar usuários com perfil OWNER ou MASTER.
    - OWNER pode criar apenas OPERATOR ou vincular CONSULTOR.
    - Registra criado_por_id com o usuário atual.
    """
    # 1. Validação de perfil
    if data.role in [UserRole.OWNER, UserRole.MASTER]:
        if current_user.role != UserRole.MASTER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o perfil MASTER da plataforma pode criar novos proprietários (OWNER) ou MASTERs."
            )

    # 2. Verifica se e-mail já existe
    email_clean = data.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário cadastrado com este e-mail."
        )

    # 3. Define a empresa vinculada
    target_empresa_id = current_user.empresa_id
    if current_user.role == UserRole.MASTER:
        if data.empresa_id is not None:
            target_empresa_id = data.empresa_id
        elif data.role == UserRole.MASTER:
            target_empresa_id = None

    if target_empresa_id is None and data.role != UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe o ID da empresa para cadastrar este usuário."
        )

    # Se novo usuário for OWNER, rebaixa OWNERs anteriores da empresa para OPERATOR
    if data.role == UserRole.OWNER and target_empresa_id:
        db.query(User).filter(
            User.empresa_id == target_empresa_id,
            User.role == UserRole.OWNER
        ).update({"role": UserRole.OPERATOR})

    new_user = User(
        empresa_id=target_empresa_id,
        nome=data.nome,
        email=email_clean,
        hashed_password=hash_password(data.password),
        role=data.role,
        ativo=data.ativo,
        criado_por_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Se for perfil CONSULTOR e houver target_empresa_id, cria vínculo automático
    if new_user.role == UserRole.CONSULTOR and target_empresa_id:
        vinculo_existente = db.query(EmpresaConsultor).filter(
            EmpresaConsultor.empresa_id == target_empresa_id,
            EmpresaConsultor.user_id == new_user.id
        ).first()
        if not vinculo_existente:
            novo_vinculo = EmpresaConsultor(
                empresa_id=target_empresa_id,
                user_id=new_user.id,
                ativo=True,
                created_at=datetime.utcnow()
            )
            db.add(novo_vinculo)
            db.commit()

    return _formatar_usuario_response(new_user)


# ============================================================================
# 3. EDIÇÃO DE DADOS BÁSICOS DO USUÁRIO
# ============================================================================

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Atualiza informações do usuário (nome, e-mail, senha opcional).
    REGRAS DE RBAC:
    - OWNER não pode rebaixar a si mesmo nem promover terceiros para OWNER.
    - OWNER titular não pode ser desativado.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Verifica permissão de acesso à empresa
    if current_user.role != UserRole.MASTER and user.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Acesso não autorizado para usuários de outra empresa.")

    update_data = data.model_dump(exclude_unset=True)

    # Validação de alteração de perfil
    if "role" in update_data and update_data["role"] is not None:
        novo_role = update_data["role"]
        if novo_role != user.role:
            if current_user.role != UserRole.MASTER:
                if novo_role in [UserRole.OWNER, UserRole.MASTER]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="OWNER não pode promover outro usuário para OWNER. Apenas o perfil MASTER pode definir o proprietário."
                    )
                if user.role == UserRole.OWNER:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Apenas o perfil MASTER pode alterar o perfil do Proprietário (OWNER)."
                    )

    # Validação de desativação
    if "ativo" in update_data and update_data["ativo"] is False:
        if user.role == UserRole.OWNER and current_user.role != UserRole.MASTER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O Proprietário titular (OWNER) da empresa não pode ser desativado."
            )

    # Atualização de e-mail (garante unicidade)
    if "email" in update_data and update_data["email"]:
        novo_email = update_data["email"].lower().strip()
        if novo_email != user.email:
            email_dup = db.query(User).filter(User.email == novo_email, User.id != user_id).first()
            if email_dup:
                raise HTTPException(status_code=400, detail="Este e-mail já está em uso por outro usuário.")
            user.email = novo_email

    # Atualização de senha
    if "password" in update_data and update_data["password"]:
        user.hashed_password = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        if key not in ["email", "password"]:
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return _formatar_usuario_response(user)


# ============================================================================
# 4. REDEFINIÇÃO DE SENHA DIRETA (POR ADMIN/OWNER OU MASTER)
# ============================================================================

@router.put("/{user_id}/redefinir-senha")
def redefinir_senha_usuario(
    user_id: int,
    data: UserResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Redefine a senha de um usuário diretamente pela gestão interna da empresa.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if current_user.role != UserRole.MASTER and user.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Acesso não autorizado.")

    # Se for alterar a senha de um OWNER, apenas o próprio ou MASTER pode realizar
    if user.role == UserRole.OWNER and current_user.id != user.id and current_user.role != UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o próprio proprietário ou o perfil MASTER pode redefinir a senha do OWNER."
        )

    user.hashed_password = hash_password(data.nova_senha)
    db.commit()

    return {"message": f"Senha do usuário '{user.nome}' redefinida com sucesso."}


# ============================================================================
# 5. ALTERAÇÃO DE PERFIL / NÍVEL DE ACESSO
# ============================================================================

@router.put("/{user_id}/alterar-perfil", response_model=UserResponse)
def alterar_perfil_usuario(
    user_id: int,
    data: UserRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Altera o nível hierárquico do usuário na empresa.
    REGRAS:
    - Apenas MASTER pode definir ou remover o perfil OWNER ou MASTER.
    - OWNER só pode alternar entre OPERATOR e CONSULTOR.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if current_user.role != UserRole.MASTER and user.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Acesso não autorizado.")

    novo_role = data.novo_perfil
    if novo_role == user.role:
        return _formatar_usuario_response(user)

    if current_user.role != UserRole.MASTER:
        if novo_role in [UserRole.OWNER, UserRole.MASTER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="OWNER não pode promover outro usuário para OWNER. Apenas o perfil MASTER pode definir proprietários."
            )
        if user.role == UserRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o perfil MASTER pode alterar a titularidade do Proprietário (OWNER)."
            )

    if novo_role == UserRole.OWNER and user.empresa_id:
        db.query(User).filter(
            User.empresa_id == user.empresa_id,
            User.role == UserRole.OWNER,
            User.id != user.id
        ).update({"role": UserRole.OPERATOR})

    user.role = novo_role
    db.commit()
    db.refresh(user)
    return _formatar_usuario_response(user)


# ============================================================================
# 6. ATIVAR / DESATIVAR USUÁRIO
# ============================================================================

@router.put("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_status_usuario(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Alterna o status ativo/bloqueado do usuário.
    Bloqueia desativação do próprio usuário e do titular OWNER.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if current_user.role != UserRole.MASTER and user.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Acesso não autorizado.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode desativar sua própria conta em uso.")

    if user.role == UserRole.OWNER and current_user.role != UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O Proprietário titular (OWNER) da empresa não pode ser desativado."
        )

    user.ativo = not user.ativo
    db.commit()
    db.refresh(user)
    return _formatar_usuario_response(user)


# ============================================================================
# 7. EXCLUSÃO DE USUÁRIO
# ============================================================================

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Exclui um usuário da empresa.
    REGRAS:
    - Não pode excluir a si mesmo.
    - Não pode excluir o OWNER da empresa (proprietário).
    - Não pode excluir o perfil MASTER.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Você não pode excluir sua própria conta de administrador."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if current_user.role != UserRole.MASTER and user.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Acesso não autorizado.")

    if user.role == UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O Proprietário titular (OWNER) da empresa não pode ser excluído."
        )

    if user.role == UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário MASTER da plataforma não pode ser excluído por este canal."
        )

    # Remove vínculos de consultoria se houver
    db.query(EmpresaConsultor).filter(EmpresaConsultor.user_id == user_id).delete()

    db.delete(user)
    db.commit()
    return {"message": "Usuário excluído com sucesso."}


# ============================================================================
# 8. GESTÃO DE VÍNCULOS DE CONSULTORES POR EMPRESA
# ============================================================================

@router.get("/consultores/vinculados", response_model=List[VinculoConsultorResponse])
def listar_consultores_vinculados(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Lista todos os consultores vinculados à empresa atual.
    """
    vinculos = (
        db.query(EmpresaConsultor)
        .filter(EmpresaConsultor.empresa_id == current_user.empresa_id)
        .all()
    )

    resultados = []
    for v in vinculos:
        consultor = db.query(User).filter(User.id == v.user_id).first()
        empresa = db.query(Empresa).filter(Empresa.id == v.empresa_id).first()
        resultados.append(
            VinculoConsultorResponse(
                id=v.id,
                empresa_id=v.empresa_id,
                user_id=v.user_id,
                nome_consultor=consultor.nome if consultor else "Consultor",
                email_consultor=consultor.email if consultor else None,
                nome_empresa=empresa.nome_fantasia if empresa else "Empresa",
                ativo=v.ativo,
                created_at=v.created_at
            )
        )
    return resultados


@router.post("/consultores/vincular", response_model=VinculoConsultorResponse)
def vincular_consultor(
    data: VinculoConsultorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner_or_master)
):
    """
    Vincula um usuário com perfil CONSULTOR à empresa.
    """
    consultor = db.query(User).filter(User.id == data.user_id).first()
    if not consultor or consultor.role != UserRole.CONSULTOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O usuário informado não possui o perfil CONSULTOR."
        )

    target_empresa_id = current_user.empresa_id
    if current_user.role == UserRole.MASTER and data.empresa_id:
        target_empresa_id = data.empresa_id

    empresa = db.query(Empresa).filter(Empresa.id == target_empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    vinculo = db.query(EmpresaConsultor).filter(
        EmpresaConsultor.empresa_id == target_empresa_id,
        EmpresaConsultor.user_id == consultor.id
    ).first()

    if vinculo:
        vinculo.ativo = True
    else:
        vinculo = EmpresaConsultor(
            empresa_id=target_empresa_id,
            user_id=consultor.id,
            ativo=True,
            created_at=datetime.utcnow()
        )
        db.add(vinculo)

    db.commit()
    db.refresh(vinculo)

    return VinculoConsultorResponse(
        id=vinculo.id,
        empresa_id=vinculo.empresa_id,
        user_id=vinculo.user_id,
        nome_consultor=consultor.nome,
        email_consultor=consultor.email,
        nome_empresa=empresa.nome_fantasia,
        ativo=vinculo.ativo,
        created_at=vinculo.created_at
    )


@router.delete("/consultores/desvincular/{vinculo_id}")
def desvincular_consultor(
    vinculo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner_or_master)
):
    """
    Remove o vínculo de consultoria com a empresa.
    """
    vinculo = db.query(EmpresaConsultor).filter(EmpresaConsultor.id == vinculo_id).first()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo de consultor não encontrado.")

    if current_user.role != UserRole.MASTER and vinculo.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Acesso não autorizado.")

    db.delete(vinculo)
    db.commit()
    return {"message": "Vínculo de consultoria encerrado com sucesso."}
