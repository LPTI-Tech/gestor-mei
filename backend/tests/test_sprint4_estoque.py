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


def test_1_produto_com_campos_estoque(auth_headers):
    payload = {
        "nome": "Refrigerante Guaraná 2L (Teste Estoque)",
        "tipo": "PRODUTO",
        "categoria": "Bebidas",
        "preco_venda": 12.00,
        "custo_unitario": 5.50,
        "quantidade_estoque": 30.0,
        "estoque_minimo": 10.0,
        "ativo": True
    }
    res = client.post("/api/produtos", json=payload, headers=auth_headers)
    assert res.status_code == 200, res.text
    prod = res.json()
    assert prod["id"] > 0
    assert prod["quantidade_estoque"] == 30.0
    assert prod["estoque_minimo"] == 10.0
    assert prod["custo_unitario"] == 5.50
    assert prod["estoque_baixo"] == False


def test_2_entrada_estoque_manual(auth_headers):
    # 1. Create a product for test
    prod_res = client.post("/api/produtos", json={
        "nome": "Suco de Laranja 1L",
        "tipo": "PRODUTO",
        "categoria": "Bebidas",
        "preco_venda": 15.00,
        "custo_unitario": 6.00,
        "quantidade_estoque": 10.0,
        "estoque_minimo": 5.0,
        "ativo": True
    }, headers=auth_headers)
    prod_id = prod_res.json()["id"]

    # 2. Add 20 units via Entrada
    entrada_payload = {
        "produto_id": prod_id,
        "quantidade": 20.0,
        "custo_unitario": 6.50,
        "motivo": "Compra Distribuidora ABC",
        "observacao": "Nota Fiscal 12345"
    }
    res = client.post("/api/estoque/entrada", json=entrada_payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    mov = res.json()
    assert mov["tipo"] == "ENTRADA"
    assert mov["quantidade"] == 20.0
    assert mov["produto_id"] == prod_id

    # Verify updated product stock
    prods = client.get("/api/produtos", headers=auth_headers).json()
    p = next(x for x in prods if x["id"] == prod_id)
    assert p["quantidade_estoque"] == 30.0
    assert p["custo_unitario"] == 6.50


def test_3_saida_estoque_manual(auth_headers):
    # 1. Create product with 20 items
    prod_res = client.post("/api/produtos", json={
        "nome": "Cerveja Lata 350ml",
        "tipo": "PRODUTO",
        "categoria": "Bebidas",
        "preco_venda": 7.00,
        "custo_unitario": 3.00,
        "quantidade_estoque": 20.0,
        "estoque_minimo": 5.0,
        "ativo": True
    }, headers=auth_headers)
    prod_id = prod_res.json()["id"]

    # 2. Manual Exit (Perda / Lata amassada)
    saida_payload = {
        "produto_id": prod_id,
        "quantidade": 3.0,
        "motivo": "Perda / Avaria",
        "observacao": "Latas amassadas no descarregamento"
    }
    res = client.post("/api/estoque/saida", json=saida_payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    mov = res.json()
    assert mov["tipo"] == "SAIDA"
    assert mov["quantidade"] == 3.0

    # Verify stock decremented to 17
    prods = client.get("/api/produtos", headers=auth_headers).json()
    p = next(x for x in prods if x["id"] == prod_id)
    assert p["quantidade_estoque"] == 17.0


def test_4_ajuste_estoque_inventario(auth_headers):
    # 1. Create product with 15 items
    prod_res = client.post("/api/produtos", json={
        "nome": "Embalagem Marmitex Isopor",
        "tipo": "PRODUTO",
        "categoria": "Outros",
        "preco_venda": 1.00,
        "custo_unitario": 0.40,
        "quantidade_estoque": 15.0,
        "estoque_minimo": 10.0,
        "ativo": True
    }, headers=auth_headers)
    prod_id = prod_res.json()["id"]

    # 2. Inventory adjustment: physical count found 22 items
    ajuste_payload = {
        "produto_id": prod_id,
        "nova_quantidade": 22.0,
        "motivo": "Contagem de Inventário Mensal",
        "observacao": "Sobraram 7 caixas conferidas fisicamente"
    }
    res = client.post("/api/estoque/ajuste", json=ajuste_payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    mov = res.json()
    assert mov["tipo"] == "AJUSTE"
    assert mov["quantidade"] == 7.0  # abs(22 - 15)

    # Verify stock is now exactly 22.0
    prods = client.get("/api/produtos", headers=auth_headers).json()
    p = next(x for x in prods if x["id"] == prod_id)
    assert p["quantidade_estoque"] == 22.0


def test_5_venda_baixa_automatica_estoque(auth_headers):
    # 1. Create a product with initial stock 25.0
    prod_res = client.post("/api/produtos", json={
        "nome": "Hambúrguer Gourmet Especial",
        "tipo": "PRODUTO",
        "categoria": "Lanches",
        "preco_venda": 32.00,
        "custo_unitario": 12.00,
        "quantidade_estoque": 25.0,
        "estoque_minimo": 5.0,
        "ativo": True
    }, headers=auth_headers)
    prod_id = prod_res.json()["id"]

    # 2. Make a sale with 4 units
    venda_payload = {
        "origem": "Balcão",
        "forma_pagamento": "PIX",
        "tipo_pedido": "BALCAO",
        "itens": [
            {
                "produto_id": prod_id,
                "descricao": "Hambúrguer Gourmet Especial",
                "tipo_item": "PRODUTO",
                "quantidade": 4.0,
                "preco_unitario": 32.00
            }
        ]
    }
    res_venda = client.post("/api/vendas", json=venda_payload, headers=auth_headers)
    assert res_venda.status_code == 201, res_venda.text
    venda = res_venda.json()
    assert venda["valor_total"] == 128.00

    # 3. Verify stock was automatically decremented from 25 to 21
    prods = client.get("/api/produtos", headers=auth_headers).json()
    p = next(x for x in prods if x["id"] == prod_id)
    assert p["quantidade_estoque"] == 21.0

    # 4. Verify movement record of type SAIDA was registered
    movs = client.get(f"/api/estoque/movimentacoes?produto_id={prod_id}", headers=auth_headers).json()
    assert len(movs) > 0
    assert movs[0]["tipo"] == "SAIDA"
    assert movs[0]["quantidade"] == 4.0
    assert "Venda" in movs[0]["motivo"]


def test_6_cancelamento_venda_estorna_estoque(auth_headers):
    # 1. Create product with stock 10
    prod_res = client.post("/api/produtos", json={
        "nome": "Açaí no Copo 500ml",
        "tipo": "PRODUTO",
        "categoria": "Sobremesa",
        "preco_venda": 18.00,
        "custo_unitario": 7.00,
        "quantidade_estoque": 10.0,
        "estoque_minimo": 3.0,
        "ativo": True
    }, headers=auth_headers)
    prod_id = prod_res.json()["id"]

    # 2. Sell 3 units (stock drops to 7)
    venda_res = client.post("/api/vendas", json={
        "origem": "Balcão",
        "forma_pagamento": "Dinheiro",
        "tipo_pedido": "BALCAO",
        "itens": [
            {
                "produto_id": prod_id,
                "descricao": "Açaí no Copo 500ml",
                "tipo_item": "PRODUTO",
                "quantidade": 3.0,
                "preco_unitario": 18.00
            }
        ]
    }, headers=auth_headers)
    venda_id = venda_res.json()["id"]

    # Stock is 7
    p_after_sale = next(x for x in client.get("/api/produtos", headers=auth_headers).json() if x["id"] == prod_id)
    assert p_after_sale["quantidade_estoque"] == 7.0

    # 3. Cancel sale
    canc_res = client.put(f"/api/vendas/{venda_id}/cancelar", headers=auth_headers)
    assert canc_res.status_code == 200
    assert canc_res.json()["status"] == "Cancelada"

    # 4. Stock must be restored to 10
    p_after_cancel = next(x for x in client.get("/api/produtos", headers=auth_headers).json() if x["id"] == prod_id)
    assert p_after_cancel["quantidade_estoque"] == 10.0

    # 5. Check estorno movement
    movs = client.get(f"/api/estoque/movimentacoes?produto_id={prod_id}", headers=auth_headers).json()
    assert movs[0]["tipo"] == "ENTRADA"
    assert "Estorno" in movs[0]["motivo"]
    assert movs[0]["quantidade"] == 3.0


def test_7_alerta_estoque_baixo_e_resumo(auth_headers):
    # 1. Create a product with low stock (2 units, min 5 units)
    prod_res = client.post("/api/produtos", json={
        "nome": "Água de Coco 300ml (Estoque Crítico)",
        "tipo": "PRODUTO",
        "categoria": "Bebidas",
        "preco_venda": 6.00,
        "custo_unitario": 2.50,
        "quantidade_estoque": 2.0,
        "estoque_minimo": 5.0,
        "ativo": True
    }, headers=auth_headers)
    prod_id = prod_res.json()["id"]

    # 2. Test /api/estoque/baixo
    baixo_res = client.get("/api/estoque/baixo", headers=auth_headers)
    assert baixo_res.status_code == 200
    baixos = baixo_res.json()
    assert any(b["id"] == prod_id for b in baixos)

    # 3. Test /api/estoque/resumo
    resumo_res = client.get("/api/estoque/resumo", headers=auth_headers)
    assert resumo_res.status_code == 200
    resumo = resumo_res.json()
    assert resumo["total_itens"] > 0
    assert resumo["itens_estoque_baixo"] >= 1
    assert resumo["valor_total_custo"] > 0
    assert resumo["valor_total_venda"] > 0

