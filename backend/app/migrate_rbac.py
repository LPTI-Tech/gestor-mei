"""
Migração e Inicialização de RBAC — Gestão de Usuários Internos.
Garante as colunas ultimo_acesso e criado_por_id, cria tabela empresa_consultores,
converte roles legados (ADMIN -> OWNER, OPERADOR -> OPERATOR) e inicializa
o usuário MASTER global da plataforma LPTI Tech.
"""

from datetime import datetime
from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.config import settings
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.models.empresa_consultor import EmpresaConsultor
from app.security import hash_password


def run_migration():
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

        # 3. Atualiza roles legados no banco
        db.execute(text("UPDATE users SET role = 'OWNER' WHERE role = 'ADMIN'"))
        db.execute(text("UPDATE users SET role = 'OPERATOR' WHERE role = 'OPERADOR'"))
        db.commit()
        print("[MIGRATE RBAC] Roles legados migrados para OWNER e OPERATOR.")

        # 4. Garante a existência do usuário MASTER da plataforma (apenas em desenvolvimento/seed autorizado)
        master_user = db.query(User).filter(User.role == UserRole.MASTER).first()
        if not master_user:
            if not settings.should_seed:
                print(
                    "[MIGRATE RBAC] [SEGURANÇA] Nenhum usuário MASTER existente no banco. "
                    "A criação automática com senha padrão 'master123' foi BLOQUEADA em produção. "
                    "Execute 'python -m app.scripts.provision_master' para criar o acesso MASTER com senha forte."
                )
            else:
                # Se for SQLite com constraint not null em empresa_id na tabela antiga, atribui None ou 0 se necessário
                try:
                    master_user = User(
                        empresa_id=None,
                        nome="Administrador MASTER (LPTI Tech)",
                        email="master@lptitech.com.br",
                        hashed_password=hash_password("master123"),
                        role=UserRole.MASTER,
                        ativo=True,
                        ultimo_acesso=datetime.utcnow()
                    )
                    db.add(master_user)
                    db.commit()
                    print("[MIGRATE RBAC] Usuário MASTER master@lptitech.com.br criado com sucesso (empresa_id=None).")
                except Exception as e_master:
                    db.rollback()
                    # Fallback para caso SQLite antigo não permita NULL em empresa_id
                    empresa_primeira = db.query(Empresa).first()
                    primeira_empresa_id = empresa_primeira.id if empresa_primeira else 1
                    master_user = User(
                        empresa_id=primeira_empresa_id,
                        nome="Administrador MASTER (LPTI Tech)",
                        email="master@lptitech.com.br",
                        hashed_password=hash_password("master123"),
                        role=UserRole.MASTER,
                        ativo=True,
                        ultimo_acesso=datetime.utcnow()
                    )
                    db.add(master_user)
                    db.commit()
                    print(f"[MIGRATE RBAC] Usuário MASTER criado com empresa_id={primeira_empresa_id} (fallback SQLite).")

        # 5. Garante vínculos para o CONSULTOR padrão com as empresas clientes
        consultor = db.query(User).filter(User.role == UserRole.CONSULTOR).first()
        if consultor:
            empresas = db.query(Empresa).all()
            for emp in empresas:
                vinculo = db.query(EmpresaConsultor).filter(
                    EmpresaConsultor.empresa_id == emp.id,
                    EmpresaConsultor.user_id == consultor.id
                ).first()
                if not vinculo:
                    novo_v = EmpresaConsultor(
                        empresa_id=emp.id,
                        user_id=consultor.id,
                        ativo=True,
                        created_at=datetime.utcnow()
                    )
                    db.add(novo_v)
            db.commit()
            print("[MIGRATE RBAC] Vínculos de consultoria configurados para empresas clientes.")

        print("[MIGRATE RBAC] Migração de RBAC concluída com êxito!")

    except Exception as e:
        db.rollback()
        print(f"[MIGRATE RBAC] Erro ao executar migração RBAC: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()

