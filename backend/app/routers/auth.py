from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.schemas.user import UserResponse
from app.schemas.empresa import EmpresaResponse
from app.security import verify_password, hash_password, create_access_token
from app.dependencies import get_current_user, get_current_empresa

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/register", response_model=Token)
def register_empresa(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check if CNPJ already exists
    existing_empresa = db.query(Empresa).filter(Empresa.cnpj == data.cnpj).first()
    if existing_empresa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma empresa cadastrada com este CNPJ."
        )
    
    # Check if user email already exists
    existing_user = db.query(User).filter(User.email == data.email_usuario).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já está em uso por outro usuário."
        )
    
    # 1. Create Empresa
    empresa = Empresa(
        nome_empresarial=data.nome_empresarial,
        nome_fantasia=data.nome_fantasia,
        cnpj=data.cnpj,
        cpf_proprietario=data.cpf_proprietario,
        endereco=data.endereco,
        telefone=data.telefone,
        email=data.email_empresa
    )
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    
    # 2. Create Admin User
    admin_user = User(
        empresa_id=empresa.id,
        nome=data.nome_usuario,
        email=data.email_usuario,
        hashed_password=hash_password(data.password),
        role=UserRole.ADMIN,
        ativo=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    # Generate token
    token_payload = {
        "sub": admin_user.email,
        "empresa_id": empresa.id,
        "user_id": admin_user.id,
        "role": admin_user.role.value
    }
    access_token = create_access_token(token_payload)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=admin_user.id,
        empresa_id=empresa.id,
        nome=admin_user.nome,
        email=admin_user.email,
        role=admin_user.role,
        nome_fantasia=empresa.nome_fantasia
    )


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )
    
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Contate o administrador da sua empresa."
        )
    
    empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não localizada."
        )
    
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
        nome_fantasia=empresa.nome_fantasia
    )


@router.get("/me")
def get_me(
    user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa)
):
    return {
        "user": UserResponse.model_validate(user),
        "empresa": EmpresaResponse.model_validate(empresa)
    }
