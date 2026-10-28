from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.empresa import Empresa
from app.schemas.empresa import EmpresaResponse, EmpresaUpdate, ModulosConfigUpdate
from app.dependencies import get_current_empresa, require_admin

router = APIRouter(prefix="/empresa", tags=["Empresa"])

@router.get("", response_model=EmpresaResponse)
def get_empresa_info(empresa: Empresa = Depends(get_current_empresa)):
    return empresa

@router.put("", response_model=EmpresaResponse)
def update_empresa_info(
    data: EmpresaUpdate,
    empresa: Empresa = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    admin = Depends(require_admin)
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
    admin = Depends(require_admin)
):
    empresa.modulo_delivery = data.modulo_delivery
    empresa.modulo_motoboy = data.modulo_motoboy
    empresa.modulo_ifood = data.modulo_ifood
    empresa.modulo_estoque = data.modulo_estoque
    db.commit()
    db.refresh(empresa)
    return empresa
