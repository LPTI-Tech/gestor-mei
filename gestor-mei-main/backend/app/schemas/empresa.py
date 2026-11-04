from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class EmpresaBase(BaseModel):
    nome_empresarial: str
    nome_fantasia: str
    cnpj: str
    cpf_proprietario: str
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: EmailStr
    limite_mei_anual: Optional[float] = 81000.00
    segmento: Optional[str] = "ALIMENTACAO"
    modulo_delivery: Optional[bool] = True
    modulo_motoboy: Optional[bool] = True
    modulo_ifood: Optional[bool] = True
    modulo_estoque: Optional[bool] = False
    permitir_estoque_negativo: Optional[bool] = True

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaCreateMaster(EmpresaBase):
    nome_owner: Optional[str] = None
    email_owner: Optional[EmailStr] = None
    senha_owner: Optional[str] = None

class TransferirPropriedadeRequest(BaseModel):
    novo_owner_user_id: int

class EmpresaUpdate(BaseModel):
    nome_empresarial: Optional[str] = None
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    cpf_proprietario: Optional[str] = None
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    limite_mei_anual: Optional[float] = None
    segmento: Optional[str] = None
    modulo_delivery: Optional[bool] = None
    modulo_motoboy: Optional[bool] = None
    modulo_ifood: Optional[bool] = None
    modulo_estoque: Optional[bool] = None
    permitir_estoque_negativo: Optional[bool] = None

class ModulosConfigUpdate(BaseModel):
    modulo_delivery: bool
    modulo_motoboy: bool
    modulo_ifood: bool
    modulo_estoque: bool
    permitir_estoque_negativo: Optional[bool] = None

class ConfiguracaoEstoqueUpdate(BaseModel):
    permitir_estoque_negativo: bool

class EmpresaResponse(EmpresaBase):
    id: int
    data_inicio_atividades: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
