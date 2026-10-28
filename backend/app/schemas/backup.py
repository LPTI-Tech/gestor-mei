from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class BackupExportData(BaseModel):
    versao_sistema: str
    data_backup: datetime
    empresa: Dict[str, Any]
    users: List[Dict[str, Any]]
    produtos: List[Dict[str, Any]]
    vendas: List[Dict[str, Any]]
    caixas: List[Dict[str, Any]]
    despesas: List[Dict[str, Any]]
    motoboys: List[Dict[str, Any]]
    ifood: List[Dict[str, Any]]

class BackupStatusResponse(BaseModel):
    ultimo_backup_local: Optional[datetime] = None
    backup_google_drive_configurado: bool = False
    mensagem: str
