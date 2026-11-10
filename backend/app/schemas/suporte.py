from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SessaoSuporteIniciar(BaseModel):
    empresa_id: int


class SessaoSuporteEncerrar(BaseModel):
    empresa_id: Optional[int] = None


class AcaoSuporteCreate(BaseModel):
    empresa_id: int
    acao: str
    detalhes: Optional[str] = None


class AuditoriaSuporteResponse(BaseModel):
    id: int
    master_id: Optional[int] = None
    master_email: str
    master_nome: Optional[str] = None
    empresa_id: int
    empresa_nome: Optional[str] = None
    empresa_cnpj: Optional[str] = None
    acao: str
    detalhes: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    data_hora: datetime

    model_config = ConfigDict(from_attributes=True)
