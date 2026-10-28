from typing import List, Optional
from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.venda import Venda, ItemVenda
from app.models.produto import Produto
from app.models.cliente import Cliente
from app.models.regiao_entrega import RegiaoEntrega
from app.models.motoboy import Motoboy, EntregaMotoboy
from app.models.caixa import CaixaTurno
from app.models.empresa import Empresa
from app.models.user import User
from app.models.estoque import MovimentacaoEstoque
from app.schemas.venda import (
    VendaCreate,
    VendaResponse,
    ItemVendaResponse,
    VendaStatusPedidoUpdate,
    VendaVincularMotoboy,
    ComandaImpressaoResponse
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/vendas", tags=["Vendas & Pedidos"])


def _format_venda_response(v: Venda) -> VendaResponse:
    c_nome = v.cliente.nome if v.cliente else None
    c_tel = v.cliente.telefone if v.cliente else None
    regiao_nome = v.regiao_entrega.nome if v.regiao_entrega else None
    motoboy_nome = v.motoboy.nome if v.motoboy else None
    num_ped = v.numero_pedido or f"PED-{v.id:04d}"
    
    itens_resp = [
        ItemVendaResponse(
            id=it.id,
            venda_id=it.venda_id,
            produto_id=it.produto_id,
            descricao=it.descricao,
            tipo_item=it.tipo_item,
            quantidade=it.quantidade,
            preco_unitario=it.preco_unitario,
            subtotal=it.subtotal,
            observacoes=it.observacoes
        )
        for it in (v.itens or [])
    ]
    
    desc_prod = v.descricao_produto
    if not desc_prod and itens_resp:
        if len(itens_resp) == 1:
            desc_prod = itens_resp[0].descricao
        else:
            desc_prod = f"{itens_resp[0].descricao} + {len(itens_resp) - 1} item(ns)"

    return VendaResponse(
        id=v.id,
        empresa_id=v.empresa_id,
        cliente_id=v.cliente_id,
        cliente_nome=c_nome,
        cliente_telefone=c_tel,
        user_id=v.user_id,
        caixa_turno_id=v.caixa_turno_id,
        # Pedidos & Entrega
        numero_pedido=num_ped,
        tipo_pedido=v.tipo_pedido or "BALCAO",
        status_pedido=v.status_pedido or ("Cancelado" if v.status == "Cancelada" else "Recebido"),
        regiao_entrega_id=v.regiao_entrega_id,
        regiao_entrega_nome=regiao_nome,
        taxa_entrega=v.taxa_entrega or 0.0,
        motoboy_id=v.motoboy_id,
        motoboy_nome=motoboy_nome,
        taxa_motoboy=v.taxa_motoboy or 0.0,
        endereco_entrega=v.endereco_entrega,
        data_entrega=v.data_entrega,
        # Valores
        valor_subtotal=v.valor_subtotal or (v.valor_total - (v.taxa_entrega or 0.0)),
        desconto=v.desconto or 0.0,
        valor_total=v.valor_total,
        origem=v.origem,
        forma_pagamento=v.forma_pagamento,
        status=v.status,
        observacoes=v.observacoes,
        tipo_item=v.tipo_item,
        data_hora=v.data_hora,
        created_at=v.created_at,
        itens=itens_resp,
        descricao_produto=desc_prod,
        quantidade=v.quantidade or (sum(i.quantidade for i in itens_resp) if itens_resp else 1.0),
        preco_unitario=v.preco_unitario or 0.0
    )


@router.get("", response_model=List[VendaResponse])
def list_vendas(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    cliente_id: Optional[int] = None,
    tipo_pedido: Optional[str] = None,
    status_pedido: Optional[str] = None,
    motoboy_id: Optional[int] = None,
    regiao_entrega_id: Optional[int] = None,
    origem: Optional[str] = None,
    forma_pagamento: Optional[str] = None,
    status_venda: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Venda).filter(Venda.empresa_id == current_user.empresa_id)
    
    if data_inicio:
        dt_start = datetime.combine(data_inicio, time.min)
        query = query.filter(Venda.data_hora >= dt_start)
    if data_fim:
        dt_end = datetime.combine(data_fim, time.max)
        query = query.filter(Venda.data_hora <= dt_end)
        
    if cliente_id:
        query = query.filter(Venda.cliente_id == cliente_id)
        
    if tipo_pedido and tipo_pedido != "Todos":
        query = query.filter(Venda.tipo_pedido == tipo_pedido)

    if status_pedido and status_pedido != "Todos":
        query = query.filter(Venda.status_pedido == status_pedido)

    if motoboy_id:
        query = query.filter(Venda.motoboy_id == motoboy_id)

    if regiao_entrega_id:
        query = query.filter(Venda.regiao_entrega_id == regiao_entrega_id)
        
    if origem and origem != "Todas":
        query = query.filter(Venda.origem == origem)
        
    if forma_pagamento and forma_pagamento != "Todas":
        query = query.filter(Venda.forma_pagamento == forma_pagamento)
        
    if status_venda and status_venda != "Todos":
        query = query.filter(Venda.status == status_venda)
        
    vendas = query.order_by(desc(Venda.data_hora)).limit(limit).all()
    return [_format_venda_response(v) for v in vendas]


@router.get("/{venda_id}", response_model=VendaResponse)
def get_venda(
    venda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    venda = db.query(Venda).filter(
        Venda.id == venda_id,
        Venda.empresa_id == current_user.empresa_id
    ).first()
    
    if not venda:
        raise HTTPException(status_code=404, detail="Venda/Pedido não encontrado.")
        
    return _format_venda_response(venda)


@router.post("", response_model=VendaResponse, status_code=status.HTTP_201_CREATED)
def create_venda(
    data: VendaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Active Cash Shift
    active_caixa = db.query(CaixaTurno).filter(
        CaixaTurno.empresa_id == current_user.empresa_id,
        CaixaTurno.status == "ABERTO"
    ).order_by(desc(CaixaTurno.data_abertura)).first()
    
    caixa_id = active_caixa.id if active_caixa else None
    sale_dt = data.data_hora if data.data_hora else datetime.utcnow()

    # 2. Check Client & Inherit Address
    cliente = None
    if data.cliente_id:
        cliente = db.query(Cliente).filter(
            Cliente.id == data.cliente_id,
            Cliente.empresa_id == current_user.empresa_id
        ).first()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente informado não encontrado.")

    # 3. Check Region & Delivery Fee
    taxa_entrega = round(float(data.taxa_entrega or 0.0), 2)
    regiao_id = data.regiao_entrega_id
    if regiao_id:
        regiao = db.query(RegiaoEntrega).filter(
            RegiaoEntrega.id == regiao_id,
            RegiaoEntrega.empresa_id == current_user.empresa_id
        ).first()
        if not regiao:
            raise HTTPException(status_code=404, detail="Região de entrega não encontrada.")
        if taxa_entrega <= 0.0:
            taxa_entrega = regiao.taxa_entrega
    elif cliente and cliente.regiao_id and data.tipo_pedido == "ENTREGA":
        regiao_id = cliente.regiao_id
        if taxa_entrega <= 0.0 and cliente.regiao:
            taxa_entrega = cliente.regiao.taxa_entrega

    # 4. Check Motoboy & Fee
    taxa_motoboy = round(float(data.taxa_motoboy or 0.0), 2)
    motoboy = None
    if data.motoboy_id:
        motoboy = db.query(Motoboy).filter(
            Motoboy.id == data.motoboy_id,
            Motoboy.empresa_id == current_user.empresa_id
        ).first()
        if not motoboy:
            raise HTTPException(status_code=404, detail="Motoboy não encontrado.")
        if taxa_motoboy <= 0.0:
            taxa_motoboy = motoboy.valor_por_entrega

    # 5. Delivery Address fallback
    endereco_entrega = data.endereco_entrega
    if not endereco_entrega and cliente:
        endereco_entrega = cliente.endereco

    # 6. Process items and calculate totals automatically
    itens_para_criar = []
    has_servico = False
    has_produto = False
    
    if data.itens and len(data.itens) > 0:
        subtotal_acumulado = 0.0
        for item_data in data.itens:
            item_tipo = item_data.tipo_item or "PRODUTO"
            preco_unit = float(item_data.preco_unitario or 0.0)
            descricao = item_data.descricao
            
            if item_data.produto_id:
                prod = db.query(Produto).filter(
                    Produto.id == item_data.produto_id,
                    Produto.empresa_id == current_user.empresa_id
                ).first()
                if prod:
                    item_tipo = prod.tipo
                    if preco_unit <= 0:
                        preco_unit = prod.preco_venda
                    if not descricao:
                        descricao = prod.nome

            item_subtotal = round(float(item_data.quantidade) * preco_unit, 2)
            subtotal_acumulado += item_subtotal
            
            if item_tipo == "SERVICO":
                has_servico = True
            else:
                has_produto = True

            itens_para_criar.append({
                "produto_id": item_data.produto_id,
                "descricao": descricao,
                "tipo_item": item_tipo,
                "quantidade": float(item_data.quantidade),
                "preco_unitario": preco_unit,
                "subtotal": item_subtotal,
                "observacoes": item_data.observacoes
            })
            
        valor_subtotal = round(subtotal_acumulado, 2)
        desconto = round(float(data.desconto or 0.0), 2)
        valor_total = max(0.0, round(valor_subtotal + taxa_entrega - desconto, 2))
        
    else:
        # Fallback to single item
        preco_unit = float(data.preco_unitario or 0.0)
        qtd = float(data.quantidade or 1.0)
        val_total = float(data.valor_total or 0.0)
        
        if val_total <= 0 and preco_unit > 0:
            val_total = round(qtd * preco_unit, 2)
        elif preco_unit <= 0 and val_total > 0 and qtd > 0:
            preco_unit = round(val_total / qtd, 2)
            
        descricao = data.descricao_produto or "Venda Diversa / Refeição"
        tipo = data.tipo_item or "PRODUTO"
        
        if data.produto_id:
            prod = db.query(Produto).filter(
                Produto.id == data.produto_id,
                Produto.empresa_id == current_user.empresa_id
            ).first()
            if prod:
                tipo = prod.tipo
                if not data.descricao_produto:
                    descricao = prod.nome
                    
        valor_subtotal = val_total
        desconto = round(float(data.desconto or 0.0), 2)
        valor_total = max(0.0, round(valor_subtotal + taxa_entrega - desconto, 2))
        
        if tipo == "SERVICO":
            has_servico = True
        else:
            has_produto = True
            
        itens_para_criar.append({
            "produto_id": data.produto_id,
            "descricao": descricao,
            "tipo_item": tipo,
            "quantidade": qtd,
            "preco_unitario": preco_unit,
            "subtotal": valor_subtotal,
            "observacoes": None
        })

    # Predominant sale type
    if has_servico and has_produto:
        venda_tipo = "MISTO"
    elif has_servico:
        venda_tipo = "SERVICO"
    else:
        venda_tipo = "PRODUTO"

    if len(itens_para_criar) == 1:
        resumo_desc = itens_para_criar[0]["descricao"]
        resumo_qtd = itens_para_criar[0]["quantidade"]
        resumo_preco = itens_para_criar[0]["preco_unitario"]
        resumo_prod_id = itens_para_criar[0]["produto_id"]
    else:
        resumo_desc = f"{itens_para_criar[0]['descricao']} + {len(itens_para_criar) - 1} item(ns)"
        resumo_qtd = sum(it["quantidade"] for it in itens_para_criar)
        resumo_preco = round(valor_subtotal / resumo_qtd, 2) if resumo_qtd > 0 else 0.0
        resumo_prod_id = None

    tipo_ped = data.tipo_pedido or ("ENTREGA" if data.origem in ["WhatsApp", "Delivery Próprio", "iFood"] else "BALCAO")
    status_ped = data.status_pedido or "Recebido"

    venda = Venda(
        empresa_id=current_user.empresa_id,
        cliente_id=data.cliente_id,
        user_id=current_user.id,
        caixa_turno_id=caixa_id,
        tipo_pedido=tipo_ped,
        status_pedido=status_ped,
        regiao_entrega_id=regiao_id,
        taxa_entrega=taxa_entrega,
        motoboy_id=data.motoboy_id,
        taxa_motoboy=taxa_motoboy,
        endereco_entrega=endereco_entrega,
        valor_subtotal=valor_subtotal,
        desconto=desconto,
        valor_total=valor_total,
        origem=data.origem,
        forma_pagamento=data.forma_pagamento,
        status=data.status or "Concluída",
        observacoes=data.observacoes,
        tipo_item=venda_tipo,
        data_hora=sale_dt,
        produto_id=resumo_prod_id,
        descricao_produto=resumo_desc,
        quantidade=resumo_qtd,
        preco_unitario=resumo_preco
    )
    db.add(venda)
    db.flush()

    # Generate sequential order number if not set
    venda.numero_pedido = data.numero_pedido or f"PED-{venda.id:04d}"

    # Create ItemVenda records and automatically deduct stock for products
    for it in itens_para_criar:
        item_obj = ItemVenda(
            venda_id=venda.id,
            produto_id=it["produto_id"],
            descricao=it["descricao"],
            tipo_item=it["tipo_item"],
            quantidade=it["quantidade"],
            preco_unitario=it["preco_unitario"],
            subtotal=it["subtotal"],
            observacoes=it["observacoes"]
        )
        db.add(item_obj)

        # Baixa automática de estoque
        if it["produto_id"] and it["tipo_item"] == "PRODUTO":
            prod_est = db.query(Produto).filter(
                Produto.id == it["produto_id"],
                Produto.empresa_id == current_user.empresa_id
            ).first()
            if prod_est:
                prod_est.quantidade_estoque = float(prod_est.quantidade_estoque or 0.0) - float(it["quantidade"])
                mov_venda = MovimentacaoEstoque(
                    empresa_id=current_user.empresa_id,
                    produto_id=prod_est.id,
                    tipo="SAIDA",
                    quantidade=float(it["quantidade"]),
                    motivo=f"Venda {venda.numero_pedido or f'PED-{venda.id:04d}'}",
                    usuario_id=current_user.id,
                    data_movimentacao=sale_dt,
                    observacao=f"Baixa automática via PDV ({venda.origem})"
                )
                db.add(mov_venda)

    # If motoboy linked, also register in EntregaMotoboy table
    if data.motoboy_id and taxa_motoboy > 0:
        entrega_rec = EntregaMotoboy(
            empresa_id=current_user.empresa_id,
            motoboy_id=data.motoboy_id,
            data_hora=sale_dt,
            numero_pedido=venda.numero_pedido,
            valor_entrega=taxa_motoboy,
            status_pagamento="PENDENTE",
            observacoes=f"Pedido de {venda.origem} para {endereco_entrega or 'Cliente'}"
        )
        db.add(entrega_rec)

    db.commit()
    db.refresh(venda)
    return _format_venda_response(venda)


@router.put("/{venda_id}/status-pedido", response_model=VendaResponse)
def update_status_pedido(
    venda_id: int,
    data: VendaStatusPedidoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    venda = db.query(Venda).filter(
        Venda.id == venda_id,
        Venda.empresa_id == current_user.empresa_id
    ).first()
    
    if not venda:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    valid_statuses = ["Recebido", "Em Preparo", "Saiu para Entrega", "Entregue", "Cancelado"]
    if data.status_pedido not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status inválido. Escolha entre: {valid_statuses}")

    venda.status_pedido = data.status_pedido

    if data.status_pedido == "Entregue":
        venda.data_entrega = datetime.utcnow()
    elif data.status_pedido == "Cancelado":
        venda.status = "Cancelada"

    db.commit()
    db.refresh(venda)
    return _format_venda_response(venda)


@router.put("/{venda_id}/vincular-motoboy", response_model=VendaResponse)
def vincular_motoboy(
    venda_id: int,
    data: VendaVincularMotoboy,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    venda = db.query(Venda).filter(
        Venda.id == venda_id,
        Venda.empresa_id == current_user.empresa_id
    ).first()
    
    if not venda:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    motoboy = db.query(Motoboy).filter(
        Motoboy.id == data.motoboy_id,
        Motoboy.empresa_id == current_user.empresa_id
    ).first()

    if not motoboy:
        raise HTTPException(status_code=404, detail="Motoboy não encontrado.")

    taxa = data.taxa_motoboy if data.taxa_motoboy is not None else motoboy.valor_por_entrega

    venda.motoboy_id = motoboy.id
    venda.taxa_motoboy = round(float(taxa), 2)

    # Sync or create EntregaMotoboy
    entrega_existente = db.query(EntregaMotoboy).filter(
        EntregaMotoboy.empresa_id == current_user.empresa_id,
        EntregaMotoboy.numero_pedido == venda.numero_pedido
    ).first()

    if entrega_existente:
        entrega_existente.motoboy_id = motoboy.id
        entrega_existente.valor_entrega = venda.taxa_motoboy
    else:
        nova_entrega = EntregaMotoboy(
            empresa_id=current_user.empresa_id,
            motoboy_id=motoboy.id,
            numero_pedido=venda.numero_pedido or f"PED-{venda.id:04d}",
            valor_entrega=venda.taxa_motoboy,
            status_pagamento="PENDENTE",
            observacoes=f"Pedido delivery para {venda.endereco_entrega or 'Cliente'}"
        )
        db.add(nova_entrega)

    db.commit()
    db.refresh(venda)
    return _format_venda_response(venda)


@router.put("/{venda_id}/cancelar", response_model=VendaResponse)
def cancel_venda(
    venda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    venda = db.query(Venda).filter(
        Venda.id == venda_id,
        Venda.empresa_id == current_user.empresa_id
    ).first()
    
    if not venda:
        raise HTTPException(status_code=404, detail="Venda/Pedido não encontrado.")
        
    if venda.status != "Cancelada":
        # Estorno automático de estoque para produtos
        for it in venda.itens:
            if it.produto_id and it.tipo_item == "PRODUTO":
                prod_est = db.query(Produto).filter(
                    Produto.id == it.produto_id,
                    Produto.empresa_id == current_user.empresa_id
                ).first()
                if prod_est:
                    prod_est.quantidade_estoque = float(prod_est.quantidade_estoque or 0.0) + float(it.quantidade)
                    mov_estorno = MovimentacaoEstoque(
                        empresa_id=current_user.empresa_id,
                        produto_id=prod_est.id,
                        tipo="ENTRADA",
                        quantidade=float(it.quantidade),
                        motivo=f"Estorno Venda {venda.numero_pedido or f'PED-{venda.id:04d}'}",
                        usuario_id=current_user.id,
                        data_movimentacao=datetime.utcnow(),
                        observacao="Estorno automático por cancelamento de venda"
                    )
                    db.add(mov_estorno)

    venda.status = "Cancelada"
    venda.status_pedido = "Cancelado"
    db.commit()
    db.refresh(venda)
    return _format_venda_response(venda)


@router.get("/{venda_id}/comanda-texto", response_model=ComandaImpressaoResponse)
def get_comanda_impressao(
    venda_id: int,
    largura: int = Query(default=48, description="Largura de colunas da bobina: 48 para 80mm ou 32 para 58mm"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gera layout de comanda pré-formatado para impressoras térmicas ESC/POS (58mm e 80mm).
    Preparado para integração futura com drivers USB, Spooler do Windows ou envio via socket/RawBT.
    """
    venda = db.query(Venda).filter(
        Venda.id == venda_id,
        Venda.empresa_id == current_user.empresa_id
    ).first()
    
    if not venda:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    empresa = db.query(Empresa).filter(Empresa.id == current_user.empresa_id).first()

    cols = 48 if largura >= 40 else 32
    sep = "=" * cols
    dash = "-" * cols

    lines = []
    # Header
    lines.append(sep)
    lines.append(f"{empresa.nome_fantasia[:cols].center(cols)}")
    if empresa.nome_empresarial and empresa.nome_empresarial != empresa.nome_fantasia:
        lines.append(f"{empresa.nome_empresarial[:cols].center(cols)}")
    if empresa.cnpj:
        lines.append(f"CNPJ: {empresa.cnpj}".center(cols))
    if empresa.telefone:
        lines.append(f"Tel/Zap: {empresa.telefone}".center(cols))
    lines.append(sep)

    # Order info
    num_ped = venda.numero_pedido or f"PED-{venda.id:04d}"
    lines.append(f"PEDIDO: {num_ped}".ljust(cols // 2) + f"TIPO: {venda.tipo_pedido}".rjust(cols // 2))
    lines.append(f"DATA: {venda.data_hora.strftime('%d/%m/%Y %H:%M')}".ljust(cols))
    lines.append(f"STATUS: {venda.status_pedido.upper()}".ljust(cols))
    lines.append(dash)

    # Customer & Logistics
    if venda.cliente:
        lines.append(f"CLIENTE: {venda.cliente.nome[:cols - 9]}")
        if venda.cliente.telefone:
            lines.append(f"FONE: {venda.cliente.telefone}")
    else:
        lines.append("CLIENTE: BALCAO (NAO IDENTIFICADO)")

    if venda.tipo_pedido == "ENTREGA":
        if venda.regiao_entrega:
            lines.append(f"REGIAO: {venda.regiao_entrega.nome}")
        if venda.endereco_entrega:
            lines.append(f"ENDERECO: {venda.endereco_entrega}")
        if venda.motoboy:
            lines.append(f"MOTOBOY: {venda.motoboy.nome}")

    lines.append(dash)
    # Items
    header_itens = "QTD  DESCRICAO".ljust(cols - 10) + "TOTAL".rjust(10)
    lines.append(header_itens)
    lines.append(dash)

    if venda.itens and len(venda.itens) > 0:
        for it in venda.itens:
            qtd_str = f"{it.quantidade:.0f}x" if it.quantidade.is_integer() else f"{it.quantidade:.1f}x"
            desc_str = f"{qtd_str} {it.descricao}"
            tot_str = f"R$ {it.subtotal:.2f}"
            if len(desc_str) > cols - 12:
                lines.append(desc_str[:cols])
                lines.append("".rjust(cols - 12) + tot_str.rjust(12))
            else:
                lines.append(desc_str.ljust(cols - 12) + tot_str.rjust(12))
            if it.observacoes:
                lines.append(f"  * Obs: {it.observacoes}"[:cols])
    else:
        lines.append(f"1x {venda.descricao_produto}".ljust(cols - 12) + f"R$ {venda.valor_total:.2f}".rjust(12))

    lines.append(dash)
    # Totals
    lines.append("SUBTOTAL:".ljust(cols - 14) + f"R$ {venda.valor_subtotal:.2f}".rjust(14))
    if venda.taxa_entrega > 0:
        lines.append("TAXA ENTREGA:".ljust(cols - 14) + f"+ R$ {venda.taxa_entrega:.2f}".rjust(14))
    if venda.desconto > 0:
        lines.append("DESCONTO:".ljust(cols - 14) + f"- R$ {venda.desconto:.2f}".rjust(14))
    lines.append("=" * cols)
    lines.append("TOTAL A PAGAR:".ljust(cols - 14) + f"R$ {venda.valor_total:.2f}".rjust(14))
    lines.append(f"FORMA DE PAGAMENTO: {venda.forma_pagamento}".center(cols))
    lines.append("=" * cols)

    if venda.observacoes:
        lines.append("OBSERVACOES:")
        lines.append(f"{venda.observacoes}"[:cols * 2])
        lines.append(dash)

    lines.append("Obrigado pela preferencia!".center(cols))
    lines.append("GESTOR MEI - Sistema de Gestao".center(cols))
    lines.append("\n\n")  # Feed for paper cut

    comanda_texto = "\n".join(lines)
    return ComandaImpressaoResponse(
        venda_id=venda.id,
        numero_pedido=num_ped,
        comanda_texto=comanda_texto,
        largura_colunas=cols
    )
