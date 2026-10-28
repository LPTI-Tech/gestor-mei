import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="session")
def auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "admin@gestormei.com.br",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_1_clientes_crud(auth_headers):
    # 1. Create client
    payload = {
        "nome": "Supermercado & Padaria Estrela",
        "telefone": "(11) 98765-9999",
        "cpf_cnpj": "12.345.678/0001-90",
        "email": "contato@padariaestrela.com.br",
        "endereco": "Rua Central, 120",
        "observacoes": "Entrega diária às 11h30",
        "ativo": True
    }
    res = client.post("/api/clientes", json=payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    cliente = res.json()
    assert cliente["id"] > 0
    assert cliente["nome"] == payload["nome"]
    cliente_id = cliente["id"]

    # 2. List clients with filter
    res_list = client.get("/api/clientes", params={"q": "Estrela"}, headers=auth_headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(c["id"] == cliente_id for c in items)

    # 3. Update client
    res_put = client.put(f"/api/clientes/{cliente_id}", json={"telefone": "(11) 99999-0000"}, headers=auth_headers)
    assert res_put.status_code == 200
    assert res_put.json()["telefone"] == "(11) 99999-0000"


def test_2_venda_multiplos_itens_calculo_automatico(auth_headers):
    # Get available products
    res_prod = client.get("/api/produtos", headers=auth_headers)
    assert res_prod.status_code == 200
    produtos = res_prod.json()
    assert len(produtos) >= 2, "Need at least 2 products seeded"
    p1 = produtos[0]
    p2 = produtos[1]

    # Get a client
    res_cli = client.get("/api/clientes", headers=auth_headers)
    assert res_cli.status_code == 200
    clientes = res_cli.json()
    cliente_id = clientes[0]["id"] if clientes else None

    # Cart with multiple items:
    # Item 1: 3x p1 (e.g. 3 * 22.00 = 66.00)
    # Item 2: 2x p2 (e.g. 2 * 26.00 = 52.00)
    # Item 3: Custom item 1x 15.00
    # Desconto: 5.00
    # Expected subtotal = (3 * p1.preco) + (2 * p2.preco) + 15.00
    # Expected total = subtotal - 5.00
    expected_subtotal = round((3 * p1["preco_venda"]) + (2 * p2["preco_venda"]) + 15.00, 2)
    expected_total = round(expected_subtotal - 5.00, 2)

    venda_payload = {
        "cliente_id": cliente_id,
        "origem": "WhatsApp",
        "forma_pagamento": "PIX",
        "desconto": 5.00,
        "observacoes": "Marmitas sem cebola e suco bem gelado",
        "itens": [
            {
                "produto_id": p1["id"],
                "descricao": p1["nome"],
                "quantidade": 3.0,
                "preco_unitario": p1["preco_venda"],
                "tipo_item": "PRODUTO"
            },
            {
                "produto_id": p2["id"],
                "descricao": p2["nome"],
                "quantidade": 2.0,
                "preco_unitario": p2["preco_venda"],
                "tipo_item": "PRODUTO"
            },
            {
                "produto_id": None,
                "descricao": "Sobremesa Especial do Chef",
                "quantidade": 1.0,
                "preco_unitario": 15.00,
                "tipo_item": "PRODUTO"
            }
        ]
    }

    res_venda = client.post("/api/vendas", json=venda_payload, headers=auth_headers)
    assert res_venda.status_code == 201, res_venda.text
    data = res_venda.json()

    assert data["id"] > 0
    assert len(data["itens"]) == 3
    assert data["valor_subtotal"] == expected_subtotal
    assert data["desconto"] == 5.00
    assert data["valor_total"] == expected_total
    assert data["forma_pagamento"] == "PIX"
    assert data["origem"] == "WhatsApp"
    if cliente_id:
        assert data["cliente_id"] == cliente_id
        assert data["cliente_nome"] is not None

    # Verify each item subtotal
    item1 = data["itens"][0]
    assert item1["subtotal"] == round(3.0 * p1["preco_venda"], 2)


def test_3_venda_dinheiro_impacta_caixa(auth_headers):
    # Check caixa status
    res_caixa_before = client.get("/api/caixa/status", headers=auth_headers)
    assert res_caixa_before.status_code == 200
    data_caixa_before = res_caixa_before.json()

    if data_caixa_before["is_aberto"]:
        saldo_inicial = data_caixa_before["saldo_dinheiro_atual"]

        # Make cash multi-item sale of R$ 50.00
        sale_payload = {
            "origem": "Balcão",
            "forma_pagamento": "Dinheiro",
            "desconto": 0.0,
            "itens": [
                {
                    "descricao": "2x Prato Comercial Balcão",
                    "quantidade": 2.0,
                    "preco_unitario": 25.00,
                    "tipo_item": "PRODUTO"
                }
            ]
        }
        res_sale = client.post("/api/vendas", json=sale_payload, headers=auth_headers)
        assert res_sale.status_code == 201
        sale = res_sale.json()
        assert sale["valor_total"] == 50.00

        # Check caixa status after sale
        res_caixa_after = client.get("/api/caixa/status", headers=auth_headers)
        assert res_caixa_after.status_code == 200
        data_caixa_after = res_caixa_after.json()
        assert data_caixa_after["saldo_dinheiro_atual"] == round(saldo_inicial + 50.00, 2)


def test_4_dashboard_e_relatorio_mei(auth_headers):
    # Test dashboard endpoint responds with updated totals
    res_dash = client.get("/api/dashboard", headers=auth_headers)
    assert res_dash.status_code == 200
    dash = res_dash.json()
    assert dash["venda_dia"] > 0
    assert dash["venda_mes"] > 0
    assert dash["qtd_vendas_mes"] > 0
    assert dash["ticket_medio_mes"] > 0

    # Test relatorio MEI calculates properly
    res_mei = client.get("/api/relatorio-mei", headers=auth_headers)
    assert res_mei.status_code == 200
    mei = res_mei.json()
    assert mei["faturamento_acumulado_ano"] > 0
    assert len(mei["meses"]) == 12
    assert mei["percentual_utilizado"] >= 0


def test_5_cancelar_venda(auth_headers):
    # Create sale then cancel it
    sale_payload = {
        "origem": "Telefone",
        "forma_pagamento": "Débito",
        "itens": [
            {
                "descricao": "Item para Teste de Cancelamento",
                "quantidade": 1.0,
                "preco_unitario": 35.00
            }
        ]
    }
    res_sale = client.post("/api/vendas", json=sale_payload, headers=auth_headers)
    assert res_sale.status_code == 201
    venda_id = res_sale.json()["id"]

    res_cancel = client.put(f"/api/vendas/{venda_id}/cancelar", headers=auth_headers)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "Cancelada"
