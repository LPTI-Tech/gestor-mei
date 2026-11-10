import pytest
from fastapi import HTTPException
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.schemas.empresa import EmpresaStatusUpdate
from app.routers.dashboard import get_dashboard_metrics
from app.routers.empresas import get_metricas_globais_master, toggle_status_empresa_master, listar_todas_empresas_master
from app.routers.users import list_users
from app.dependencies import get_current_empresa
from app.security import hash_password


@pytest.fixture(scope="module")
def rbac04_fixture():
    db = SessionLocal()
    try:
        # Garante Empresa 1
        emp1 = db.query(Empresa).filter(Empresa.id == 1).first()
        if not emp1:
            emp1 = Empresa(
                id=1,
                nome_empresarial="Alpha Lanches MEI",
                nome_fantasia="Alpha Lanches",
                cnpj="11.222.333/0001-44",
                cpf_proprietario="111.222.333-44",
                email="alpha@teste.com",
                ativo=True
            )
            db.add(emp1)
            db.commit()
            db.refresh(emp1)
        else:
            emp1.ativo = True
            emp1.motivo_bloqueio = None
            db.commit()

        # Garante Usuário MASTER
        master = db.query(User).filter(User.email == "master_tst_rbac04@lptitech.com.br").first()
        if not master:
            master = User(
                nome="Master Teste",
                email="master_tst_rbac04@lptitech.com.br",
                hashed_password=hash_password("master123!"),
                role=UserRole.MASTER,
                ativo=True,
                empresa_id=None
            )
            db.add(master)
            db.commit()
            db.refresh(master)

        # Garante Usuário OWNER na Empresa 1
        owner = db.query(User).filter(User.email == "owner_tst_rbac04@alpha.com.br").first()
        if not owner:
            owner = User(
                nome="Owner Teste",
                email="owner_tst_rbac04@alpha.com.br",
                hashed_password=hash_password("owner123!"),
                role=UserRole.OWNER,
                ativo=True,
                empresa_id=emp1.id
            )
            db.add(owner)
            db.commit()
            db.refresh(owner)

        return {
            "master_id": master.id,
            "owner_id": owner.id,
            "emp1_id": emp1.id
        }
    finally:
        db.close()


def test_master_dashboard_metrics_no_500(rbac04_fixture):
    """Garante que MASTER sem contexto de empresa recebe resposta válida do dashboard sem erro 500."""
    db = SessionLocal()
    try:
        master = db.query(User).filter(User.id == rbac04_fixture["master_id"]).first()
        res = get_dashboard_metrics(x_empresa_id=None, db=db, current_user=master)
        assert res.role == "MASTER"
        assert res.venda_dia == 0.0
        assert res.das_alerta_mensagem == "Painel de controle global MASTER ativo."
    finally:
        db.close()


def test_metricas_globais_rbac(rbac04_fixture):
    """Valida métricas globais para perfil MASTER."""
    db = SessionLocal()
    try:
        master = db.query(User).filter(User.id == rbac04_fixture["master_id"]).first()
        metrics = get_metricas_globais_master(db=db, master_user=master)
        assert metrics.total_empresas >= 1
        assert metrics.empresas_ativas >= 1
        assert metrics.total_owners >= 1
        assert metrics.total_masters >= 1
    finally:
        db.close()


def test_bloqueio_desbloqueio_empresa(rbac04_fixture):
    """Testa bloqueio e desbloqueio de empresa e verificação de autorização em get_current_empresa."""
    db = SessionLocal()
    try:
        master = db.query(User).filter(User.id == rbac04_fixture["master_id"]).first()
        owner = db.query(User).filter(User.id == rbac04_fixture["owner_id"]).first()
        emp1_id = rbac04_fixture["emp1_id"]

        # 1. OWNER acessa normalmente enquanto empresa está ativa
        empresa_ok = get_current_empresa(x_empresa_id=None, user=owner, db=db)
        assert empresa_ok.ativo is True

        # 2. MASTER bloqueia a empresa com motivo
        bloqueio_data = EmpresaStatusUpdate(ativo=False, motivo_bloqueio="Inadimplência financeira")
        res_block = toggle_status_empresa_master(empresa_id=emp1_id, data=bloqueio_data, db=db, master_user=master)
        assert res_block.ativo is False
        assert res_block.motivo_bloqueio == "Inadimplência financeira"

        # 3. OWNER é bloqueado com 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            get_current_empresa(x_empresa_id=None, user=owner, db=db)
        assert exc_info.value.status_code == 403
        assert "suspensa temporariamente" in exc_info.value.detail.lower()

        # 4. MASTER continua podendo acessar a empresa para auditoria/desbloqueio
        empresa_master_view = get_current_empresa(x_empresa_id=str(emp1_id), user=master, db=db)
        assert empresa_master_view.id == emp1_id

        # 5. MASTER desbloqueia a empresa
        desbloqueio_data = EmpresaStatusUpdate(ativo=True, motivo_bloqueio=None)
        res_unblock = toggle_status_empresa_master(empresa_id=emp1_id, data=desbloqueio_data, db=db, master_user=master)
        assert res_unblock.ativo is True
        assert res_unblock.motivo_bloqueio is None

        # 6. OWNER volta a ter acesso
        empresa_restored = get_current_empresa(x_empresa_id=None, user=owner, db=db)
        assert empresa_restored.ativo is True
    finally:
        db.close()


def test_master_user_visibility(rbac04_fixture):
    """Valida visibilidade do usuário MASTER apenas para outro MASTER."""
    db = SessionLocal()
    try:
        master = db.query(User).filter(User.id == rbac04_fixture["master_id"]).first()
        owner = db.query(User).filter(User.id == rbac04_fixture["owner_id"]).first()

        # OWNER não vê perfis MASTER
        users_owner_view = list_users(empresa_id=None, db=db, current_user=owner)
        roles_owner_view = [u.role for u in users_owner_view]
        assert "MASTER" not in roles_owner_view
        assert UserRole.MASTER not in roles_owner_view

        # MASTER vê perfis MASTER na listagem global
        users_master_view = list_users(empresa_id=None, db=db, current_user=master)
        roles_master_view = [u.role for u in users_master_view]
        assert (UserRole.MASTER in roles_master_view) or ("MASTER" in roles_master_view)
    finally:
        db.close()
