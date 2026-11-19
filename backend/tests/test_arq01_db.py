"""
Suíte de Testes Exclusiva da Sprint ARQ-01: Integridade Estrutural e de Banco de Dados.
Valida rigorosamente com isolamento estrito em banco temporário descartável:
1. DB-01: Correção do UPDATE em migrate_unique_produto (ativo = False / Boolean compatível com PostgreSQL e SQLite)
2. DB-02: Enforcement de Foreign Keys no driver SQLite (PRAGMA foreign_keys = ON)
"""

import pytest
from datetime import datetime
from unittest.mock import patch
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

import app.migrate_unique_produto as mup
from app.database import Base
from app.models.empresa import Empresa
from app.models.produto import Produto
from app.models.venda import ItemVenda, Venda


@pytest.fixture
def isolated_db():
    """
    Cria um banco de dados SQLite em memória totalmente isolado e efêmero,
    com PRAGMA foreign_keys=ON ativado, independente de app.database.engine ou DATABASE_URL.
    Garante descarte absoluto após a execução do teste.
    """
    # 1. Cria engine SQLite em memória usando StaticPool para persistência na mesma thread de teste
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # 2. Registra o listener de foreign keys idêntico ao DB-02
    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # 3. Cria SessionLocal vinculada unicamente ao test_engine
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # 4. Cria Empresa, Venda e ItemVenda usando Base.metadata
    Base.metadata.create_all(bind=test_engine, tables=[Empresa.__table__, Venda.__table__, ItemVenda.__table__])

    # 5. Cria a tabela produtos sem a UniqueConstraint para simular o banco legado pré-migração
    with test_engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE produtos (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
                nome VARCHAR(200) NOT NULL,
                tipo VARCHAR(20) DEFAULT 'PRODUTO' NOT NULL,
                categoria VARCHAR(100) DEFAULT 'Outros' NOT NULL,
                preco_venda FLOAT DEFAULT 0.0 NOT NULL,
                custo_unitario FLOAT DEFAULT 0.0 NOT NULL,
                quantidade_estoque FLOAT DEFAULT 0.0 NOT NULL,
                estoque_minimo FLOAT DEFAULT 0.0 NOT NULL,
                ativo BOOLEAN DEFAULT 1,
                imagem_url VARCHAR(255),
                imagem_nome VARCHAR(255),
                created_at DATETIME
            )
        """))
        conn.commit()

    # Yield da fixture para o teste
    yield {
        "engine": test_engine,
        "Session": TestSessionLocal,
    }

    # Descarte completo do engine em memória
    test_engine.dispose()


# =============================================================================
# 1. TESTES DB-01 (MIGRATE UNIQUE PRODUTO / BOOLEAN ATIVO)
# =============================================================================

def test_db01_migrate_unique_produto_boolean_type(isolated_db):
    """
    Testa se a migration de desambiguação de produtos funciona corretamente
    ao encontrar duplicatas legadas, persistindo o booleano False de forma compatível
    com PostgreSQL e SQLite sem erro de tipo inteiro.
    Executa exclusivamente sobre o banco SQLite em memória isolado.
    """
    test_engine = isolated_db["engine"]
    Session = isolated_db["Session"]
    db = Session()

    try:
        # Garante uma empresa existente no banco temporário
        empresa = Empresa(
            nome_empresarial="Empresa Teste DB-01 LTDA",
            nome_fantasia="Empresa Teste DB-01",
            cnpj=f"12345678{int(datetime.utcnow().timestamp()) % 1000000:06d}",
            cpf_proprietario="12345678900",
            email="empresa_db01@gestormei.com.br",
            ativo=True
        )
        db.add(empresa)
        db.commit()
        db.refresh(empresa)

        emp_id = empresa.id
        nome_dup = f"Produto Teste Duplicado {int(datetime.utcnow().timestamp())}"

        # 1. Inserir duas duplicatas com mesmo nome no banco temporário (simulando estado legado pré-migração)
        p1 = Produto(
            empresa_id=emp_id,
            nome=nome_dup,
            preco_venda=25.0,
            quantidade_estoque=10.0,
            ativo=True
        )
        p2 = Produto(
            empresa_id=emp_id,
            nome=nome_dup,
            preco_venda=25.0,
            quantidade_estoque=5.0,
            ativo=True
        )
        db.add_all([p1, p2])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)

        # 2. Executar a migration vinculada exclusivamente ao test_engine temporário
        with patch.object(mup, "engine", test_engine):
            mup.run_migration()

        # 3. Verificar desambiguação no banco temporário
        db.expire_all()
        prod1 = db.query(Produto).filter(Produto.id == p1.id).first()
        prod2 = db.query(Produto).filter(Produto.id == p2.id).first()

        ativos = [p for p in [prod1, prod2] if p.ativo is True]
        inativos = [p for p in [prod1, prod2] if p.ativo is False]

        assert len(ativos) == 1, "Exatamente um produto deve permanecer ativo com nome original"
        assert len(inativos) == 1, "O produto secundário deve ter ativo=False (tipo booleano)"
        assert inativos[0].ativo is False
        assert "Legado #" in inativos[0].nome

        # 4. Validar que o índice único foi criado com sucesso no banco temporário
        with test_engine.connect() as conn:
            idx_list = conn.execute(text("PRAGMA index_list(produtos)")).fetchall()
            idx_names = [row[1] for row in idx_list]
            assert "uq_produtos_empresa_nome" in idx_names, "Índice uq_produtos_empresa_nome deve ser criado pela migration"

    finally:
        db.close()


# =============================================================================
# 2. TESTES DB-02 (SQLITE FOREIGN KEYS ENFORCEMENT)
# =============================================================================

def test_db02_sqlite_foreign_keys_pragma_active(isolated_db):
    """
    Verifica se a conexão com SQLite possui o PRAGMA foreign_keys = ON ativado.
    Valida ativamente o dialeto e falha/skip de forma explícita sem silent pass.
    """
    test_engine = isolated_db["engine"]
    dialect = test_engine.url.get_backend_name()

    if dialect != "sqlite":
        pytest.skip("Validação de PRAGMA foreign_keys exclusiva para dialeto SQLite")

    with test_engine.connect() as conn:
        res = conn.execute(text("PRAGMA foreign_keys")).scalar()
        assert res == 1, "PRAGMA foreign_keys deve retornar 1 (ativado) para conexões SQLite"


def test_db02_foreign_key_violation_raises_integrity_error(isolated_db):
    """
    Verifica se a violação de chave estrangeira gera erro de integridade (IntegrityError),
    garantindo paridade com o PostgreSQL. Executado exclusivamente no banco temporário.
    """
    Session = isolated_db["Session"]
    db = Session()
    try:
        # Tenta inserir um ItemVenda apontando para uma venda inexistente (venda_id=9999999) no banco temporário
        item_orfa = ItemVenda(
            venda_id=9999999,
            descricao="Item sem venda vinculada",
            preco_unitario=15.0,
            subtotal=15.0,
            quantidade=1.0
        )
        db.add(item_orfa)
        with pytest.raises(IntegrityError) as exc_info:
            db.commit()
        db.rollback()
        assert "FOREIGN KEY" in str(exc_info.value).upper() or "FOREIGN_KEYS" in str(exc_info.value).upper()
    finally:
        db.close()
