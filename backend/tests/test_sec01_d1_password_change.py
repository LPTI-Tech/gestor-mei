import pytest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.login_audit import AuditoriaLogin
from app.security import hash_password, verify_password, create_access_token
from app.rate_limiter import limiter


@pytest.fixture(autouse=True)
def disable_rate_limits():
    """Desativa o rate limiter durante a execução da suíte para testes determinísticos."""
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture
def client():
    return TestClient(app)


def get_auth_headers(user: User) -> dict:
    token_payload = {
        "sub": user.email,
        "empresa_id": user.empresa_id,
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role)
    }
    token = create_access_token(token_payload)
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# TESTE 1: FLUXO FELIZ (TROCA BEM-SUCEDIDA)
# ==============================================================================

def test_01_fluxo_feliz_troca_senha(client):
    """
    TESTE 1:
    Usuário com must_change_password=True fornece senha provisória válida
    e nova senha forte. O endpoint deve retornar 200, atualizar o hash no banco,
    definir must_change_password=False, password_changed_at com timestamp
    e registrar a auditoria correspondente.
    """
    db = SessionLocal()
    email = "sec01_test1_happy@lptitech.com.br"
    temp_pass = "TempSenha123!"
    new_pass = "NovaSenhaForte2026!"

    # Limpa registros anteriores se existirem
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.query(AuditoriaLogin).filter(AuditoriaLogin.user_id == user.id).delete()
        db.delete(user)
        db.commit()

    user = User(
        nome="Usuario Teste 1 Happy",
        email=email,
        hashed_password=hash_password(temp_pass),
        role=UserRole.OWNER,
        ativo=True,
        must_change_password=True,
        password_changed_at=None,
        empresa_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    headers = get_auth_headers(user)

    payload = {
        "senha_atual": temp_pass,
        "nova_senha": new_pass,
        "confirmacao_nova_senha": new_pass
    }

    response = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload, headers=headers)
    assert response.status_code == 200, f"Esperado 200, obtido {response.status_code}: {response.text}"
    data = response.json()
    assert data["must_change_password"] is False
    assert "Senha alterada com sucesso" in data["mensagem"]

    # Validações no Banco de Dados
    db = SessionLocal()
    updated_user = db.query(User).filter(User.id == user_id).first()
    assert updated_user is not None
    assert updated_user.must_change_password is False
    assert updated_user.password_changed_at is not None
    assert verify_password(new_pass, updated_user.hashed_password) is True
    assert verify_password(temp_pass, updated_user.hashed_password) is False

    # Validação de Auditoria
    audit = db.query(AuditoriaLogin).filter(
        AuditoriaLogin.user_id == user_id,
        AuditoriaLogin.provider == "LOCAL_PASSWORD_CHANGE"
    ).first()
    assert audit is not None
    assert audit.sucesso is True
    assert audit.email == email
    db.close()


# ==============================================================================
# TESTE 2: REJEIÇÃO COM SENHA ATUAL INCORRETA
# ==============================================================================

def test_02_rejeicao_senha_atual_incorreta(client):
    """
    TESTE 2:
    Usuário tenta realizar a troca informando senha_atual incorreta.
    Deve ser rejeitado com HTTP 400 e não alterar nenhum dado no banco.
    """
    db = SessionLocal()
    email = "sec01_test2_wrong_pass@lptitech.com.br"
    temp_pass = "TempSenha123!"

    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()

    user = User(
        nome="Usuario Teste 2 Wrong Pass",
        email=email,
        hashed_password=hash_password(temp_pass),
        role=UserRole.OWNER,
        ativo=True,
        must_change_password=True,
        password_changed_at=None,
        empresa_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    headers = get_auth_headers(user)

    payload = {
        "senha_atual": "SenhaTotalmenteIncorreta123!",
        "nova_senha": "NovaSenhaForte2026!",
        "confirmacao_nova_senha": "NovaSenhaForte2026!"
    }

    response = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload, headers=headers)
    assert response.status_code == 400
    assert "Senha atual incorreta" in response.json()["detail"]

    # Garante integridade no banco
    db = SessionLocal()
    u = db.query(User).filter(User.id == user_id).first()
    assert u.must_change_password is True
    assert u.password_changed_at is None
    assert verify_password(temp_pass, u.hashed_password) is True
    db.close()


# ==============================================================================
# TESTE 3: REJEIÇÃO COM CONFIRMAÇÃO DE SENHA DIFERENTE
# ==============================================================================

def test_03_rejeicao_confirmacao_diferente(client):
    """
    TESTE 3:
    Usuário fornece nova_senha != confirmacao_nova_senha.
    Deve ser rejeitado com HTTP 400.
    """
    db = SessionLocal()
    email = "sec01_test3_mismatch@lptitech.com.br"
    temp_pass = "TempSenha123!"

    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()

    user = User(
        nome="Usuario Teste 3 Mismatch",
        email=email,
        hashed_password=hash_password(temp_pass),
        role=UserRole.OPERATOR,
        ativo=True,
        must_change_password=True,
        empresa_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    headers = get_auth_headers(user)

    payload = {
        "senha_atual": temp_pass,
        "nova_senha": "NovaSenhaForte2026!",
        "confirmacao_nova_senha": "OutraSenhaDiferente2026!"
    }

    response = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload, headers=headers)
    assert response.status_code == 400
    assert "confirmação da nova senha não confere" in response.json()["detail"].lower()


# ==============================================================================
# TESTE 4: REJEIÇÃO DE SENHA FRACA
# ==============================================================================

@pytest.mark.parametrize("weak_pass,error_keyword", [
    ("Curta1!", "mínimo 8 caracteres"),
    ("sem_maiuscula_123!", "letra maiúscula"),
    ("SEM_MINUSCULA_123!", "letra minúscula"),
    ("SemNumeroExclamacao!", "número"),
    ("TempSenha123!", "igual à senha provisória/atual"),  # Reutilização da senha atual
])
def test_04_rejeicao_senha_fraca(client, weak_pass, error_keyword):
    """
    TESTE 4:
    Validação da política de complexidade de senha:
    - Mínimo 8 caracteres
    - Pelo menos 1 maiúscula
    - Pelo menos 1 minúscula
    - Pelo menos 1 número
    - Diferente da senha atual
    """
    db = SessionLocal()
    email = "sec01_test4_weak@lptitech.com.br"
    temp_pass = "TempSenha123!"

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            nome="Usuario Teste 4 Weak",
            email=email,
            hashed_password=hash_password(temp_pass),
            role=UserRole.CONSULTOR,
            ativo=True,
            must_change_password=True,
            empresa_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()

    headers = get_auth_headers(user)

    payload = {
        "senha_atual": temp_pass,
        "nova_senha": weak_pass,
        "confirmacao_nova_senha": weak_pass
    }

    response = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload, headers=headers)
    assert response.status_code == 400
    assert error_keyword.lower() in response.json()["detail"].lower()


# ==============================================================================
# TESTE 5: REJEIÇÃO DE SENHA MAIOR QUE 72 BYTES (UTF-8 / MULTIBYTE)
# ==============================================================================

def test_05_rejeicao_senha_maior_72_bytes(client):
    """
    TESTE 5:
    Valida que senhas que excedem 72 bytes em UTF-8 são estritamente rejeitadas
    com HTTP 400 antes do hash bcrypt, impedindo truncamento silencioso.
    Testa tanto ASCII (> 72 caracteres) quanto multibyte (caracteres acentuados).
    """
    db = SessionLocal()
    email = "sec01_test5_bytes@lptitech.com.br"
    temp_pass = "TempSenha123!"

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            nome="Usuario Teste 5 Bytes",
            email=email,
            hashed_password=hash_password(temp_pass),
            role=UserRole.OWNER,
            ativo=True,
            must_change_password=True,
            empresa_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()

    headers = get_auth_headers(user)

    # 1. Caso ASCII > 72 bytes (73 caracteres ASCII = 73 bytes)
    ascii_long = "A" * 60 + "SenhaForte123!"  # 60 + 14 = 74 bytes
    assert len(ascii_long.encode("utf-8")) > 72
    payload_ascii = {
        "senha_atual": temp_pass,
        "nova_senha": ascii_long,
        "confirmacao_nova_senha": ascii_long
    }
    res_ascii = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload_ascii, headers=headers)
    assert res_ascii.status_code == 400
    assert "72 bytes" in res_ascii.json()["detail"]

    # 2. Caso Multibyte UTF-8: caracteres de 2 bytes (ex: 'ç', 'á')
    # 40 caracteres, mas mais de 72 bytes UTF-8
    multibyte_long = "Senha123!" + "çãõáéíóú" * 5  # 9 + 40 = 49 chars, mas 9 + (40 * 2) = 89 bytes
    assert len(multibyte_long.encode("utf-8")) > 72
    payload_multi = {
        "senha_atual": temp_pass,
        "nova_senha": multibyte_long,
        "confirmacao_nova_senha": multibyte_long
    }
    res_multi = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload_multi, headers=headers)
    assert res_multi.status_code == 400
    assert "72 bytes" in res_multi.json()["detail"]


# ==============================================================================
# TESTE 6: REJEIÇÃO DE USUÁRIO JÁ REGULARIZADO (MUST_CHANGE_PASSWORD=FALSE)
# ==============================================================================

def test_06_rejeicao_usuario_ja_regularizado(client):
    """
    TESTE 6:
    Usuário que já possui must_change_password=False tenta chamar o endpoint.
    Deve ser rejeitado com HTTP 400 indicando que a troca já foi realizada ou não é necessária.
    """
    db = SessionLocal()
    email = "sec01_test6_regularized@lptitech.com.br"
    current_pass = "SenhaDefinitiva123!"

    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()

    user = User(
        nome="Usuario Teste 6 Regularized",
        email=email,
        hashed_password=hash_password(current_pass),
        role=UserRole.OWNER,
        ativo=True,
        must_change_password=False,
        password_changed_at=datetime.utcnow(),
        empresa_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    headers = get_auth_headers(user)

    payload = {
        "senha_atual": current_pass,
        "nova_senha": "OutraNovaSenha2026!",
        "confirmacao_nova_senha": "OutraNovaSenha2026!"
    }

    response = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload, headers=headers)
    assert response.status_code == 400
    detail = response.json()["detail"].lower()
    assert "não é necessária" in detail or "já foi realizada" in detail


# ==============================================================================
# TESTE 7: CONCORRÊNCIA (DUAS REQUISIÇÕES CONCORRENTES)
# ==============================================================================

def test_07_concorrencia_dupla_requisicao(client):
    """
    TESTE 7:
    Duas requisições simultâneas com payload válido para o mesmo usuário.
    Graças ao predicado atômico `filter(User.id == current_user.id, User.must_change_password == True)`,
    exatamente uma deve ter sucesso (200) e a outra deve ser rejeitada (400).
    No banco, deve existir exatamente 1 registro de auditoria LOCAL_PASSWORD_CHANGE
    e a senha deve ser atualizada exatamente uma vez.
    """
    db = SessionLocal()
    email = "sec01_test7_race@lptitech.com.br"
    temp_pass = "TempSenha123!"
    new_pass = "NovaSenhaForte2026!"

    user = db.query(User).filter(User.email == email).first()
    if user:
        db.query(AuditoriaLogin).filter(AuditoriaLogin.user_id == user.id).delete()
        db.delete(user)
        db.commit()

    user = User(
        nome="Usuario Teste 7 Race",
        email=email,
        hashed_password=hash_password(temp_pass),
        role=UserRole.OPERATOR,
        ativo=True,
        must_change_password=True,
        password_changed_at=None,
        empresa_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    headers = get_auth_headers(user)

    payload = {
        "senha_atual": temp_pass,
        "nova_senha": new_pass,
        "confirmacao_nova_senha": new_pass
    }

    def send_request():
        # Usa um client TestClient em thread
        c = TestClient(app)
        return c.post("/api/auth/trocar-senha-primeiro-acesso", json=payload, headers=headers)

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(send_request)
        f2 = executor.submit(send_request)
        res1 = f1.result()
        res2 = f2.result()

    status_codes = sorted([res1.status_code, res2.status_code])
    assert status_codes == [200, 400], f"Esperado [200, 400], obtido: {status_codes}. Detalhes: {res1.text} | {res2.text}"

    # Verificações no Banco de Dados
    db = SessionLocal()
    u = db.query(User).filter(User.id == user_id).first()
    assert u.must_change_password is False
    assert u.password_changed_at is not None
    assert verify_password(new_pass, u.hashed_password) is True

    # Exatamente 1 auditoria gerada
    audits = db.query(AuditoriaLogin).filter(
        AuditoriaLogin.user_id == user_id,
        AuditoriaLogin.provider == "LOCAL_PASSWORD_CHANGE"
    ).all()
    assert len(audits) == 1, f"Esperado exatamente 1 auditoria, encontrado {len(audits)}"
    db.close()


# ==============================================================================
# TESTE 8: ATOMICIDADE E ROLLBACK TRANSACIONAL
# ==============================================================================

def test_08_atomicidade_e_rollback(client):
    """
    TESTE 8:
    Simula uma falha inesperada durante a criação do registro de auditoria
    (na mesma transação do update da senha).
    Deve disparar rollback completo:
    - Retornar HTTP 500
    - A senha do usuário NÃO deve mudar (continua a provisória)
    - must_change_password continua True
    - password_changed_at continua None
    """
    db = SessionLocal()
    email = "sec01_test8_rollback@lptitech.com.br"
    temp_pass = "TempSenha123!"
    new_pass = "NovaSenhaForte2026!"

    user = db.query(User).filter(User.email == email).first()
    if user:
        db.query(AuditoriaLogin).filter(AuditoriaLogin.user_id == user.id).delete()
        db.delete(user)
        db.commit()

    initial_hash = hash_password(temp_pass)
    user = User(
        nome="Usuario Teste 8 Rollback",
        email=email,
        hashed_password=initial_hash,
        role=UserRole.CONSULTOR,
        ativo=True,
        must_change_password=True,
        password_changed_at=None,
        empresa_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    headers = get_auth_headers(user)

    payload = {
        "senha_atual": temp_pass,
        "nova_senha": new_pass,
        "confirmacao_nova_senha": new_pass
    }

    # Força erro na persistência do registro de auditoria
    with patch("app.routers.auth.AuditoriaLogin", side_effect=Exception("Falha simulada de I/O em Auditoria")):
        response = client.post("/api/auth/trocar-senha-primeiro-acesso", json=payload, headers=headers)
        assert response.status_code == 500
        assert "Erro interno ao atualizar senha e auditoria" in response.json()["detail"]

    # Validação pós-rollback
    db = SessionLocal()
    u = db.query(User).filter(User.id == user_id).first()
    assert u.must_change_password is True
    assert u.password_changed_at is None
    assert u.hashed_password == initial_hash
    assert verify_password(temp_pass, u.hashed_password) is True
    assert verify_password(new_pass, u.hashed_password) is False

    # Nenhuma auditoria residual foi gravada
    audits = db.query(AuditoriaLogin).filter(
        AuditoriaLogin.user_id == user_id,
        AuditoriaLogin.provider == "LOCAL_PASSWORD_CHANGE"
    ).all()
    assert len(audits) == 0
    db.close()


# ==============================================================================
# TESTE 9: VERIFICAÇÃO DO PROVISIONAMENTO DE OWNER (EMPRESAS.PY)
# ==============================================================================

def test_09_provisionamento_owner_define_must_change_password(client):
    """
    TESTE 9:
    Garante que a criação de nova empresa com seu OWNER inicial
    define explicitamente must_change_password=True e password_changed_at=None.
    """
    db = SessionLocal()
    # Garante usuário MASTER para criar a empresa
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    if not master:
        master = User(
            nome="Master Provisionador",
            email="master_prov_test@lptitech.com.br",
            hashed_password=hash_password("MasterPass123!"),
            role=UserRole.MASTER,
            ativo=True
        )
        db.add(master)
        db.commit()
        db.refresh(master)
    db.close()

    master_headers = get_auth_headers(master)

    cnpj_teste = "98.765.432/0001-99"
    email_owner = "owner_prov_teste@empresa.com.br"

    # Remove se existir
    db = SessionLocal()
    old_emp = db.query(Empresa).filter(Empresa.cnpj == cnpj_teste).first()
    if old_emp:
        db.query(User).filter(User.empresa_id == old_emp.id).delete()
        db.delete(old_emp)
        db.commit()
    db.close()

    empresa_payload = {
        "nome_empresarial": "Empresa Teste Provisionamento MEI",
        "nome_fantasia": "Empresa Teste Prov",
        "cnpj": cnpj_teste,
        "cpf_proprietario": "987.654.321-00",
        "email": email_owner,
        "nome_owner": "Owner Titular Teste",
        "email_owner": email_owner,
        "senha_owner": "TempOwnerPass123!"
    }

    res = client.post("/api/empresa", json=empresa_payload, headers=master_headers)
    assert res.status_code == 201, f"Falha ao criar empresa: {res.text}"

    db = SessionLocal()
    created_owner = db.query(User).filter(User.email == email_owner).first()
    assert created_owner is not None
    assert created_owner.role == UserRole.OWNER
    assert created_owner.must_change_password is True
    assert created_owner.password_changed_at is None
    db.close()
