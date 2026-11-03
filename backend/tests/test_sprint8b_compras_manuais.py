import pytest
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.produto import Produto
from app.models.fornecedor import Fornecedor
from app.models.estoque import MovimentacaoEstoque
from app.schemas.compras import CompraManualCreate, ItemCompraManualCreate
from app.routers.compras import (
    criar_compra_manual,
    listar_compras,
    obter_detalhes_compra,
    listar_sugestoes_fornecedores,
    get_resumo_compras,
)
from fastapi import HTTPException


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def owner(db):
    user = db.query(User).filter(User.email == "admin@gestormei.com.br").first()
    assert user is not None
    return user


@pytest.fixture
def operator(db):
    user = db.query(User).filter(User.email == "operador@gestormei.com.br").first()
    assert user is not None
    return user


@pytest.fixture
def empresa(db, owner):
    emp = db.query(Empresa).filter(Empresa.id == owner.empresa_id).first()
    assert emp is not None
    return emp


import io
from fastapi import UploadFile

def test_1_sugestoes_fornecedores(db, owner, empresa):
    """Verifica se o endpoint de sugestões de fornecedores retorna lista com sucesso."""
    fornecedores = listar_sugestoes_fornecedores(db=db, current_user=owner, empresa=empresa)
    assert isinstance(fornecedores, list)


def test_1b_upload_comprovante_valido_e_invalido(owner, empresa):
    """Valida upload direto de arquivo e bloqueio de extensões não suportadas."""
    from app.routers.compras import upload_comprovante_compra

    # Teste com arquivo válido (PDF)
    pdf_bytes = io.BytesIO(b"%PDF-1.4 mock pdf data")
    upload_ok = UploadFile(file=pdf_bytes, filename="recibo.pdf")
    res_ok = upload_comprovante_compra(file=upload_ok, current_user=owner, empresa=empresa)
    assert res_ok.url.startswith("/uploads/comprovantes/")
    assert res_ok.tipo == "PDF"

    # Teste com arquivo inválido (.txt)
    txt_bytes = io.BytesIO(b"arquivo invalido")
    upload_err = UploadFile(file=txt_bytes, filename="arquivo.txt")
    with pytest.raises(HTTPException) as exc_info:
        upload_comprovante_compra(file=upload_err, current_user=owner, empresa=empresa)
    assert exc_info.value.status_code == 400
    assert "não suportado" in exc_info.value.detail.lower()


def test_2_lancamento_compra_manual_estoque_e_custo(db, owner, empresa):
    """
    Testa fluxo completo de Compra Manual:
    - Cria produto de teste com estoque inicial e custo
    - Lança compra manual com fator de conversão (2 caixas x fator 6 = 12 unidades)
    - Verifica aumento de estoque e atualização de custo unitário
    - Verifica registro de movimentação de estoque
    - Verifica auto-cadastro do novo fornecedor
    """
    # 1. Cria produto de teste
    prod = Produto(
        empresa_id=empresa.id,
        nome="Queijo Mussarela Peça Sprint 8B",
        tipo="PRODUTO",
        categoria="Insumos",
        preco_venda=45.0,
        custo_unitario=20.0,
        quantidade_estoque=5.0,
        estoque_minimo=2.0,
        ativo=True,
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    prod_id = prod.id

    # 2. Lança compra manual
    compra_payload = CompraManualCreate(
        fornecedor_nome="Distribuidora Laticínios Aliança Ltda",
        fornecedor_cnpj_cpf="12.345.678/0001-99",
        fornecedor_telefone="(11) 98765-4321",
        fornecedor_uf="SP",
        fornecedor_cidade="São Paulo",
        numero_documento="REC-98765",
        serie="MAN",
        data_emissao="2026-11-03",
        forma_pagamento="PIX",
        observacao="Compra manual de insumos para estoque da semana",
        anexo_url="/uploads/comprovantes/recibo_teste.pdf",
        anexo_nome="recibo_teste.pdf",
        anexo_tipo="PDF",
        itens=[
            ItemCompraManualCreate(
                produto_id=prod_id,
                quantidade=2.0,
                unidade="CX",
                fator_conversao=6.0,
                valor_unitario=60.0,
                valor_total=120.0,
                atualizar_custo=True,
            )
        ],
    )

    compra_data = criar_compra_manual(dados=compra_payload, db=db, current_user=owner, empresa=empresa)
    assert compra_data.sucesso is True
    assert compra_data.numero_documento == "REC-98765"
    assert compra_data.valor_total == 120.0

    # 3. Verifica atualização no produto
    db.refresh(prod)
    # Saldo inicial (5.0) + entrada de 12.0 = 17.0
    assert prod.quantidade_estoque == 17.0
    # Custo novo = R$ 60.0 / 6 = R$ 10.0
    assert prod.custo_unitario == 10.0

    # 4. Verifica se o fornecedor foi persistido na tabela fornecedores
    fornecedores = listar_sugestoes_fornecedores(db=db, current_user=owner, empresa=empresa)
    assert any("Distribuidora Laticínios Aliança" in f.nome for f in fornecedores)

    # 5. Verifica se a movimentação de estoque foi registrada
    movs = (
        db.query(MovimentacaoEstoque)
        .filter(MovimentacaoEstoque.produto_id == prod_id)
        .order_by(MovimentacaoEstoque.id.desc())
        .all()
    )
    assert len(movs) >= 1
    ultima_mov = movs[0]
    assert ultima_mov.tipo == "ENTRADA"
    assert ultima_mov.quantidade == 12.0
    assert ultima_mov.motivo == "Compra Manual"


def test_3_reutilizacao_de_fornecedor_existente(db, owner, empresa):
    """Verifica que cadastrar outra compra com o mesmo fornecedor não gera duplicidade."""
    # Conta fornecedores antes
    forns_antes = listar_sugestoes_fornecedores(db=db, current_user=owner, empresa=empresa)
    count_antes = len([f for f in forns_antes if "Distribuidora Laticínios Aliança" in f.nome])

    # Cria outro produto
    prod2 = Produto(
        empresa_id=empresa.id,
        nome="Produto Teste Reutilizacao 8B",
        tipo="PRODUTO",
        categoria="Geral",
        preco_venda=10.0,
        custo_unitario=5.0,
        quantidade_estoque=0.0,
        estoque_minimo=1.0,
        ativo=True,
    )
    db.add(prod2)
    db.commit()
    db.refresh(prod2)

    # Lança compra com o mesmo fornecedor já cadastrado
    compra2 = CompraManualCreate(
        fornecedor_nome="Distribuidora Laticínios Aliança Ltda",
        fornecedor_cnpj_cpf="12.345.678/0001-99",
        numero_documento="REC-98766",
        data_emissao="2026-11-03",
        forma_pagamento="DINHEIRO",
        itens=[
            ItemCompraManualCreate(
                produto_id=prod2.id,
                quantidade=1.0,
                unidade="UN",
                fator_conversao=1.0,
                valor_unitario=5.0,
                valor_total=5.0,
                atualizar_custo=False,
            )
        ]
    )
    criar_compra_manual(dados=compra2, db=db, current_user=owner, empresa=empresa)

    forns_depois = listar_sugestoes_fornecedores(db=db, current_user=owner, empresa=empresa)
    count_depois = len([f for f in forns_depois if "Distribuidora Laticínios Aliança" in f.nome])
    assert count_depois == count_antes


def test_4_operator_bloqueado_em_compra_manual(db, operator, empresa):
    """Garante que OPERATOR receba HTTP 403 ao tentar lançar compras manuais."""
    payload = CompraManualCreate(
        fornecedor_nome="Fornecedor Tentativa Operator",
        data_emissao="2026-11-03",
        itens=[
            ItemCompraManualCreate(
                produto_id=1,
                quantidade=1.0,
                valor_unitario=10.0,
                valor_total=10.0,
            )
        ]
    )
    with pytest.raises(HTTPException) as exc_info:
        criar_compra_manual(dados=payload, db=db, current_user=operator, empresa=empresa)

    assert exc_info.value.status_code == 403
    assert "permissão" in exc_info.value.detail.lower()


def test_5_listagem_e_detalhes_compra_manual(db, owner, empresa):
    """Verifica se as compras manuais aparecem na listagem e na consulta de detalhes com origem='MANUAL'."""
    compras_manuais = listar_compras(origem="MANUAL", db=db, current_user=owner, empresa=empresa)
    assert len(compras_manuais) >= 1
    
    # Encontra a compra com anexo cadastrada no teste 2
    compra_com_anexo = next((c for c in compras_manuais if c.numero_nota == "REC-98765"), None)
    assert compra_com_anexo is not None
    assert compra_com_anexo.origem == "MANUAL"
    assert compra_com_anexo.anexo_url == "/uploads/comprovantes/recibo_teste.pdf"

    # Detalhes
    compra_id = compra_com_anexo.id
    det = obter_detalhes_compra(compra_id=compra_id, db=db, current_user=owner, empresa=empresa)
    assert det.id == compra_id
    assert det.origem == "MANUAL"
    assert len(det.itens) >= 1
    assert det.anexo_url is not None
    assert det.anexo_tipo == "PDF"


def test_6_impacto_kpis_resumo_compras(db, owner, empresa):
    """Verifica que o resumo de compras totaliza os valores da compra manual."""
    resumo = get_resumo_compras(db=db, current_user=owner, empresa=empresa)
    assert resumo.total_comprado_ano > 0
    assert resumo.numero_notas_total >= 1
    assert resumo.fornecedor_principal is not None
