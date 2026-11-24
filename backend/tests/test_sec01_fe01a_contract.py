import pytest
from unittest.mock import patch
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.security import hash_password, create_access_token
from app.rate_limiter import limiter


@pytest.fixture(autouse=True)
def disable_rate_limits():
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture
def client():
    return TestClient(app)


def make_auth_headers(email: str, user_id: int, role: str, empresa_id: int = None) -> dict:
    token_payload = {
        "sub": email,
        "empresa_id": empresa_id,
        "user_id": user_id,
        "role": role
    }
    token = create_access_token(token_payload)
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# TESTE 1: LOGIN LOCAL COM must_change_password=True
# ==============================================================================

def test_01_login_local_must_change_password_true(client):
    db = SessionLocal()
    email = "fe01a_user_pending@lptitech.com.br"
    password = "TempPass123!"

    u = db.query(User).filter(User.email == email).first()
    if u:
        db.delete(u)
        db.commit()

    u = User(
        nome="Usuario Pendente",
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.OWNER,
        ativo=True,
        must_change_password=True,
        password_changed_at=None,
        empresa_id=None
    )
    db.add(u)
    db.commit()
    db.close()

    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Falha no login: {res.text}"
    data = res.json()
    assert "must_change_password" in data, "must_change_password ausente no retorno de Token"
    assert data["must_change_password"] is True, f"Esperado True, obtido {data['must_change_password']}"


# ==============================================================================
# TESTE 2: LOGIN LOCAL COM must_change_password=False
# ==============================================================================

def test_02_login_local_must_change_password_false(client):
    db = SessionLocal()
    email = "fe01a_user_regular@lptitech.com.br"
    password = "RegularPass123!"

    u = db.query(User).filter(User.email == email).first()
    if u:
        db.delete(u)
        db.commit()

    u = User(
        nome="Usuario Regular",
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.OWNER,
        ativo=True,
        must_change_password=False,
        password_changed_at=datetime.utcnow(),
        empresa_id=None
    )
    db.add(u)
    db.commit()
    db.close()

    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Falha no login: {res.text}"
    data = res.json()
    assert "must_change_password" in data, "must_change_password ausente no retorno de Token"
    assert data["must_change_password"] is False, f"Esperado False, obtido {data['must_change_password']}"


# ==============================================================================
# TESTE 3: GET /api/auth/me RETORNA O VALOR REAL DO USUÁRIO
# ==============================================================================

def test_03_get_me_retorna_valor_real(client):
    db = SessionLocal()
    email_pendente = "fe01a_me_pending@lptitech.com.br"
    email_regular = "fe01a_me_regular@lptitech.com.br"

    # Usuário 1: pendente
    u1 = db.query(User).filter(User.email == email_pendente).first()
    if not u1:
        u1 = User(
            nome="Me Pendente",
            email=email_pendente,
            hashed_password=hash_password("Pass123!"),
            role=UserRole.OWNER,
            ativo=True,
            must_change_password=True
        )
        db.add(u1)
        db.commit()
        db.refresh(u1)
    else:
        u1.must_change_password = True
        db.commit()
    u1_id = u1.id
    u1_role = u1.role.value

    # Usuário 2: regular
    u2 = db.query(User).filter(User.email == email_regular).first()
    if not u2:
        u2 = User(
            nome="Me Regular",
            email=email_regular,
            hashed_password=hash_password("Pass123!"),
            role=UserRole.OWNER,
            ativo=True,
            must_change_password=False
        )
        db.add(u2)
        db.commit()
        db.refresh(u2)
    else:
        u2.must_change_password = False
        db.commit()
    u2_id = u2.id
    u2_role = u2.role.value
    db.close()

    # Validação do Usuário 1
    h1 = make_auth_headers(email_pendente, u1_id, u1_role)
    res1 = client.get("/api/auth/me", headers=h1)
    assert res1.status_code == 200
    user_data1 = res1.json()["user"]
    assert "must_change_password" in user_data1
    assert user_data1["must_change_password"] is True

    # Validação do Usuário 2
    h2 = make_auth_headers(email_regular, u2_id, u2_role)
    res2 = client.get("/api/auth/me", headers=h2)
    assert res2.status_code == 200
    user_data2 = res2.json()["user"]
    assert "must_change_password" in user_data2
    assert user_data2["must_change_password"] is False


# ==============================================================================
# TESTE 4: GOOGLE OAUTH PRESERVADO E FUNCIONAL
# ==============================================================================

def test_04_google_oauth_preservado(client):
    db = SessionLocal()
    emp = db.query(Empresa).filter(Empresa.id == 1).first()
    if not emp:
        emp = Empresa(id=1, nome_empresarial="Empresa Google", nome_fantasia="Emp Google", cnpj="11.111.111/0001-11", cpf_proprietario="111.111.111-11", email="google@emp.com")
        db.add(emp)
        db.commit()

    email_social = "social_google_user@gmail.com"
    u = db.query(User).filter(User.email == email_social).first()
    if not u:
        u = User(
            nome="Usuario Google",
            email=email_social,
            hashed_password=hash_password("SocPass123!"),
            role=UserRole.OWNER,
            empresa_id=1,
            ativo=True,
            must_change_password=False
        )
        db.add(u)
        db.commit()
    db.close()

    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "sub": "google-sub-fe01a",
            "email": email_social,
            "email_verified": "true",
            "name": "Usuario Google",
            "picture": None
        }

        res = client.post("/api/auth/google", json={"credential": "mock-token-google-valid-length"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "must_change_password" in data
        assert data["must_change_password"] is False


# ==============================================================================
# TESTE 5: MICROSOFT OAUTH PRESERVADO E FUNCIONAL
# ==============================================================================

def test_05_microsoft_oauth_preservado(client):
    db = SessionLocal()
    email_social = "social_ms_user@outlook.com"
    u = db.query(User).filter(User.email == email_social).first()
    if not u:
        u = User(
            nome="Usuario MS",
            email=email_social,
            hashed_password=hash_password("SocPass123!"),
            role=UserRole.OWNER,
            empresa_id=1,
            ativo=True,
            must_change_password=False
        )
        db.add(u)
        db.commit()
    db.close()

    with patch("requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "id": "ms-sub-fe01a",
            "mail": email_social,
            "displayName": "Usuario MS"
        }

        res = client.post("/api/auth/microsoft", json={"token": "mock-token-ms-valid-length", "token_type": "access_token"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "must_change_password" in data
        assert data["must_change_password"] is False


# ==============================================================================
# TESTE 6: MASTER PRESERVADO E FUNCIONAL
# ==============================================================================

def test_06_master_preservado(client):
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    if not master:
        master = User(
            nome="Master LPTI",
            email="master_fe01a@lptitech.com.br",
            hashed_password=hash_password("MasterPass123!"),
            role=UserRole.MASTER,
            ativo=True,
            must_change_password=False
        )
        db.add(master)
        db.commit()
        db.refresh(master)
    else:
        master.must_change_password = False
        db.commit()
    m_email = master.email
    m_id = master.id
    m_role = master.role.value
    db.close()

    master_headers = make_auth_headers(m_email, m_id, m_role)

    # Verifica GET /api/auth/me do MASTER
    res = client.get("/api/auth/me", headers=master_headers)
    assert res.status_code == 200
    user_data = res.json()["user"]
    assert user_data["role"] == "MASTER"
    assert user_data["must_change_password"] is False


# ==============================================================================
# TESTE 7: GET /api/users RETORNA LISTA COM must_change_password
# ==============================================================================

def test_07_get_users_retorna_must_change_password(client):
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    m_email = master.email
    m_id = master.id
    m_role = master.role.value
    db.close()

    master_headers = make_auth_headers(m_email, m_id, m_role)

    res = client.get("/api/users", headers=master_headers)
    assert res.status_code == 200
    users_list = res.json()
    assert isinstance(users_list, list)
    assert len(users_list) > 0
    for u_item in users_list:
        assert "must_change_password" in u_item, f"Campo ausente em {u_item}"
        assert isinstance(u_item["must_change_password"], bool)


# ==============================================================================
# TESTE 8: POST /api/users CRIA USUÁRIO E RETORNA must_change_password
# ==============================================================================

def test_08_post_users_retorna_must_change_password(client):
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    m_email = master.email
    m_id = master.id
    m_role = master.role.value

    email_new = "created_user_fe01a@empresa.com.br"
    old = db.query(User).filter(User.email == email_new).first()
    if old:
        db.delete(old)
        db.commit()
    db.close()

    master_headers = make_auth_headers(m_email, m_id, m_role)

    payload = {
        "nome": "Novo Usuario Criado",
        "email": email_new,
        "password": "SenhaNovo123!",
        "role": "OPERATOR",
        "empresa_id": 1
    }

    res = client.post("/api/users", json=payload, headers=master_headers)
    assert res.status_code == 200, f"Erro ao criar user: {res.text}"
    data = res.json()
    assert "must_change_password" in data
    assert isinstance(data["must_change_password"], bool)


# ==============================================================================
# TESTE 9: PUT /api/users/{id} ATUALIZA E RETORNA must_change_password
# ==============================================================================

def test_09_put_users_retorna_must_change_password(client):
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    m_email = master.email
    m_id = master.id
    m_role = master.role.value

    target_user = db.query(User).filter(User.email == "created_user_fe01a@empresa.com.br").first()
    user_id = target_user.id
    db.close()

    master_headers = make_auth_headers(m_email, m_id, m_role)

    update_payload = {
        "nome": "Nome Atualizado FE01A",
        "email": "created_user_fe01a@empresa.com.br"
    }

    res = client.put(f"/api/users/{user_id}", json=update_payload, headers=master_headers)
    assert res.status_code == 200, f"Erro ao atualizar user: {res.text}"
    data = res.json()
    assert data["nome"] == "Nome Atualizado FE01A"
    assert "must_change_password" in data


# ==============================================================================
# TESTE 10: PUT /api/users/{id}/alterar-perfil RETORNA must_change_password
# ==============================================================================

def test_10_alterar_perfil_retorna_must_change_password(client):
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    m_email = master.email
    m_id = master.id
    m_role = master.role.value

    target_user = db.query(User).filter(User.email == "created_user_fe01a@empresa.com.br").first()
    user_id = target_user.id
    db.close()

    master_headers = make_auth_headers(m_email, m_id, m_role)

    res = client.put(f"/api/users/{user_id}/alterar-perfil", json={"novo_perfil": "CONSULTOR"}, headers=master_headers)
    assert res.status_code == 200, f"Erro ao alterar perfil: {res.text}"
    data = res.json()
    assert data["role"] == "CONSULTOR"
    assert "must_change_password" in data


# ==============================================================================
# TESTE 11: PUT /api/users/{id}/toggle-status RETORNA must_change_password
# ==============================================================================

def test_11_toggle_status_retorna_must_change_password(client):
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    m_email = master.email
    m_id = master.id
    m_role = master.role.value

    target_user = db.query(User).filter(User.email == "created_user_fe01a@empresa.com.br").first()
    user_id = target_user.id
    db.close()

    master_headers = make_auth_headers(m_email, m_id, m_role)

    res = client.put(f"/api/users/{user_id}/toggle-status", headers=master_headers)
    assert res.status_code == 200, f"Erro ao toggle status: {res.text}"
    data = res.json()
    assert "ativo" in data
    assert "must_change_password" in data


# ==============================================================================
# TESTE 12: ENDPOINTS ADMINISTRATIVOS NÃO PERMITEM ALTERAR must_change_password
# ==============================================================================

def test_12_endpoints_administrativos_ignoram_must_change_password_injetado(client):
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    m_email = master.email
    m_id = master.id
    m_role = master.role.value

    email_sec = "security_check_fe01a@empresa.com.br"
    u = db.query(User).filter(User.email == email_sec).first()
    if not u:
        u = User(
            nome="Sec Check",
            email=email_sec,
            hashed_password=hash_password("Pass123!"),
            role=UserRole.OPERATOR,
            empresa_id=1,
            ativo=True,
            must_change_password=True
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        u.must_change_password = True
        db.commit()
    user_id = u.id
    db.close()

    master_headers = make_auth_headers(m_email, m_id, m_role)

    # Tenta burlar e passar must_change_password=False no update de usuário
    payload_com_injecao = {
        "nome": "Sec Check Alterado",
        "email": email_sec,
        "must_change_password": False
    }

    res = client.put(f"/api/users/{user_id}", json=payload_com_injecao, headers=master_headers)
    assert res.status_code == 200

    # Verifica no banco de dados se must_change_password continua True
    db = SessionLocal()
    u_after = db.query(User).filter(User.id == user_id).first()
    assert u_after.must_change_password is True, "must_change_password NÃO pode ser alterado via PUT /api/users"
    db.close()


# ==============================================================================
# TESTE 13 (VALIDAÇÃO EXTRA): PARIDADE ABSOLUTA TOKEN vs GET /api/auth/me
# ==============================================================================

def test_13_paridade_absoluta_token_vs_get_me(client):
    """
    VALIDAÇÃO EXTRA (SEC-01-FE-01A):
    Compara Token.must_change_password (retornado no login)
    com GET /api/auth/me -> user.must_change_password para o mesmo usuário.
    Garante que os valores sejam SEMPRE idênticos em todos os estados do ciclo de vida,
    impedindo qualquer divergência entre login e sessão carregada no Frontend.
    """
    db = SessionLocal()
    email_parity = "fe01a_parity_check@lptitech.com.br"
    temp_pass = "TempPassParity123!"
    new_pass = "NovaSenhaForte2026!"

    u = db.query(User).filter(User.email == email_parity).first()
    if u:
        db.delete(u)
        db.commit()

    u = User(
        nome="Usuario Paridade",
        email=email_parity,
        hashed_password=hash_password(temp_pass),
        role=UserRole.OWNER,
        ativo=True,
        must_change_password=True,
        password_changed_at=None,
        empresa_id=None
    )
    db.add(u)
    db.commit()
    db.close()

    # --- FASE 1: USUÁRIO PENDENTE ---
    res_login_1 = client.post("/api/auth/login", json={"email": email_parity, "password": temp_pass})
    assert res_login_1.status_code == 200
    token_data_1 = res_login_1.json()
    token_flag_1 = token_data_1.get("must_change_password")

    auth_headers_1 = {"Authorization": f"Bearer {token_data_1['access_token']}"}
    res_me_1 = client.get("/api/auth/me", headers=auth_headers_1)
    assert res_me_1.status_code == 200
    me_data_1 = res_me_1.json()["user"]
    me_flag_1 = me_data_1.get("must_change_password")

    # Comprovação de paridade absoluta (True == True)
    assert token_flag_1 is True, f"Token deve conter True, obtido: {token_flag_1}"
    assert me_flag_1 is True, f"GET /me deve conter True, obtido: {me_flag_1}"
    assert token_flag_1 == me_flag_1, (
        f"DIVERGÊNCIA DETECTADA: Token ({token_flag_1}) != GET /me ({me_flag_1})"
    )

    # --- FASE 2: REALIZAÇÃO DA TROCA OBRIGATÓRIA ---
    troca_payload = {
        "senha_atual": temp_pass,
        "nova_senha": new_pass,
        "confirmacao_nova_senha": new_pass
    }
    res_troca = client.post("/api/auth/trocar-senha-primeiro-acesso", json=troca_payload, headers=auth_headers_1)
    assert res_troca.status_code == 200

    # --- FASE 3: USUÁRIO REGULARIZADO PÓS-TROCA ---
    res_login_2 = client.post("/api/auth/login", json={"email": email_parity, "password": new_pass})
    assert res_login_2.status_code == 200
    token_data_2 = res_login_2.json()
    token_flag_2 = token_data_2.get("must_change_password")

    auth_headers_2 = {"Authorization": f"Bearer {token_data_2['access_token']}"}
    res_me_2 = client.get("/api/auth/me", headers=auth_headers_2)
    assert res_me_2.status_code == 200
    me_data_2 = res_me_2.json()["user"]
    me_flag_2 = me_data_2.get("must_change_password")

    # Comprovação de paridade absoluta (False == False)
    assert token_flag_2 is False, f"Token pós-troca deve conter False, obtido: {token_flag_2}"
    assert me_flag_2 is False, f"GET /me pós-troca deve conter False, obtido: {me_flag_2}"
    assert token_flag_2 == me_flag_2, (
        f"DIVERGÊNCIA DETECTADA PÓS-TROCA: Token ({token_flag_2}) != GET /me ({me_flag_2})"
    )
