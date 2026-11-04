import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.nfe_parser import parse_nfe_xml, NfeParserError

client = TestClient(app)

SAMPLE_NFE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35261012345678000190550010000001231000001234" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>00000123</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>123</nNF>
        <dhEmi>2026-10-25T14:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>Distribuidora de Bebidas Brasil LTDA</xNome>
        <xFant>Bebidas Brasil</xFant>
        <enderEmit>
          <xLgr>Rua dos Fornecedores</xLgr>
          <nro>1000</nro>
          <UF>SP</UF>
        </enderEmit>
        <IE>123456789</IE>
      </emit>
      <dest>
        <CNPJ>12345678000199</CNPJ>
        <xNome>MEI Lanchonete do Pastel</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>CX-COCA-12</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>COCA COLA LATA 350ML CX 12</xProd>
          <NCM>22021000</NCM>
          <CFOP>5102</CFOP>
          <uCom>CX</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>48.0000</vUnCom>
          <vProd>240.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>BISCOITO-1</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>BISCOITO WAFER CHOCOLATE 140G</xProd>
          <NCM>19053200</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>3.5000</vUnCom>
          <vProd>35.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vProd>275.00</vProd>
          <vNF>275.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>"""


@pytest.fixture(scope="session")
def auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "admin@gestormei.com.br",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_1_nfe_parser_sucesso():
    """Valida o parser isolado de XML de NF-e v4.00 com namespace SEFAZ."""
    parsed = parse_nfe_xml(SAMPLE_NFE_XML)
    assert parsed["chave_acesso"] == "35261012345678000190550010000001231000001234"
    assert parsed["numero_nota"] == "123"
    assert parsed["serie"] == "1"
    assert parsed["valor_total"] == 275.00
    assert parsed["fornecedor"]["cnpj"] == "12345678000190"
    assert parsed["fornecedor"]["nome"] == "Distribuidora de Bebidas Brasil LTDA"
    assert parsed["fornecedor"]["nome_fantasia"] == "Bebidas Brasil"
    assert parsed["fornecedor"]["uf"] == "SP"

    # Itens
    itens = parsed["itens"]
    assert len(itens) == 2

    item1 = itens[0]
    assert item1["numero_item"] == 1
    assert item1["codigo_fornecedor"] == "CX-COCA-12"
    assert item1["unidade_comercial"] == "CX"
    assert item1["quantidade_comercial"] == 5.0
    assert item1["valor_unitario"] == 48.0
    assert item1["valor_total"] == 240.0
    assert item1["ean"] == "7891234567890"

    item2 = itens[1]
    assert item2["numero_item"] == 2
    assert item2["codigo_fornecedor"] == "BISCOITO-1"
    assert item2["unidade_comercial"] == "UN"
    assert item2["quantidade_comercial"] == 10.0
    assert item2["ean"] is None  # 'SEM GTIN' deve ser sanitizado para None


def test_2_nfe_parser_xml_invalido():
    """Valida que XMLs inválidos ou não-NFe levantam erro apropriado."""
    with pytest.raises(NfeParserError):
        parse_nfe_xml("<invalid>xml</invalid>")

    with pytest.raises(NfeParserError):
        parse_nfe_xml("não é um xml")


def test_3_api_preview_xml(auth_headers):
    """Testa o endpoint de pré-visualização de NF-e via upload/texto."""
    res = client.post(
        "/api/nfe/preview-xml",
        data={"xml_text": SAMPLE_NFE_XML},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["chave_acesso"] == "35261012345678000190550010000001231000001234"
    assert data["numero_nota"] == "123"
    assert data["total_itens"] == 2
    assert len(data["itens"]) == 2
    assert data["fornecedor"]["cnpj"] == "12345678000190"


def test_4_crud_vinculo_e_conversao_fator(auth_headers):
    """
    Testa o fluxo completo de De-Para e Fator de Conversão:
    1. Vincula CX-COCA-12 ao produto 1 com fator de conversão 12.0
    2. Consulta os vínculos
    3. Roda o preview novamente e confirma que o item foi identificado como VINCULADO
       com quantidade calculada em 60 unidades e custo R$ 4,00.
    """
    # 1. Obtém lista de produtos existentes para vincular
    res_prod = client.get("/api/produtos?apenas_ativos=true", headers=auth_headers)
    assert res_prod.status_code == 200
    produtos = res_prod.json()
    assert len(produtos) > 0
    prod_alvo = produtos[0]

    # 2. Cria vínculo com fator de conversão 12.0 (1 caixa = 12 unidades)
    payload_vinculo = {
        "fornecedor_cnpj": "12345678000190",
        "fornecedor_nome": "Distribuidora de Bebidas Brasil LTDA",
        "codigo_fornecedor": "CX-COCA-12",
        "descricao_fornecedor": "COCA COLA LATA 350ML CX 12",
        "ean_fornecedor": "7891234567890",
        "produto_id": prod_alvo["id"],
        "fator_conversao": 12.0
    }
    res_create = client.post("/api/nfe/vinculos", json=payload_vinculo, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text
    vinculo_criado = res_create.json()
    assert vinculo_criado["codigo_fornecedor"] == "CX-COCA-12"
    assert vinculo_criado["fator_conversao"] == 12.0
    assert vinculo_criado["produto_nome"] == prod_alvo["nome"]
    vinculo_id = vinculo_criado["id"]

    # 3. Lista vínculos
    res_list = client.get("/api/nfe/vinculos", headers=auth_headers)
    assert res_list.status_code == 200
    lista_vinculos = res_list.json()
    assert any(v["id"] == vinculo_id for v in lista_vinculos)

    # 4. Roda novamente o preview de XML e valida conversão de unidades
    res_preview = client.post(
        "/api/nfe/preview-xml",
        data={"xml_text": SAMPLE_NFE_XML},
        headers=auth_headers,
    )
    assert res_preview.status_code == 200
    preview_data = res_preview.json()

    # O primeiro item deve agora estar VINCULADO
    item1 = preview_data["itens"][0]
    assert item1["codigo_fornecedor"] == "CX-COCA-12"
    assert item1["status_vinculo"] == "VINCULADO"
    assert item1["produto_id_vinculado"] == prod_alvo["id"]
    assert item1["fator_conversao"] == 12.0
    # 5 caixas * 12 unidades = 60 unidades no estoque
    assert item1["quantidade_estoque_entrada"] == 60.0
    # R$ 48,00 / 12 = R$ 4,00 custo unitário
    assert item1["custo_unitario_calculado"] == 4.0

    # 5. Exclui o vínculo criado para limpeza
    res_del = client.delete(f"/api/nfe/vinculos/{vinculo_id}", headers=auth_headers)
    assert res_del.status_code == 204


def test_5_importar_nfe_sucesso(auth_headers):
    """
    Valida a efetivação completa da importação de XML NF-e (Sprint 6 Fase 2):
    1. Executa POST /api/nfe/importar com dois itens.
    2. Valida incremento do estoque físico (com fator de conversão).
    3. Valida atualização do custo unitário.
    4. Valida criação do registro de movimentação de estoque (Tipo: ENTRADA, Motivo: Importação XML NF-e).
    5. Valida inserção na tabela de histórico de NF-e importadas.
    """
    res_prod = client.get("/api/produtos?apenas_ativos=true", headers=auth_headers)
    assert res_prod.status_code == 200
    produtos = res_prod.json()
    assert len(produtos) >= 2, "Requer pelo menos 2 produtos cadastrados para teste"
    prod1 = produtos[0]
    prod2 = produtos[1]

    qtd_ant_1 = prod1.get("quantidade_estoque", 0.0) or 0.0
    qtd_ant_2 = prod2.get("quantidade_estoque", 0.0) or 0.0

    chave_teste = "35261012345678000190550010000001231000001234"

    # Limpeza prévia para garantir idempotência do teste
    from app.database import SessionLocal
    from app.models.nfe import NfeImportada
    db = SessionLocal()
    try:
        previas = db.query(NfeImportada).filter(NfeImportada.chave_acesso == chave_teste).all()
        for p in previas:
            db.delete(p)
        db.commit()
    finally:
        db.close()

    payload_import = {
        "chave_acesso": chave_teste,
        "numero_nota": "123",
        "serie": "1",
        "data_emissao": "2026-10-25T14:30:00-03:00",
        "valor_total": 275.00,
        "fornecedor_cnpj": "12345678000190",
        "fornecedor_nome": "Distribuidora de Bebidas Brasil LTDA",
        "fornecedor_uf": "SP",
        "itens": [
            {
                "produto_id": prod1["id"],
                "codigo_fornecedor": "CX-COCA-12",
                "descricao_fornecedor": "COCA COLA LATA 350ML CX 12",
                "unidade_comercial": "CX",
                "quantidade_comercial": 5.0,
                "fator_conversao": 12.0,  # 5 cx * 12 = 60 unidades
                "valor_unitario": 48.00,  # Custo = 48 / 12 = 4.00
                "valor_total": 240.00,
                "atualizar_custo": True,
                "atualizar_vinculo": True,
            },
            {
                "produto_id": prod2["id"],
                "codigo_fornecedor": "BISCOITO-1",
                "descricao_fornecedor": "BISCOITO WAFER CHOCOLATE 140G",
                "unidade_comercial": "UN",
                "quantidade_comercial": 10.0,
                "fator_conversao": 1.0,  # 10 * 1 = 10 unidades
                "valor_unitario": 3.50,  # Custo = 3.50
                "valor_total": 35.00,
                "atualizar_custo": True,
                "atualizar_vinculo": True,
            }
        ],
        "observacao": "Importação oficial de estoque via XML - Sprint 6 Fase 2"
    }

    res_import = client.post("/api/nfe/importar", json=payload_import, headers=auth_headers)
    assert res_import.status_code == 201, res_import.text
    import_res = res_import.json()
    assert import_res["sucesso"] is True
    assert import_res["total_itens_processados"] == 2
    assert import_res["chave_acesso"] == chave_teste

    # 1. Verifica produto 1 atualizado (estoque +60, custo = 4.0)
    res_p1 = client.get(f"/api/produtos/{prod1['id']}", headers=auth_headers)
    assert res_p1.status_code == 200
    p1 = res_p1.json()
    assert p1["quantidade_estoque"] == round(qtd_ant_1 + 60.0, 4)
    assert p1["custo_unitario"] == 4.00

    # 2. Verifica produto 2 atualizado (estoque +10, custo = 3.5)
    res_p2 = client.get(f"/api/produtos/{prod2['id']}", headers=auth_headers)
    assert res_p2.status_code == 200
    p2 = res_p2.json()
    assert p2["quantidade_estoque"] == round(qtd_ant_2 + 10.0, 4)
    assert p2["custo_unitario"] == 3.50

    # 3. Verifica movimentações de estoque registradas
    res_mov = client.get("/api/estoque/movimentacoes", headers=auth_headers)
    assert res_mov.status_code == 200
    movs = res_mov.json()
    nfe_movs = [m for m in movs if m.get("motivo") == "Importação XML NF-e"]
    assert len(nfe_movs) >= 2

    # Valida requisitos da movimentação: Tipo ENTRADA, Fornecedor e Chave na observação
    sample_mov = nfe_movs[0]
    assert sample_mov["tipo"] == "ENTRADA"
    assert "Distribuidora de Bebidas Brasil LTDA" in sample_mov["observacao"]
    assert chave_teste in sample_mov["observacao"]
    assert "NF-e: 123" in sample_mov["observacao"]


def test_6_impedir_importacao_duplicada(auth_headers):
    """Valida o impedimento de importação em duplicidade da mesma nota fiscal (mesma chave de acesso)."""
    res_prod = client.get("/api/produtos?apenas_ativos=true", headers=auth_headers)
    assert res_prod.status_code == 200
    prod_alvo = res_prod.json()[0]

    chave_teste = "35261012345678000190550010000001231000001234"

    payload_duplicado = {
        "chave_acesso": chave_teste,
        "numero_nota": "123",
        "serie": "1",
        "valor_total": 275.00,
        "fornecedor_cnpj": "12345678000190",
        "fornecedor_nome": "Distribuidora de Bebidas Brasil LTDA",
        "itens": [
            {
                "produto_id": prod_alvo["id"],
                "codigo_fornecedor": "CX-COCA-12",
                "quantidade_comercial": 1.0,
                "fator_conversao": 1.0,
                "valor_unitario": 48.00,
                "valor_total": 48.00,
            }
        ]
    }

    res = client.post("/api/nfe/importar", json=payload_duplicado, headers=auth_headers)
    assert res.status_code == 400
    assert "já foi importada anteriormente" in res.json()["detail"]


def test_7_historico_nfe_e_detalhes(auth_headers):
    """Valida a consulta ao histórico de notas importadas e seus detalhes com itens."""
    res_hist = client.get("/api/nfe/historico", headers=auth_headers)
    assert res_hist.status_code == 200, res_hist.text
    historico = res_hist.json()
    assert len(historico) > 0

    chave_teste = "35261012345678000190550010000001231000001234"
    nota = next((n for n in historico if n["chave_acesso"] == chave_teste), None)
    assert nota is not None
    assert nota["numero_nota"] == "123"
    assert nota["fornecedor_nome"] == "Distribuidora de Bebidas Brasil LTDA"
    assert nota["total_itens"] == 2

    # Consulta detalhes da nota com seus itens
    res_det = client.get(f"/api/nfe/historico/{nota['id']}", headers=auth_headers)
    assert res_det.status_code == 200
    detalhes = res_det.json()
    assert detalhes["id"] == nota["id"]
    assert len(detalhes["itens"]) == 2

    item_coca = next((it for it in detalhes["itens"] if it["codigo_fornecedor"] == "CX-COCA-12"), None)
    assert item_coca is not None
    assert item_coca["fator_conversao"] == 12.0
    assert item_coca["quantidade_entrada"] == 60.0
    assert item_coca["custo_unitario_calculado"] == 4.0


def test_8_preview_detecta_nota_ja_importada(auth_headers):
    """Valida que o preview identifica visualmente quando uma nota fiscal já foi importada."""
    res_prev = client.post(
        "/api/nfe/preview-xml",
        data={"xml_text": SAMPLE_NFE_XML},
        headers=auth_headers,
    )
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["ja_importada"] is True
    assert prev_data["data_importacao_previa"] is not None
