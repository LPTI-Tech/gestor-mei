from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.models.empresa import Empresa
from app.models.user import User
from app.models.produto import Produto
from app.models.venda import Venda
from app.models.caixa import CaixaTurno, CaixaLancamento
from app.models.despesa import Despesa
from app.models.motoboy import Motoboy, EntregaMotoboy
from app.models.ifood import LancamentoIFood
from app.schemas.backup import BackupExportData, BackupStatusResponse
from app.dependencies import get_current_user, get_current_empresa, require_admin

router = APIRouter(prefix="/backup", tags=["Backup"])

@router.get("/status", response_model=BackupStatusResponse)
def get_backup_status(
    admin: User = Depends(require_admin),
    empresa: Empresa = Depends(get_current_empresa)
):
    return BackupStatusResponse(
        ultimo_backup_local=datetime.utcnow(),
        backup_google_drive_configurado=False,
        mensagem="Mecanismo de backup local ativo. Arquitetura para Google Drive preparada para integração futura."
    )


@router.get("/export")
def export_backup_local(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    empresa: Empresa = Depends(get_current_empresa)
):
    empresa_id = empresa.id
    
    # 1. Company Data
    empresa_dict = {
        "nome_empresarial": empresa.nome_empresarial,
        "nome_fantasia": empresa.nome_fantasia,
        "cnpj": empresa.cnpj,
        "cpf_proprietario": empresa.cpf_proprietario,
        "endereco": empresa.endereco,
        "telefone": empresa.telefone,
        "email": empresa.email,
        "limite_mei_anual": empresa.limite_mei_anual
    }
    
    # 2. Products
    produtos = db.query(Produto).filter(Produto.empresa_id == empresa_id).all()
    produtos_list = [
        {
            "nome": p.nome,
            "categoria": p.categoria,
            "preco_venda": p.preco_venda,
            "ativo": p.ativo
        } for p in produtos
    ]
    
    # 3. Vendas
    vendas = db.query(Venda).filter(Venda.empresa_id == empresa_id).all()
    vendas_list = [
        {
            "descricao_produto": v.descricao_produto,
            "quantidade": v.quantidade,
            "preco_unitario": v.preco_unitario,
            "valor_total": v.valor_total,
            "origem": v.origem,
            "forma_pagamento": v.forma_pagamento,
            "status": v.status,
            "observacoes": v.observacoes,
            "data_hora": v.data_hora.isoformat() if v.data_hora else None
        } for v in vendas
    ]
    
    # 4. Despesas
    despesas = db.query(Despesa).filter(Despesa.empresa_id == empresa_id).all()
    despesas_list = [
        {
            "data": d.data.isoformat() if d.data else None,
            "categoria": d.categoria,
            "descricao": d.descricao,
            "valor": d.valor,
            "forma_pagamento": d.forma_pagamento
        } for d in despesas
    ]
    
    # 5. Motoboys & Entregas
    motoboys = db.query(Motoboy).filter(Motoboy.empresa_id == empresa_id).all()
    motoboys_list = [
        {
            "nome": m.nome,
            "telefone": m.telefone,
            "valor_por_entrega": m.valor_por_entrega,
            "ativo": m.ativo
        } for m in motoboys
    ]
    
    # 6. iFood
    ifoods = db.query(LancamentoIFood).filter(LancamentoIFood.empresa_id == empresa_id).all()
    ifood_list = [
        {
            "data": i.data.isoformat() if i.data else None,
            "numero_pedido": i.numero_pedido,
            "valor_bruto": i.valor_bruto,
            "taxa_ifood": i.taxa_ifood,
            "valor_liquido": i.valor_liquido,
            "observacoes": i.observacoes
        } for i in ifoods
    ]
    
    backup_data = {
        "versao_sistema": "1.0.0",
        "data_backup": datetime.utcnow().isoformat(),
        "empresa": empresa_dict,
        "produtos": produtos_list,
        "vendas": vendas_list,
        "despesas": despesas_list,
        "motoboys": motoboys_list,
        "ifood": ifood_list
    }
    
    filename = f"Backup_GestorMEI_{empresa.cnpj.replace('.', '').replace('/', '').replace('-', '')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    return JSONResponse(
        content=backup_data,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/gdrive/sync")
def sync_gdrive_stub(admin: User = Depends(require_admin)):
    """
    Hook de integração futura com Google Drive API (OAuth 2.0).
    A arquitetura está preparada para sincronizar o arquivo de dump gerado.
    """
    return {
        "status": "ready_for_oauth",
        "mensagem": "Arquitetura pronta para autenticação Google Drive OAuth2."
    }
