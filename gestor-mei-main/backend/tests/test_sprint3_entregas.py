import uuid
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


def test_1_regioes_entrega_crud(auth_headers):
    # 1. Create region with unique name
    unique_name = f"Bairro Nobres {uuid.uuid4().hex[:6]}"
    payload = {
        "nome": unique_name,
        "taxa_entrega": 9.50,
        "tempo_estimado_minutos": 40,
        "ativo": True
    }
    res = client.post("/api/regioes-entrega", json=payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    regiao = res.json()
    assert regiao["id"] > 0
    assert regiao["nome"] == payload["nome"]
    assert regiao["taxa_entrega"] == 9.50
    regiao_id = regiao["id"]

    # 2. List regions
    res_list = client.get("/api/regioes-entrega", headers=auth_headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(r["id"] == regiao_id for r in items)

    # 3. Update region
    res_put = client.put(f"/api/regioes-entrega/{regiao_id}", json={"taxa_entrega": 11.00}, headers=auth_headers)
    assert res_put.status_code == 200
    assert res_put.json()["taxa_entrega"] == 11.00


def test_2_vinculacao_regiao_ao_cliente(auth_headers):
    # Get a region
    res_regioes = client.get("/api/regioes-entrega", headers=auth_headers)
    assert res_regioes.status_code == 200
    regioes = res_regioes.json()
    assert len(regioes) > 0
    regiao = regioes[0]

    # Create client with region
    cli_payload = {
        "nome": "Fernanda Lima - Delivery Frequente",
        "telefone": "(11) 98888-7777",
        "endereco": "Rua das Palmeiras, 500 - Bloco B Apto 14",
        "regiao_id": regiao["id"],
        "ativo": True
    }
    res_cli = client.post("/api/clientes", json=cli_payload, headers=auth_headers)
    assert res_cli.status_code == 201, res_cli.text
    cli = res_cli.json()
    assert cli["regiao_id"] == regiao["id"]
    assert cli["regiao_nome"] == regiao["nome"]
    assert cli["regiao_taxa"] == regiao["taxa_entrega"]


def test_3_geracao_pedido_entrega_com_taxa(auth_headers):
    # Get products
    res_prod = client.get("/api/produtos", headers=auth_headers)
    p1 = res_prod.json()[0]

    # Get client with region
    res_cli = client.get("/api/clientes", headers=auth_headers)
    clientes = res_cli.json()
    cliente = next((c for c in clientes if c.get("regiao_id")), clientes[0])

    taxa = cliente.get("regiao_taxa") or 6.00

    # Subtotal: 2 * p1["preco_venda"]
    # Total: subtotal + taxa - desconto
    subtotal = round(2 * p1["preco_venda"], 2)
    desconto = 2.00
    expected_total = round(subtotal + taxa - desconto, 2)

    pedido_payload = {
        "cliente_id": cliente["id"],
        "tipo_pedido": "ENTREGA",
        "origem": "WhatsApp",
        "forma_pagamento": "PIX",
        "regiao_entrega_id": cliente.get("regiao_id"),
        "taxa_entrega": taxa,
        "desconto": desconto,
        "endereco_entrega": cliente.get("endereco") or "Rua de Entrega Teste, 100",
        "observacoes": "Tocar interfone 14",
        "itens": [
            {
                "produto_id": p1["id"],
                "descricao": p1["nome"],
                "quantidade": 2.0,
                "preco_unitario": p1["preco_venda"]
            }
        ]
    }

    res_pedido = client.post("/api/vendas", json=pedido_payload, headers=auth_headers)
    assert res_pedido.status_code == 201, res_pedido.text
    pedido = res_pedido.json()

    assert pedido["id"] > 0
    assert pedido["numero_pedido"].startswith("PED-")
    assert pedido["tipo_pedido"] == "ENTREGA"
    assert pedido["status_pedido"] == "Recebido"
    assert pedido["taxa_entrega"] == taxa
    assert pedido["valor_subtotal"] == subtotal
    assert pedido["valor_total"] == expected_total
    assert pedido["cliente_nome"] == cliente["nome"]


def test_4_ciclo_de_status_do_pedido(auth_headers):
    # Create an order
    pedido_payload = {
        "tipo_pedido": "ENTREGA",
        "origem": "Telefone",
        "forma_pagamento": "Dinheiro",
        "itens": [{"descricao": "Marmita Fitness", "quantidade": 1.0, "preco_unitario": 28.00}]
    }
    res = client.post("/api/vendas", json=pedido_payload, headers=auth_headers)
    assert res.status_code == 201
    ped_id = res.json()["id"]

    # 1. Update to 'Em Preparo'
    res_prep = client.put(f"/api/vendas/{ped_id}/status-pedido", json={"status_pedido": "Em Preparo"}, headers=auth_headers)
    assert res_prep.status_code == 200
    assert res_prep.json()["status_pedido"] == "Em Preparo"

    # 2. Update to 'Saiu para Entrega'
    res_trans = client.put(f"/api/vendas/{ped_id}/status-pedido", json={"status_pedido": "Saiu para Entrega"}, headers=auth_headers)
    assert res_trans.status_code == 200
    assert res_trans.json()["status_pedido"] == "Saiu para Entrega"

    # 3. Update to 'Entregue'
    res_ok = client.put(f"/api/vendas/{ped_id}/status-pedido", json={"status_pedido": "Entregue"}, headers=auth_headers)
    assert res_ok.status_code == 200
    assert res_ok.json()["status_pedido"] == "Entregue"
    assert res_ok.json()["data_entrega"] is not None


def test_5_vinculacao_motoboy_ao_pedido(auth_headers):
    # Get available motoboys
    res_m = client.get("/api/motoboys", headers=auth_headers)
    motoboys = res_m.json()
    assert len(motoboys) > 0
    motoboy = motoboys[0]

    # Create delivery order
    order_payload = {
        "tipo_pedido": "ENTREGA",
        "origem": "Delivery Próprio",
        "forma_pagamento": "Débito",
        "taxa_entrega": 7.00,
        "itens": [{"descricao": "X-Bacon Especial", "quantidade": 2.0, "preco_unitario": 22.00}]
    }
    res_order = client.post("/api/vendas", json=order_payload, headers=auth_headers)
    assert res_order.status_code == 201
    ped_id = res_order.json()["id"]

    # Link motoboy
    res_link = client.put(
        f"/api/vendas/{ped_id}/vincular-motoboy",
        json={"motoboy_id": motoboy["id"], "taxa_motoboy": 7.50},
        headers=auth_headers
    )
    assert res_link.status_code == 200, res_link.text
    updated = res_link.json()
    assert updated["motoboy_id"] == motoboy["id"]
    assert updated["motoboy_nome"] == motoboy["nome"]
    assert updated["taxa_motoboy"] == 7.50


def test_6_relatorio_entregas(auth_headers):
    res = client.get("/api/relatorio-entregas", headers=auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_pedidos_entrega"] > 0
    assert data["total_taxas_cobradas"] >= 0
    assert isinstance(data["entregas_por_regiao"], list)
    assert isinstance(data["entregas_por_motoboy"], list)


def test_7_comanda_impressao_termica_escpos(auth_headers):
    # Get any sale
    res_v = client.get("/api/vendas", headers=auth_headers)
    vendas = res_v.json()
    assert len(vendas) > 0
    v_id = vendas[0]["id"]

    res_comanda = client.get(f"/api/vendas/{v_id}/comanda-texto", headers=auth_headers)
    assert res_comanda.status_code == 200, res_comanda.text
    comanda = res_comanda.json()
    assert comanda["venda_id"] == v_id
    assert "PEDIDO:" in comanda["comanda_texto"]
    assert "TOTAL A PAGAR:" in comanda["comanda_texto"]
    assert "Obrigado pela preferencia!" in comanda["comanda_texto"]
