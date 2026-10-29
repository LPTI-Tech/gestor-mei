import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="session")
def consultor_auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "consultor@lptitech.com.br",
        "password": "consultor123"
    })
    assert response.status_code == 200, f"Login consultor falhou: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def operador_auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "operador@gestormei.com.br",
        "password": "operador123"
    })
    assert response.status_code == 200, f"Login operador falhou: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def admin_auth_headers():
    response = client.post("/api/auth/login", json={
        "email": "admin@gestormei.com.br",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login admin falhou: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_1_login_usuario_consultor(consultor_auth_headers):
    """Valida o login e perfil CONSULTOR retornado pelo endpoint /api/auth/me."""
    res = client.get("/api/auth/me", headers=consultor_auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user"]["role"] == "CONSULTOR"
    assert data["user"]["email"] == "consultor@lptitech.com.br"


def test_2_bloqueio_usuario_operador_no_painel_consultor(operador_auth_headers):
    """Garante que usuários com perfil OPERADOR recebam HTTP 403 Forbidden ao acessar rotas do consultor."""
    res = client.get("/api/consultor/resumo", headers=operador_auth_headers)
    assert res.status_code == 403
    assert "Acesso restrito" in res.json()["detail"]


def test_3_resumo_consultor_indicadores(consultor_auth_headers):
    """Valida o cálculo consolidado dos indicadores de topo do Painel do Consultor."""
    res = client.get("/api/consultor/resumo", headers=consultor_auth_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "total_clientes_ativos" in data
    assert "total_das_atrasado" in data
    assert "total_estoque_critico" in data
    assert "total_proximo_limite" in data
    assert "total_saudaveis" in data
    assert "total_atencao" in data
    assert "total_criticos" in data

    assert data["total_clientes_ativos"] >= 4
    assert data["total_das_atrasado"] >= 1
    assert data["total_estoque_critico"] >= 1
    assert data["total_proximo_limite"] >= 1


def test_4_listar_clientes_consultor_com_scores(consultor_auth_headers):
    """Valida a listagem de todos os clientes com seus scores (Saudável, Atenção, Crítico) e métricas."""
    res = client.get("/api/consultor/clientes", headers=consultor_auth_headers)
    assert res.status_code == 200, res.text
    clientes = res.json()
    assert len(clientes) >= 4

    scores_presentes = {c["score"] for c in clientes}
    assert "SAUDAVEL" in scores_presentes
    assert "ATENCAO" in scores_presentes
    assert "CRITICO" in scores_presentes

    for c in clientes:
        assert "id" in c
        assert "nome_fantasia" in c
        assert "cnpj" in c
        assert "status_das" in c
        assert "faturamento_anual" in c
        assert "percentual_limite_mei" in c
        assert "quantidade_produtos_criticos" in c
        assert "score" in c
        assert "score_motivo" in c


def test_5_filtros_consultor(consultor_auth_headers):
    """Valida os filtros por DAS atrasado, estoque crítico, próximo do limite e score."""
    # Filtro DAS atrasado
    res_das = client.get("/api/consultor/clientes?filtro_das_atrasado=true", headers=consultor_auth_headers)
    assert res_das.status_code == 200
    for c in res_das.json():
        assert c["qtd_das_atrasados"] > 0

    # Filtro Estoque Crítico
    res_est = client.get("/api/consultor/clientes?filtro_estoque_critico=true", headers=consultor_auth_headers)
    assert res_est.status_code == 200
    for c in res_est.json():
        assert c["quantidade_produtos_criticos"] > 0

    # Filtro Próximo Limite
    res_lim = client.get("/api/consultor/clientes?filtro_proximo_limite=true", headers=consultor_auth_headers)
    assert res_lim.status_code == 200
    for c in res_lim.json():
        assert c["percentual_limite_mei"] >= 80.0

    # Filtro Score Crítico
    res_crit = client.get("/api/consultor/clientes?score=CRITICO", headers=consultor_auth_headers)
    assert res_crit.status_code == 200
    for c in res_crit.json():
        assert c["score"] == "CRITICO"

    # Filtro Busca textual
    res_busca = client.get("/api/consultor/clientes?busca=Navalha", headers=consultor_auth_headers)
    assert res_busca.status_code == 200
    assert len(res_busca.json()) >= 1
    assert "Navalha" in res_busca.json()[0]["nome_fantasia"]


def test_6_detalhes_cliente_consultor(consultor_auth_headers):
    """Valida a consulta individual aos detalhes de um cliente da consultoria."""
    res_list = client.get("/api/consultor/clientes", headers=consultor_auth_headers)
    assert res_list.status_code == 200
    primeiro = res_list.json()[0]

    res_det = client.get(f"/api/consultor/clientes/{primeiro['id']}", headers=consultor_auth_headers)
    assert res_det.status_code == 200
    detalhes = res_det.json()
    assert detalhes["id"] == primeiro["id"]
    assert detalhes["nome_fantasia"] == primeiro["nome_fantasia"]

    # 404 para ID inexistente
    res_404 = client.get("/api/consultor/clientes/999999", headers=consultor_auth_headers)
    assert res_404.status_code == 404

