import io
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.database import get_db
from app.models.venda import Venda, ItemVenda
from app.models.empresa import Empresa
from app.models.user import User
from app.schemas.relatorio_mei import (
    RelatorioMeiResponse,
    MesMeiItem,
    FormaPagamentoReceitaItem,
    CanalReceitaItem
)
from app.dependencies import get_current_user, get_current_empresa

router = APIRouter(prefix="/relatorio-mei", tags=["Relatório MEI"])

MESES_NOMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

@router.get("", response_model=RelatorioMeiResponse)
def get_relatorio_mei(
    ano: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa)
):
    target_ano = ano if ano else date.today().year
    limite_anual = empresa.limite_mei_anual or 81000.00
    
    # 1. Monthly data
    meses_data = []
    acumulado = 0.0
    meses_com_venda = 0
    total_anual_produtos = 0.0
    total_anual_servicos = 0.0
    
    for m in range(1, 13):
        m_start = datetime(target_ano, m, 1)
        if m == 12:
            m_end = datetime(target_ano + 1, 1, 1)
        else:
            m_end = datetime(target_ano, m + 1, 1)
            
        # Vendas de Produtos (Comércio): itens de produto + vendas legadas sem itens
        item_prod = db.query(func.coalesce(func.sum(ItemVenda.subtotal), 0.0)).join(
            Venda, ItemVenda.venda_id == Venda.id
        ).filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            ItemVenda.tipo_item == "PRODUTO",
            Venda.data_hora >= m_start,
            Venda.data_hora < m_end
        ).scalar()
        
        legacy_prod = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            Venda.tipo_item == "PRODUTO",
            ~Venda.itens.any(),
            Venda.data_hora >= m_start,
            Venda.data_hora < m_end
        ).scalar()
        fat_prod = round(float(item_prod) + float(legacy_prod), 2)
        
        # Vendas de Serviços (ISS): itens de serviço + vendas legadas sem itens
        item_serv = db.query(func.coalesce(func.sum(ItemVenda.subtotal), 0.0)).join(
            Venda, ItemVenda.venda_id == Venda.id
        ).filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            ItemVenda.tipo_item == "SERVICO",
            Venda.data_hora >= m_start,
            Venda.data_hora < m_end
        ).scalar()
        
        legacy_serv = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            Venda.tipo_item == "SERVICO",
            ~Venda.itens.any(),
            Venda.data_hora >= m_start,
            Venda.data_hora < m_end
        ).scalar()
        fat_serv = round(float(item_serv) + float(legacy_serv), 2)
        
        # Quantidade de vendas no mês
        qtd_mes = db.query(func.count(Venda.id)).filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            Venda.data_hora >= m_start,
            Venda.data_hora < m_end
        ).scalar() or 0
        
        fat_mes = round(fat_prod + fat_serv, 2)
        tkt = round(fat_mes / qtd_mes, 2) if qtd_mes > 0 else 0.0
        
        acumulado = round(acumulado + fat_mes, 2)
        total_anual_produtos = round(total_anual_produtos + fat_prod, 2)
        total_anual_servicos = round(total_anual_servicos + fat_serv, 2)
        
        if fat_mes > 0:
            meses_com_venda += 1
            
        meses_data.append(MesMeiItem(
            mes_num=m,
            mes_nome=MESES_NOMES[m - 1],
            faturamento_produtos=fat_prod,
            faturamento_servicos=fat_serv,
            faturamento_total=fat_mes,
            qtd_vendas=qtd_mes,
            ticket_medio=tkt,
            acumulado_ate_o_mes=acumulado
        ))
        
    faturamento_ano = acumulado
    restante = max(0.0, round(limite_anual - faturamento_ano, 2))
    pct_utilizado = round((faturamento_ano / limite_anual) * 100, 2) if limite_anual > 0 else 0.0
    
    # Projeção anual
    mes_atual = date.today().month if target_ano == date.today().year else 12
    meses_base = max(1, min(mes_atual, 12))
    media_mensal = round(faturamento_ano / meses_base, 2)
    projecao_anual = round(media_mensal * 12, 2)
    
    # Status do enquadramento MEI
    if pct_utilizado <= 70.0:
        status_enquadramento = "SEGURO"
        msg = f"Seu faturamento acumulado (R$ {faturamento_ano:,.2f}) está dentro da zona segura (utilizou {pct_utilizado}% do limite MEI de R$ {limite_anual:,.2f})."
    elif pct_utilizado <= 85.0:
        status_enquadramento = "ATENÇÃO"
        msg = f"Atenção: você já atingiu {pct_utilizado}% do limite MEI anual. Faltam R$ {restante:,.2f} para o teto."
    elif pct_utilizado <= 100.0:
        status_enquadramento = "ALERTA"
        msg = f"ALERTA MÁXIMO: você utilizou {pct_utilizado}% do limite MEI. Restam apenas R$ {restante:,.2f} antes de estourar o limite anual."
    elif pct_utilizado <= 120.0:
        status_enquadramento = "EXCEDIDO_ATE_20"
        msg = f"Limite MEI ultrapassado em até 20% ({pct_utilizado}%). Você precisará recolher DAS complementar sobre o excesso no ano seguinte."
    else:
        status_enquadramento = "DESENQUADRAMENTO"
        msg = f"Limite MEI ultrapassado em mais de 20% ({pct_utilizado}%). Desenquadramento retroativo obrigatório pelo Simples Nacional."
        
    # Receita por forma de pagamento no ano
    start_y = datetime(target_ano, 1, 1)
    end_y = datetime(target_ano + 1, 1, 1)
    
    formas = ["Dinheiro", "PIX", "Débito", "Crédito"]
    receita_formas = []
    for f in formas:
        v = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            Venda.forma_pagamento == f,
            Venda.data_hora >= start_y,
            Venda.data_hora < end_y
        ).scalar()
        val = round(float(v), 2)
        pct = round(val / faturamento_ano * 100, 1) if faturamento_ano > 0 else 0.0
        receita_formas.append(FormaPagamentoReceitaItem(forma=f, valor=val, percentual=pct))
        
    # Receita por canal no ano
    canais = ["Balcão", "WhatsApp", "Delivery Próprio", "iFood", "Telefone", "Outros"]
    receita_canais = []
    for c in canais:
        v = db.query(func.coalesce(func.sum(Venda.valor_total), 0.0)).filter(
            Venda.empresa_id == empresa.id,
            Venda.status == "Concluída",
            Venda.origem == c,
            Venda.data_hora >= start_y,
            Venda.data_hora < end_y
        ).scalar()
        val = round(float(v), 2)
        pct = round(val / faturamento_ano * 100, 1) if faturamento_ano > 0 else 0.0
        receita_canais.append(CanalReceitaItem(canal=c, valor=val, percentual=pct))
        
    return RelatorioMeiResponse(
        ano=target_ano,
        limite_mei_anual=limite_anual,
        limite_proporcional=limite_anual,
        faturamento_acumulado_ano=faturamento_ano,
        faturamento_restante=restante,
        percentual_utilizado=pct_utilizado,
        media_mensal=media_mensal,
        projecao_anual=projecao_anual,
        status_enquadramento=status_enquadramento,
        mensagem_status=msg,
        meses=meses_data,
        receita_por_forma_pagamento=receita_formas,
        receita_por_canal=receita_canais,
        nome_empresarial=empresa.nome_empresarial,
        nome_fantasia=empresa.nome_fantasia,
        cnpj=empresa.cnpj,
        cpf_proprietario=empresa.cpf_proprietario
    )


@router.get("/pdf")
def export_relatorio_mei_pdf(
    ano: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa)
):
    relatorio = get_relatorio_mei(ano, db, current_user, empresa)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1976D2'),
        alignment=1,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#555555'),
        alignment=1,
        spaceAfter=15
    )
    section_title = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0D47A1'),
        spaceBefore=12,
        spaceAfter=6
    )
    cell_bold = ParagraphStyle('CellBold', parent=styles['Normal'], fontSize=9, leading=11, fontName='Helvetica-Bold')
    cell_normal = ParagraphStyle('CellNorm', parent=styles['Normal'], fontSize=9, leading=11)
    
    # Header
    elements.append(Paragraph(f"GESTOR MEI - DECLARAÇÃO ANUAL DO MEI (DASN-SIMEI)", title_style))
    elements.append(Paragraph(f"Ano-Calendário: <b>{relatorio.ano}</b> | Emitido em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}", subtitle_style))
    elements.append(Spacer(1, 8))
    
    # Empresa Box
    empresa_data = [
        [Paragraph(f"<b>Razão Social:</b> {relatorio.nome_empresarial}", cell_normal), Paragraph(f"<b>CNPJ:</b> {relatorio.cnpj}", cell_normal)],
        [Paragraph(f"<b>Nome Fantasia:</b> {relatorio.nome_fantasia}", cell_normal), Paragraph(f"<b>CPF Titular:</b> {relatorio.cpf_proprietario}", cell_normal)]
    ]
    t_empresa = Table(empresa_data, colWidths=[270, 270])
    t_empresa.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F6F8')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#B0BEC5')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_empresa)
    elements.append(Spacer(1, 12))
    
    # Resumo MEI
    elements.append(Paragraph("1. Resumo do Enquadramento e Faturamento", section_title))
    
    resumo_data = [
        [
            Paragraph("<b>Limite Anual MEI</b>", cell_bold),
            Paragraph(f"R$ {relatorio.limite_mei_anual:,.2f}", cell_normal),
            Paragraph("<b>Faturamento Acumulado</b>", cell_bold),
            Paragraph(f"<b>R$ {relatorio.faturamento_acumulado_ano:,.2f}</b>", cell_normal)
        ],
        [
            Paragraph("<b>Limite Restante</b>", cell_bold),
            Paragraph(f"R$ {relatorio.faturamento_restante:,.2f}", cell_normal),
            Paragraph("<b>Percentual Utilizado</b>", cell_bold),
            Paragraph(f"<b>{relatorio.percentual_utilizado}%</b>", cell_normal)
        ],
        [
            Paragraph("<b>Média Mensal</b>", cell_bold),
            Paragraph(f"R$ {relatorio.media_mensal:,.2f}", cell_normal),
            Paragraph("<b>Projeção Anual</b>", cell_bold),
            Paragraph(f"R$ {relatorio.projecao_anual:,.2f}", cell_normal)
        ]
    ]
    t_resumo = Table(resumo_data, colWidths=[135, 135, 135, 135])
    t_resumo.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CFD8DC')),
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_resumo)
    elements.append(Spacer(1, 12))
    
    # Monthly Breakdown Table
    elements.append(Paragraph("2. Demonstrativo Mensal de Receita Bruta (Art. 68 Resolução CGSN nº 140/2018)", section_title))
    
    table_meses = [
        [
            Paragraph("<b>Mês</b>", cell_bold),
            Paragraph("<b>Receita Bruta (Produtos)</b>", cell_bold),
            Paragraph("<b>Receita Bruta (Serviços)</b>", cell_bold),
            Paragraph("<b>Total do Mês (R$)</b>", cell_bold),
            Paragraph("<b>Acumulado no Ano (R$)</b>", cell_bold)
        ]
    ]
    
    tot_prod = sum(m.faturamento_produtos for m in relatorio.meses)
    tot_serv = sum(m.faturamento_servicos for m in relatorio.meses)
    
    for m in relatorio.meses:
        table_meses.append([
            Paragraph(m.mes_nome, cell_normal),
            Paragraph(f"R$ {m.faturamento_produtos:,.2f}", cell_normal),
            Paragraph(f"R$ {m.faturamento_servicos:,.2f}", cell_normal),
            Paragraph(f"<b>R$ {m.faturamento_total:,.2f}</b>", cell_normal),
            Paragraph(f"R$ {m.acumulado_ate_o_mes:,.2f}", cell_normal)
        ])
        
    table_meses.append([
        Paragraph("<b>TOTAL DO ANO</b>", cell_bold),
        Paragraph(f"<b>R$ {tot_prod:,.2f}</b>", cell_bold),
        Paragraph(f"<b>R$ {tot_serv:,.2f}</b>", cell_bold),
        Paragraph(f"<b>R$ {relatorio.faturamento_acumulado_ano:,.2f}</b>", cell_bold),
        Paragraph(f"<b>R$ {relatorio.faturamento_acumulado_ano:,.2f}</b>", cell_bold)
    ])
    
    t_meses = Table(table_meses, colWidths=[100, 110, 110, 110, 110])
    t_meses.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1976D2')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CFD8DC')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#E3F2FD')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_meses)
    elements.append(Spacer(1, 15))
    
    # Declaratory sign box
    elements.append(Paragraph("<b>Declaração do Responsável:</b>", cell_bold))
    elements.append(Paragraph("Declaro sob as penas da lei que os valores acima informados correspondem à totalidade da receita bruta auferida no período.", cell_normal))
    elements.append(Spacer(1, 30))
    
    sign_table = Table([
        [Paragraph("________________________________________<br/>Assinatura do MEI / Representante Legal", cell_normal),
         Paragraph(f"Data: ______/______/___________<br/>Local: {empresa.endereco or '___________________'}", cell_normal)]
    ], colWidths=[270, 270])
    elements.append(sign_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Relatorio_MEI_{relatorio.ano}_{empresa.cnpj.replace('.', '').replace('/', '').replace('-', '')}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/excel")
def export_relatorio_mei_excel(
    ano: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    empresa: Empresa = Depends(get_current_empresa)
):
    relatorio = get_relatorio_mei(ano, db, current_user, empresa)
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"DASN-SIMEI {relatorio.ano}"
    
    # Title
    ws.merge_cells("A1:E1")
    ws["A1"] = f"GESTOR MEI - RELATÓRIO ANUAL DO MEI ({relatorio.ano})"
    ws["A1"].font = openpyxl.styles.Font(bold=True, size=14, color="0D47A1")
    
    ws["A2"] = f"Empresa: {relatorio.nome_fantasia} ({relatorio.nome_empresarial})"
    ws["A3"] = f"CNPJ: {relatorio.cnpj} | CPF: {relatorio.cpf_proprietario}"
    
    ws["A5"] = "Limite Anual MEI:"
    ws["B5"] = relatorio.limite_mei_anual
    ws["A6"] = "Faturamento Acumulado:"
    ws["B6"] = relatorio.faturamento_acumulado_ano
    ws["A7"] = "Limite Restante:"
    ws["B7"] = relatorio.faturamento_restante
    ws["A8"] = "Percentual Utilizado:"
    ws["B8"] = f"{relatorio.percentual_utilizado}%"
    
    # Table headers
    headers = ["Mês", "Receita Comércio/Produtos (R$)", "Receita Serviços (R$)", "Total Mês (R$)", "Acumulado Ano (R$)"]
    row_idx = 10
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=row_idx, column=col_idx, value=h)
        cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
        cell.fill = openpyxl.styles.PatternFill("solid", fgColor="1976D2")
        
    tot_prod = sum(m.faturamento_produtos for m in relatorio.meses)
    tot_serv = sum(m.faturamento_servicos for m in relatorio.meses)
    
    for m in relatorio.meses:
        row_idx += 1
        ws.cell(row=row_idx, column=1, value=m.mes_nome)
        ws.cell(row=row_idx, column=2, value=m.faturamento_produtos)
        ws.cell(row=row_idx, column=3, value=m.faturamento_servicos)
        ws.cell(row=row_idx, column=4, value=m.faturamento_total)
        ws.cell(row=row_idx, column=5, value=m.acumulado_ate_o_mes)
        
    row_idx += 1
    ws.cell(row=row_idx, column=1, value="TOTAL ANUAL").font = openpyxl.styles.Font(bold=True)
    ws.cell(row=row_idx, column=2, value=tot_prod).font = openpyxl.styles.Font(bold=True)
    ws.cell(row=row_idx, column=3, value=tot_serv).font = openpyxl.styles.Font(bold=True)
    ws.cell(row=row_idx, column=4, value=relatorio.faturamento_acumulado_ano).font = openpyxl.styles.Font(bold=True)
    ws.cell(row=row_idx, column=5, value=relatorio.faturamento_acumulado_ano).font = openpyxl.styles.Font(bold=True)
    
    # Column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 14)
        
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    filename = f"Relatorio_MEI_{relatorio.ano}.xlsx"
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
