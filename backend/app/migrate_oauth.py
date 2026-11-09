"""
Migração e Inicialização de Tabelas OAuth 2.0 / OpenID Connect e Auditoria de Login.
Garante a existência das tabelas:
- user_oauth_accounts (Google, Microsoft)
- auditoria_login (registro de tentativas, IP, User-Agent, status)
Compatível com SQLite e PostgreSQL.
"""

from sqlalchemy import text
from app.database import engine, Base
from app.models.user_oauth import UserOAuthAccount
from app.models.login_audit import AuditoriaLogin

def run_migration():
    print("[MIGRATE OAUTH] Verificando tabelas de autenticação social e auditoria de login...")
    try:
        # 1. Cria as tabelas declaradas via Base se não existirem
        Base.metadata.create_all(bind=engine, tables=[
            UserOAuthAccount.__table__,
            AuditoriaLogin.__table__
        ])
        print("[MIGRATE OAUTH] Tabelas 'user_oauth_accounts' e 'auditoria_login' verificadas/criadas com sucesso.")
    except Exception as e:
        print(f"[MIGRATE OAUTH] Erro ao executar migração OAuth: {e}")
        raise e

if __name__ == "__main__":
    run_migration()
