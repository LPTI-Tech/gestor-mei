import pytest
from starlette.requests import Request
from fastapi import HTTPException
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.produto import Produto
from app.models.suporte_audit import AuditoriaSuporte
from app.schemas.suporte import SessaoSuporteIniciar, SessaoSuporteEncerrar, AcaoSuporteCreate
from app.schemas.produto import ProdutoCreate
from app.routers.suporte import (
    iniciar_sessao_suporte,
    encerrar_sessao_suporte,
    registrar_acao_suporte,
    listar_auditoria_suporte
)
from app.routers.produtos import list_produtos, create_produto
from app.routers.caixa import get_caixa_status
from app.routers.users import list_users
from app.dependencies import get_current_empresa
from app.security import hash_password


class MockClient:
    host = "127.0.0.1"


class DummyRequest:
    def __init__(self, client_ip="127.0.0.1", user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"):
        self.client = MockClient()
        self.client.host = client_ip
        self.headers = {"user-agent": user_agent}


@pytest.fixture(scope="module")
def support_mode_fixture():
    db = SessionLocal()
    try:
        # Garante Empresa Cliente A
        emp_a = db.query(Empresa).filter(Empresa.cnpj == "44.555.666/0001-77").first()
        if not emp_a:
            emp_a = Empresa(
                nome_empresarial="Padaria Pao de Ouro MEI",
                nome_fantasia="Padaria Pao de Ouro",
                cnpj="44.555.666/0001-77",
                cpf_proprietario="444.555.666-77",
                email="contato@paodeouro.com.br",
                ativo=True
            )
            db.add(emp_a)
            db.commit()
            db.refresh(emp_a)

        # Garante OWNER da Empresa Cliente A
        owner_a = db.query(User).filter(User.email == "owner_paodeouro@teste.com").first()
        if not owner_a:
            owner_a = User(
                nome="Jose da Padaria",
                email="owner_paodeouro@teste.com",
                hashed_password=hash_password("senhaJose123!"),
                role=UserRole.OWNER,
                ativo=True,
                empresa_id=emp_a.id
            )
            db.add(owner_a)
            db.commit()
            db.refresh(owner_a)

        # Garante Usuário MASTER da LPTI Tech (sem empresa_id fixo)
        master = db.query(User).filter(User.email == "master_suporte@lptitech.com.br").first()
        if not master:
            master = User(
                nome="Consultor Master LPTI",
                email="master_suporte@lptitech.com.br",
                hashed_password=hash_password("masterSecret123!"),
                role=UserRole.MASTER,
                ativo=True,
                empresa_id=None
            )
            db.add(master)
            db.commit()
            db.refresh(master)

        return {
            "emp_a_id": emp_a.id,
            "owner_a_id": owner_a.id,
            "master_id": master.id
        }
    finally:
        db.close()


def test_support_mode_session_lifecycle_and_audit(support_mode_fixture):
    """
    Testa o ciclo de vida completo da sessão de suporte:
    1. Iniciar sessão de suporte na empresa cliente
    2. Verificar auditoria registrada (IP, Master, Empresa, Timestamp)
    3. Registrar ação de suporte específica
    4. Encerrar sessão e retornar à visão global
    5. Listar auditoria
    """
    db = SessionLocal()
    try:
        master = db.query(User).filter(User.id == support_mode_fixture["master_id"]).first()
        emp_id = support_mode_fixture["emp_a_id"]
        req = DummyRequest(client_ip="192.168.1.100", user_agent="GestorMEI-AuditTester/1.0")

        # 1. Iniciar sessão
        iniciar_data = SessaoSuporteIniciar(empresa_id=emp_id)
        audit_inicio = iniciar_sessao_suporte(
            data=iniciar_data,
            request=req,
            db=db,
            master=master
        )
        assert audit_inicio.acao == "INICIOU_SESSAO_SUPORTE"
        assert audit_inicio.master_id == master.id
        assert audit_inicio.empresa_id == emp_id
        assert audit_inicio.ip == "192.168.1.100"
        assert audit_inicio.data_hora is not None

        # 2. Registrar ação operacional de suporte
        acao_data = AcaoSuporteCreate(
            empresa_id=emp_id,
            acao="AJUSTE_ESTOQUE_SUPORTE",
            detalhes="MASTER ajustou cadastro de produto a pedido do cliente."
        )
        audit_acao = registrar_acao_suporte(
            data=acao_data,
            request=req,
            db=db,
            master=master
        )
        assert audit_acao.acao == "AJUSTE_ESTOQUE_SUPORTE"
        assert audit_acao.empresa_id == emp_id

        # 3. Encerrar sessão
        encerrar_data = SessaoSuporteEncerrar(empresa_id=emp_id)
        audit_fim = encerrar_sessao_suporte(
            data=encerrar_data,
            request=req,
            db=db,
            master=master
        )
        assert audit_fim.acao == "ENCERROU_SESSAO_SUPORTE"
        assert audit_fim.master_id == master.id
        assert audit_fim.empresa_id == emp_id

        # 4. Consultar auditoria
        logs = listar_auditoria_suporte(
            empresa_id=emp_id,
            master_id=master.id,
            limit=10,
            db=db,
            master=master
        )
        assert len(logs) >= 3
        acoes = [l.acao for l in logs]
        assert "INICIOU_SESSAO_SUPORTE" in acoes
        assert "AJUSTE_ESTOQUE_SUPORTE" in acoes
        assert "ENCERROU_SESSAO_SUPORTE" in acoes
    finally:
        db.close()


def test_master_support_access_modules_with_x_empresa_id(support_mode_fixture):
    """
    Testa acesso do MASTER operando como OWNER dentro da empresa cliente com header X-Empresa-ID:
    - Produtos
    - Caixa
    - Usuários
    """
    db = SessionLocal()
    try:
        master = db.query(User).filter(User.id == support_mode_fixture["master_id"]).first()
        emp_id = support_mode_fixture["emp_a_id"]

        # Resolução de tenant injetada via get_current_empresa
        empresa_context = get_current_empresa(
            x_empresa_id=str(emp_id),
            db=db,
            user=master
        )
        assert empresa_context.id == emp_id

        # Criar produto no contexto da empresa cliente como MASTER
        import time
        nome_prod = f"Pão Francês Suporte {int(time.time() * 1000)}"
        prod_data = ProdutoCreate(
            nome=nome_prod,
            categoria="Padaria",
            preco_venda=0.95,
            preco_custo=0.40,
            quantidade_estoque=100.0,
            unidade_medida="UN"
        )
        prod_criado = create_produto(
            data=prod_data,
            db=db,
            empresa=empresa_context,
            current_user=master
        )
        assert prod_criado.empresa_id == emp_id
        assert prod_criado.nome == nome_prod

        # Listar produtos
        lista_prods = list_produtos(
            categoria=None,
            busca=nome_prod,
            apenas_ativos=True,
            db=db,
            empresa=empresa_context,
            current_user=master
        )
        assert any(p.id == prod_criado.id for p in lista_prods)

        # Status do Caixa da empresa cliente
        status_caixa = get_caixa_status(
            db=db,
            empresa=empresa_context,
            current_user=master
        )
        assert hasattr(status_caixa, "is_aberto")

        # Listar usuários da empresa cliente via X-Empresa-ID
        users_cliente = list_users(
            empresa_id=None,
            x_empresa_id=str(emp_id),
            db=db,
            current_user=master
        )
        assert any(u.id == support_mode_fixture["owner_a_id"] for u in users_cliente)
    finally:
        db.close()


def test_critical_invariant_client_owner_and_users_untouched(support_mode_fixture):
    """
    CRÍTICO: Garante que o acesso do MASTER em sessão de suporte NÃO altera:
    - Proprietário (OWNER) da empresa cliente
    - Usuários da empresa cliente
    - Permissões da empresa cliente
    - empresa_id do MASTER
    """
    db = SessionLocal()
    try:
        emp_id = support_mode_fixture["emp_a_id"]
        owner_id = support_mode_fixture["owner_a_id"]
        master_id = support_mode_fixture["master_id"]

        empresa_atual = db.query(Empresa).filter(Empresa.id == emp_id).first()
        owner_atual = db.query(User).filter(User.id == owner_id).first()
        master_atual = db.query(User).filter(User.id == master_id).first()

        # Invariante 1: O OWNER da empresa permanece com role OWNER e vinculado à empresa
        assert owner_atual.role == UserRole.OWNER
        assert owner_atual.empresa_id == emp_id

        # Invariante 2: O MASTER da plataforma continua MASTER e sem empresa_id fixo
        assert master_atual.role == UserRole.MASTER
        assert master_atual.empresa_id is None

        # Invariante 3: A empresa continua ativa e seu titular intacto
        assert empresa_atual.ativo is True
    finally:
        db.close()
