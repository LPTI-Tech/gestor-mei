"""
Migração Sprint Operação Real 1 - Imagens de Produtos e Logotipo da Empresa.
Adiciona as colunas imagem_url e imagem_nome na tabela produtos,
adiciona a coluna logo_url na tabela empresas,
e garante a criação dos diretórios locais de upload (backend/uploads/produtos e backend/uploads/logos).
"""

import os
from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.models.produto import Produto
from app.models.empresa import Empresa


def run_migration():
    print("[MIGRATE OPERACAO REAL 1] Iniciando migração para Imagens de Produtos e Logotipo...")

    # 1. Garante criação de tabelas
    Base.metadata.create_all(bind=engine)

    # 2. Garante diretórios de upload locais
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = os.path.join(backend_root, "uploads")
    os.makedirs(os.path.join(uploads_dir, "produtos"), exist_ok=True)
    os.makedirs(os.path.join(uploads_dir, "logos"), exist_ok=True)

    # 3. Adiciona colunas se não existirem
    with engine.connect() as conn:
        is_sqlite = engine.url.drivername.startswith("sqlite")

        if is_sqlite:
            # Tabela PRODUTOS
            res_prod = conn.execute(text("PRAGMA table_info(produtos)"))
            cols_prod = [row[1] for row in res_prod.fetchall()]

            if "imagem_url" not in cols_prod:
                conn.execute(text("ALTER TABLE produtos ADD COLUMN imagem_url VARCHAR(255)"))
                print("[MIGRATE OPERACAO REAL 1] Coluna 'imagem_url' adicionada em produtos.")

            if "imagem_nome" not in cols_prod:
                conn.execute(text("ALTER TABLE produtos ADD COLUMN imagem_nome VARCHAR(255)"))
                print("[MIGRATE OPERACAO REAL 1] Coluna 'imagem_nome' adicionada em produtos.")

            # Tabela EMPRESAS
            res_emp = conn.execute(text("PRAGMA table_info(empresas)"))
            cols_emp = [row[1] for row in res_emp.fetchall()]

            if "logo_url" not in cols_emp:
                conn.execute(text("ALTER TABLE empresas ADD COLUMN logo_url VARCHAR(255)"))
                print("[MIGRATE OPERACAO REAL 1] Coluna 'logo_url' adicionada em empresas.")

        else:
            # PostgreSQL
            conn.execute(text("ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem_url VARCHAR(255)"))
            conn.execute(text("ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem_nome VARCHAR(255)"))
            conn.execute(text("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255)"))
            print("[MIGRATE OPERACAO REAL 1] Colunas adicionadas/verificadas com sucesso no PostgreSQL.")

        conn.commit()

    print("[MIGRATE OPERACAO REAL 1] Migração concluída com sucesso!")


if __name__ == "__main__":
    run_migration()
