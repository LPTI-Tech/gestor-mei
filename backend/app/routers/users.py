from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.security import hash_password
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["Usuários"])

@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(User).filter(User.empresa_id == current_user.empresa_id).all()

@router.post("", response_model=UserResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Check if email exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário cadastrado com este e-mail."
        )
    
    new_user = User(
        empresa_id=current_user.empresa_id,
        nome=data.nome,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        ativo=data.ativo
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.empresa_id == current_user.empresa_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = hash_password(update_data.pop("password"))
    
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Você não pode excluir sua própria conta de administrador."
        )
    
    user = db.query(User).filter(
        User.id == user_id,
        User.empresa_id == current_user.empresa_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    db.delete(user)
    db.commit()
    return {"message": "Usuário excluído com sucesso."}
