from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ScoreCliente(str, Enum):
    SAUDAVEL = "SAUDAVEL"
    ATENCAO = "ATENCAO"
    CRITICO = "CRITICO"


class StatusDasCliente(str, Enum):
    EM_DIA = "Em dia"
    PENDENTE = "Pendente"
    ATRASADO = "Atrasado"


class UltimaCompraResumo(BaseModel):
    id: int
    numero_nota: str
    fornecedor_nome: str
    valor_total: float
    data: datetime

    class Config:
        from_attributes = True


class ClienteConsultorItemResponse(BaseModel):
    id: int
    nome_fantasia: str
    nome_empresarial: str
    cnpj: str
    telefone: Optional[str] = None
    email: Optional[str] = None
    segmento: Optional[str] = None
    
    # Status DAS
    status_das: str  # 'Em dia', 'Pendente', 'Atrasado'
    qtd_das_atrasados: int = 0
    das_vence_em_breve: bool = False
    
    # Limite MEI & Faturamento
    faturamento_anual: float = 0.0
    limite_mei_anual: float = 81000.00
    percentual_limite_mei: float = 0.0
    proximo_limite_mei: bool = False  # >= 80%
    estourou_limite_mei: bool = False  # > 100%
    
    # Estoque Crítico
    quantidade_produtos_criticos: int = 0
    produtos_criticos_nomes: List[str] = []
    
    # Última Compra Registrada
    ultima_compra: Optional[UltimaCompraResumo] = None
    
    # Score Geral da Saúde do Negócio
    score: ScoreCliente  # SAUDAVEL, ATENCAO, CRITICO
    score_motivo: str

    class Config:
        from_attributes = True


class ResumoConsultorResponse(BaseModel):
    total_clientes_ativos: int
    total_das_atrasado: int
    total_estoque_critico: int
    total_proximo_limite: int
    total_saudaveis: int
    total_atencao: int
    total_criticos: int

