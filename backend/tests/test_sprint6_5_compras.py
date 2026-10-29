import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="session")
def auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "admin@gestormei.com.br",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login falhou: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_1_resumo_compras_indicadores(auth_headers):
    """Valida o endpoint de resumo consolidado de Compras para os KPIs do Dashboard."""
    res = client.get("/api/compras/resumo", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "total_comprado_mes" in data
    assert "total_comprado_ano" in data
    assert "numero_notas_mes" in data
    assert "numero_notas_total" in data
    assert "ultima_compra" in data
    assert "fornecedor_principal" in data
    assert "compras_por_mes" in data
    assert "top_fornecedores" in data

    assert isinstance(data["total_comprado_mes"], (int, float))
    assert isinstance(data["total_comprado_ano"], (int, float))
    assert isinstance(data["numero_notas_mes"], int)
    assert isinstance(data["numero_notas_total"], int)


def test_2_listar_compras_historico(auth_headers):
    """Valida a listagem do histórico de compras com filtros."""
    res = client.get("/api/compras", headers=auth_headers)
    assert res.status_code == 200, res.text
    compras = res.json()
    assert isinstance(compras, list)

    if len(compras) > 0:
        c = compras[0]
        assert "id" in c
        assert "numero_nota" in c
        assert "fornecedor_nome" in c
        assert "fornecedor_cnpj" in c
        assert "valor_total" in c
        assert "total_itens" in c
        assert "data_importacao" in c


def test_3_filtro_busca_compras(auth_headers):
    """Testa busca por termo de fornecedor ou número de nota."""
    res_all = client.get("/api/compras", headers=auth_headers)
    assert res_all.status_code == 200
    todas = res_all.json()

    if len(todas) > 0:
        primeira = todas[0]
        termo = primeira["fornecedor_nome"][:5]

        res_busca = client.get(f"/api/compras?busca={termo}", headers=auth_headers)
        assert res_busca.status_code == 200
        filtradas = res_busca.json()
        assert len(filtradas) >= 1
        assert any(c["id"] == primeira["id"] for c in filtradas)


def test_4_detalhes_compra_por_id(auth_headers):
    """Valida a consulta aos detalhes completos de uma compra e seus itens faturados."""
    res_list = client.get("/api/compras", headers=auth_headers)
    assert res_list.status_code == 200
    compras = res_list.json()

    if len(compras) > 0:
        compra_id = compras[0]["id"]
        res_detalhe = client.get(f"/api/compras/{compra_id}", headers=auth_headers)
        assert res_detalhe.status_code == 200, res_detalhe.text
        detalhe = res_detalhe.json()

        assert detalhe["id"] == compra_id
        assert "itens" in detalhe
        assert isinstance(detalhe["itens"], list)

        if len(detalhe["itens"]) > 0:
            item = detalhe["itens"][0]
            assert "codigo_fornecedor" in item
            assert "quantidade_comercial" in item
            assert "fator_conversao" in item
            assert "quantidade_entrada" in item
            assert "custo_unitario_calculado" in item
            assert "valor_total" in item


def test_5_detalhe_compra_inexistente_retorna_404(auth_headers):
    """Garante que consultar compra inexistente retorne HTTP 404."""
    res = client.get("/api/compras/999999", headers=auth_headers)
    assert res.status_code == 404
    assert "não encontrada" in res.json()["detail"].lower()

