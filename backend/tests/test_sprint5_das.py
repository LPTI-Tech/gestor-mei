import pytest
from datetime import date, timedelta
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


def test_1_das_auto_geracao_e_listagem(auth_headers):
    """Verifica se a API inicializa automaticamente os 12 meses do ano com campos exigidos."""
    res = client.get("/api/das?ano=2026", headers=auth_headers)
    assert res.status_code == 200, res.text
    guias = res.json()
    assert len(guias) == 12
    
    # Valida campos da entidade DasMensal
    for i, g in enumerate(guias, 1):
        assert g["id"] > 0
        assert g["empresa_id"] > 0
        assert g["ano"] == 2026
        assert g["mes"] == i
        assert g["valor"] > 0
        assert "vencimento" in g
        assert g["status"] in ["Pago", "Pendente", "Atrasado"]
        assert "data_pagamento" in g
        assert "observacao" in g
        assert "competencia_formatada" in g
        assert "dias_para_vencimento" in g


def test_2_das_registrar_pagamento(auth_headers):
    """Testa o registro de pagamento de uma guia DAS."""
    # 1. Obtém lista para pegar uma guia
    res = client.get("/api/das?ano=2026", headers=auth_headers)
    assert res.status_code == 200
    guias = res.json()
    guia_alvo = guias[0]  # Mês 1 (Janeiro)
    das_id = guia_alvo["id"]

    # 2. Registra o pagamento
    hoje_str = date.today().isoformat()
    pagamento_payload = {
        "data_pagamento": hoje_str,
        "valor": 75.60,
        "observacao": "Pago via PIX Nubank - Comprovante OK"
    }
    pay_res = client.post(f"/api/das/{das_id}/pagamento", json=pagamento_payload, headers=auth_headers)
    assert pay_res.status_code == 200, pay_res.text
    pago = pay_res.json()

    assert pago["id"] == das_id
    assert pago["status"] == "Pago"
    assert pago["data_pagamento"] == hoje_str
    assert pago["observacao"] == "Pago via PIX Nubank - Comprovante OK"
    assert pago["alerta_vencimento"] == "pago"


def test_3_das_alterar_status_manual(auth_headers):
    """Testa a alteração manual do status (Pendente, Atrasado, Pago)."""
    res = client.get("/api/das?ano=2026", headers=auth_headers)
    das_id = res.json()[1]["id"]  # Mês 2 (Fevereiro)

    # 1. Altera para Pendente
    res_pendente = client.patch(
        f"/api/das/{das_id}/status",
        json={"status": "Pendente", "observacao": "Aguardando confirmação bancária"},
        headers=auth_headers
    )
    assert res_pendente.status_code == 200
    assert res_pendente.json()["status"] == "Pendente"
    assert res_pendente.json()["data_pagamento"] is None

    # 2. Altera para Atrasado
    res_atrasado = client.patch(
        f"/api/das/{das_id}/status",
        json={"status": "Atrasado"},
        headers=auth_headers
    )
    assert res_atrasado.status_code == 200
    assert res_atrasado.json()["status"] == "Atrasado"

    # 3. Altera para Pago
    hoje_str = date.today().isoformat()
    res_pago = client.patch(
        f"/api/das/{das_id}/status",
        json={"status": "Pago", "data_pagamento": hoje_str},
        headers=auth_headers
    )
    assert res_pago.status_code == 200
    assert res_pago.json()["status"] == "Pago"
    assert res_pago.json()["data_pagamento"] == hoje_str

    # 4. Status inválido deve retornar 400
    res_invalido = client.patch(
        f"/api/das/{das_id}/status",
        json={"status": "INEXISTENTE"},
        headers=auth_headers
    )
    assert res_invalido.status_code == 400


def test_4_das_consultar_vencimentos_e_alertas(auth_headers):
    """Testa a consulta de vencimentos e listas de alertas (vence em 7 dias, vencidos, pagos)."""
    res = client.get("/api/das/vencimentos?ano=2026", headers=auth_headers)
    assert res.status_code == 200, res.text
    dados = res.json()

    assert "ano" in dados
    assert "das_vence_em_7_dias" in dados
    assert "das_vencidos" in dados
    assert "das_pagos" in dados
    assert "resumo" in dados

    resumo = dados["resumo"]
    assert resumo["total_guias"] == 12
    assert resumo["qtd_pago"] >= 2  # Meses 1 e 2 pagos nos testes anteriores
    assert resumo["total_pago"] > 0
    assert "alerta_principal" in resumo
    assert resumo["tipo_alerta"] in ["error", "warning", "success", "info"]


def test_5_das_resumo_e_metricas(auth_headers):
    """Testa o endpoint de resumo financeiro do DAS."""
    res = client.get("/api/das/resumo?ano=2026", headers=auth_headers)
    assert res.status_code == 200, res.text
    resumo = res.json()

    assert resumo["ano"] == 2026
    assert resumo["total_guias"] == 12
    assert resumo["qtd_pago"] + resumo["qtd_pendente"] + resumo["qtd_atrasado"] == 12
    assert resumo["total_pago"] >= 0
    assert resumo["total_pendente"] >= 0
    assert resumo["total_atrasado"] >= 0


def test_6_das_dashboard_integracao(auth_headers):
    """Verifica se os novos indicadores e alertas do DAS estão integrados no Dashboard Inteligente."""
    res = client.get("/api/dashboard", headers=auth_headers)
    assert res.status_code == 200, res.text
    dash = res.json()

    assert "das_status_mes_atual" in dash
    assert dash["das_status_mes_atual"] in ["Pago", "Pendente", "Atrasado"]
    assert "das_valor_mes_atual" in dash
    assert dash["das_valor_mes_atual"] > 0
    assert "das_vencimento_mes_atual" in dash
    assert "das_qtd_pagos" in dash
    assert "das_qtd_pendentes" in dash
    assert "das_qtd_atrasados" in dash
    assert "das_alerta_tipo" in dash
    assert "das_alerta_mensagem" in dash


def test_7_das_filtro_por_status(auth_headers):
    """Testa o filtro por status na listagem."""
    res_pagos = client.get("/api/das?ano=2026&status=Pago", headers=auth_headers)
    assert res_pagos.status_code == 200
    for g in res_pagos.json():
        assert g["status"] == "Pago"


def test_8_das_isolamento_e_404(auth_headers):
    """Garante que requisições para guias inexistentes retornem 404."""
    res_fake = client.get("/api/das/999999", headers=auth_headers)
    assert res_fake.status_code == 404

    res_fake_pay = client.post("/api/das/999999/pagamento", json={"valor": 75.60}, headers=auth_headers)
    assert res_fake_pay.status_code == 404

