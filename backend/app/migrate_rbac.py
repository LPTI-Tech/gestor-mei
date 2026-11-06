"""
Migração e Inicialização de RBAC — Gestão de Usuários Internos.
Garante as colunas ultimo_acesso e criado_por_id, cria tabela empresa_consultores,
converte roles legados (ADMIN -> OWNER, OPERADOR -> OPERATOR) e inicializa
o usuário MASTER global da plataforma LPTI Tech.
"""

import os
from datetime import datetime
from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.config import settings
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.empresa_consultor import EmpresaConsultor
from app.security import hash_password


def align_postgresql_userrole_enum(target_engine):
    """
    Garante que o tipo ENUM 'userrole' no PostgreSQL contenha todos os valores
    necessários para RBAC (MASTER, OWNER, CONSULTOR, OPERATOR).
    Executa com isolation_level='AUTOCOMMIT' para que cada novo valor seja
    efetivado imediatamente no catálogo do PostgreSQL, permitindo seu uso em
    cláusulas UPDATE e INSERT subsequentes sem violar restrições transacionais.
    """
    is_sqlite = target_engine.url.drivername.startswith("sqlite")
    if is_sqlite:
        return

    print("[MIGRATE RBAC] Verificando e alinhando ENUM 'userrole' no PostgreSQL...")
    try:
        with target_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            # Identifica os nomes de ENUM associados à tabela users ou tipo padrão
            type_names = {"userrole"}
            try:
                col_type = conn.execute(text("""
                    SELECT udt_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role'
                """)).fetchone()
                if col_type and col_type[0]:
                    type_names.add(col_type[0])
            except Exception:
                pass

            for tname in type_names:
                type_exists = conn.execute(
                    text("SELECT 1 FROM pg_type WHERE typname = :tname"),
                    {"tname": tname}
                ).scalar()

                if type_exists:
                    # Busca valores já existentes no ENUM
                    existing_rows = conn.execute(text("""
                        SELECT e.enumlabel
                        FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = :tname
                    """), {"tname": tname}).fetchall()
                    existing_values = {row[0] for row in existing_rows}
                    print(f"[MIGRATE RBAC] Valores atuais no ENUM '{tname}': {existing_values}")

                    for val in ["MASTER", "OWNER", "CONSULTOR", "OPERATOR"]:
                        if val not in existing_values:
                            conn.execute(text(f"ALTER TYPE {tname} ADD VALUE IF NOT EXISTS '{val}'"))
                            print(f"[MIGRATE RBAC] Valor '{val}' adicionado ao ENUM '{tname}'.")
    except Exception as e:
        print(f"[MIGRATE RBAC] Aviso ao alinhar ENUM PostgreSQL: {e}")


def run_migration():
    # 0. Alinha o ENUM no PostgreSQL antes de qualquer DML ou transação
    align_postgresql_userrole_enum(engine)

    db = SessionLocal()
    try:
        print("[MIGRATE RBAC] Inicializando migração do Controle de Acesso RBAC...")

        # 1. Garante a criação de todas as tabelas (incluindo empresa_consultores)
        Base.metadata.create_all(bind=engine)

        with engine.connect() as conn:
            # 2. Adiciona colunas na tabela users se não existirem
            is_sqlite = engine.url.drivername.startswith("sqlite")
            
            if is_sqlite:
                result = conn.execute(text("PRAGMA table_info(users)"))
                existing_cols = [row[1] for row in result.fetchall()]
                
                if "ultimo_acesso" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN ultimo_acesso DATETIME"))
                    print("[MIGRATE RBAC] Coluna 'ultimo_acesso' adicionada em users (SQLite).")
                
                if "criado_por_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN criado_por_id INTEGER"))
                    print("[MIGRATE RBAC] Coluna 'criado_por_id' adicionada em users (SQLite).")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP WITHOUT TIME ZONE"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS criado_por_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN empresa_id DROP NOT NULL"))
                print("[MIGRATE RBAC] Colunas adicionadas / ajustadas em users (PostgreSQL).")

            conn.commit()

        # 3. Atualiza roles legados no banco (ADMIN -> OWNER, OPERADOR -> OPERATOR)
        is_sqlite = engine.url.drivername.startswith("sqlite")
        if is_sqlite:
            db.execute(text("UPDATE users SET role = 'OWNER' WHERE UPPER(role) = 'ADMIN'"))
            db.execute(text("UPDATE users SET role = 'OPERATOR' WHERE UPPER(role) = 'OPERADOR'"))
        else:
            db.execute(text("UPDATE users SET role = 'OWNER' WHERE UPPER(role::text) = 'ADMIN'"))
            db.execute(text("UPDATE users SET role = 'OPERATOR' WHERE UPPER(role::text) = 'OPERADOR'"))
        db.commit()
        print("[MIGRATE RBAC] Roles legados migrados para OWNER e OPERATOR.")

        # 4. Provisionamento do usuário MASTER (dependente exclusivamente de MASTER_EMAIL e MASTER_PASSWORD)
        master_email = (settings.MASTER_EMAIL or os.getenv("MASTER_EMAIL", "")).strip().lower()
        master_password = settings.MASTER_PASSWORD or os.getenv("MASTER_PASSWORD", "")
        master_name = settings.MASTER_NAME or os.getenv("MASTER_NAME", "Administrador MASTER (LPTI Tech)").strip()

        if master_email and master_password:
            master_user = db.query(User).filter(User.email == master_email).first()
            if not master_user:
                try:
                    master_user = User(
                        empresa_id=None,
                        nome=master_name,
                        email=master_email,
                        hashed_password=hash_password(master_password),
                        role=UserRole.MASTER,
                        ativo=True,
                        ultimo_acesso=datetime.utcnow()
                    )
                    db.add(master_user)
                    db.commit()
                    print(f"[MIGRATE RBAC] Usuário MASTER '{master_email}' provisionado com sucesso via variáveis de ambiente.")
                except Exception:
                    db.rollback()
                    # Fallback para caso SQLite antigo não permita NULL em empresa_id
                    empresa_primeira = db.query(Empresa).first()
                    primeira_empresa_id = empresa_primeira.id if empresa_primeira else 1
                    master_user = User(
                        empresa_id=primeira_empresa_id,
                        nome=master_name,
                        email=master_email,
                        hashed_password=hash_password(master_password),
                        role=UserRole.MASTER,
                        ativo=True,
                        ultimo_acesso=datetime.utcnow()
                    )
                    db.add(master_user)
                    db.commit()
                    print(f"[MIGRATE RBAC] Usuário MASTER provisionado com empresa_id={primeira_empresa_id} (fallback SQLite).")
            else:
                # Atualiza credenciais e papel do usuário MASTER existente
                master_user.nome = master_name
                master_user.hashed_password = hash_password(master_password)
                master_user.role = UserRole.MASTER
                master_user.ativo = True
                db.commit()
                print(f"[MIGRATE RBAC] Usuário MASTER '{master_email}' atualizado via variáveis de ambiente.")
        else:
            existing_master = db.query(User).filter(User.role == UserRole.MASTER).first()
            if not existing_master:
                print(
                    "[MIGRATE RBAC] [SEGURANÇA] Nenhum usuário MASTER configurado. "
                    "A criação automática com senhas padrão foi permanentemente REMOVIDA. "
                    "Defina as variáveis MASTER_EMAIL e MASTER_PASSWORD ou execute 'python -m app.scripts.provision_master'."
                )

        print("[MIGRATE RBAC] Migração de RBAC concluída com êxito!")

    except Exception as e:
        db.rollback()
        print(f"[MIGRATE RBAC] Erro ao executar migração RBAC: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()

