import pytest
from datetime import datetime
from starlette.requests import Request
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.login_audit import AuditoriaLogin
from app.models.empresa_consultor import EmpresaConsultor
from app.schemas.user import UserCreate
from app.schemas.auth import LoginRequest
from app.routers.users import create_user
from app.routers.auth import login


def test_master_creates_all_four_profiles_and_login_audit():
    db = SessionLocal()
    try:
        # 1. Garante empresa base
        empresa = db.query(Empresa).first()
        if not empresa:
            empresa = Empresa(
                razao_social="Empresa Homologacao MEI",
                nome_fantasia="Homologa MEI",
                cnpj="12345678000199",
                email="contato@homologamei.com.br",
                ativo=True
            )
            db.add(empresa)
            db.commit()
            db.refresh(empresa)

        # 2. Obtem ou cria MASTER executor
        master_executor = db.query(User).filter(User.email == "master@lptitech.com.br").first()
        assert master_executor is not None, "MASTER executor master@lptitech.com.br deve existir"

        # Timestamp único para evitar colisão de e-mails
        ts = int(datetime.utcnow().timestamp())

        # =====================================================================
        # CENÁRIO 1: MASTER cria MASTER
        # =====================================================================
        email_master2 = f"master_novo_{ts}@lptitech.com.br"
        data_master = UserCreate(
            nome="Novo Master Tech",
            email=email_master2,
            password="SenhaForteMaster@123",
            role=UserRole.MASTER,
            empresa_id=None,
            ativo=True
        )
        res_master = create_user(data=data_master, db=db, current_user=master_executor)
        assert res_master.email == email_master2
        assert res_master.role == UserRole.MASTER
        assert res_master.empresa_id is None

        # =====================================================================
        # CENÁRIO 2: MASTER cria OWNER
        # =====================================================================
        email_owner = f"owner_novo_{ts}@homologamei.com.br"
        data_owner = UserCreate(
            nome="Novo Proprietario MEI",
            email=email_owner,
            password="SenhaForteOwner@123",
            role=UserRole.OWNER,
            empresa_id=empresa.id,
            ativo=True
        )
        res_owner = create_user(data=data_owner, db=db, current_user=master_executor)
        assert res_owner.email == email_owner
        assert res_owner.role == UserRole.OWNER
        assert res_owner.empresa_id == empresa.id

        # =====================================================================
        # CENÁRIO 3: MASTER cria CONSULTOR
        # =====================================================================
        email_consultor = f"consultor_novo_{ts}@lptitech.com.br"
        data_consultor = UserCreate(
            nome="Novo Consultor LPTI",
            email=email_consultor,
            password="SenhaForteConsultor@123",
            role=UserRole.CONSULTOR,
            empresa_id=empresa.id,
            ativo=True
        )
        res_consultor = create_user(data=data_consultor, db=db, current_user=master_executor)
        assert res_consultor.email == email_consultor
        assert res_consultor.role == UserRole.CONSULTOR
        assert res_consultor.empresa_id == empresa.id

        # Verifica vínculo automático em EmpresaConsultor
        vinculo = db.query(EmpresaConsultor).filter(
            EmpresaConsultor.empresa_id == empresa.id,
            EmpresaConsultor.user_id == res_consultor.id,
            EmpresaConsultor.ativo == True
        ).first()
        assert vinculo is not None, "Vínculo de consultor deve ser gerado automaticamente"

        # =====================================================================
        # CENÁRIO 4: MASTER cria OPERADOR
        # =====================================================================
        email_operador = f"operador_novo_{ts}@homologamei.com.br"
        data_operador = UserCreate(
            nome="Novo Operador Caixa",
            email=email_operador,
            password="SenhaForteOperador@123",
            role=UserRole.OPERATOR,
            empresa_id=empresa.id,
            ativo=True
        )
        res_operador = create_user(data=data_operador, db=db, current_user=master_executor)
        assert res_operador.email == email_operador
        assert res_operador.role == UserRole.OPERATOR
        assert res_operador.empresa_id == empresa.id

        # =====================================================================
        # VALIDAÇÃO DE LOGIN E AUDITORIA PARA OS 4 USUÁRIOS
        # =====================================================================
        mock_scope = {
            "type": "http",
            "method": "POST",
            "path": "/api/auth/login",
            "headers": [(b"user-agent", b"Mozilla/5.0 Test Suite")],
            "client": ("127.0.0.1", 12345),
        }
        mock_req = Request(mock_scope)

        test_logins = [
            (email_master2, "SenhaForteMaster@123", UserRole.MASTER, None),
            (email_owner, "SenhaForteOwner@123", UserRole.OWNER, empresa.id),
            (email_consultor, "SenhaForteConsultor@123", UserRole.CONSULTOR, empresa.id),
            (email_operador, "SenhaForteOperador@123", UserRole.OPERATOR, empresa.id),
        ]

        for email, pwd, expected_role, expected_empresa in test_logins:
            token_resp = login(
                request=mock_req,
                data=LoginRequest(email=email, password=pwd),
                db=db
            )
            assert token_resp.access_token is not None
            assert token_resp.email == email
            assert token_resp.role == expected_role
            assert token_resp.empresa_id == expected_empresa

            # Confirma auditoria gerada
            audit = db.query(AuditoriaLogin).filter(
                AuditoriaLogin.email == email,
                AuditoriaLogin.sucesso == True
            ).order_by(AuditoriaLogin.id.desc()).first()
            assert audit is not None, f"Auditoria de login com sucesso deve existir para {email}"
            assert audit.provider == "LOCAL"
            assert audit.ip == "127.0.0.1"

        print("\n[OK] Todos os 4 perfis criados e logados com sucesso com auditoria confirmada!")

    finally:
        db.close()
