"""
Migração Sprint 8B - Compra Manual, Fornecedores e Anexos de Comprovantes.
Garante a criação da tabela fornecedores, adiciona colunas de suporte na tabela
nfe_importadas (origem, forma_pagamento, anexo_url, anexo_nome, anexo_tipo),
cria o diretório de uploads de comprovantes e popula fornecedores já existentes.
"""

import os
from datetime import datetime
from sqlalchemy import text
from app.database import SessionLocal, engine, Base
from app.models.fornecedor import Fornecedor
from app.models.nfe import NfeImportada


def run_migration():
    db = SessionLocal()
    try:
        print("[MIGRATE SPRINT 8B] Iniciando migração da Compra Manual...")

        # 1. Cria novas tabelas do metadata (incluindo fornecedores)
        Base.metadata.create_all(bind=engine)

        # 2. Adiciona colunas na tabela nfe_importadas
        with engine.connect() as conn:
            is_sqlite = engine.url.drivername.startswith("sqlite")

            if is_sqlite:
                result = conn.execute(text("PRAGMA table_info(nfe_importadas)"))
                existing_cols = [row[1] for row in result.fetchall()]

                if "origem" not in existing_cols:
                    conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN origem VARCHAR(20) DEFAULT 'XML_NFE'"))
                    print("[MIGRATE SPRINT 8B] Coluna 'origem' adicionada em nfe_importadas.")

                if "forma_pagamento" not in existing_cols:
                    conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN forma_pagamento VARCHAR(30)"))
                    print("[MIGRATE SPRINT 8B] Coluna 'forma_pagamento' adicionada em nfe_importadas.")

                if "anexo_url" not in existing_cols:
                    conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN anexo_url VARCHAR(255)"))
                    print("[MIGRATE SPRINT 8B] Coluna 'anexo_url' adicionada em nfe_importadas.")

                if "anexo_nome" not in existing_cols:
                    conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN anexo_nome VARCHAR(255)"))
                    print("[MIGRATE SPRINT 8B] Coluna 'anexo_nome' adicionada em nfe_importadas.")

                if "anexo_tipo" not in existing_cols:
                    conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN anexo_tipo VARCHAR(50)"))
                    print("[MIGRATE SPRINT 8B] Coluna 'anexo_tipo' adicionada em nfe_importadas.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'XML_NFE'"))
                conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30)"))
                conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(255)"))
                conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN IF NOT EXISTS anexo_nome VARCHAR(255)"))
                conn.execute(text("ALTER TABLE nfe_importadas ADD COLUMN IF NOT EXISTS anexo_tipo VARCHAR(50)"))
                # Atualizar tamanho de chave_acesso se necessário
                conn.execute(text("ALTER TABLE nfe_importadas ALTER COLUMN chave_acesso TYPE VARCHAR(60)"))
                print("[MIGRATE SPRINT 8B] Colunas adicionadas/ajustadas em nfe_importadas (PostgreSQL).")

            conn.commit()

        # 3. Garante diretório de uploads local
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        comprovantes_dir = os.path.join(base_dir, "uploads", "comprovantes")
        os.makedirs(comprovantes_dir, exist_ok=True)
        print(f"[MIGRATE SPRINT 8B] Diretório de uploads garantido em: {comprovantes_dir}")

        # 4. Sincroniza fornecedores a partir de notas existentes para conveniência
        notas = db.query(NfeImportada).all()
        cadastrados = 0
        for n in notas:
            if not n.fornecedor_nome:
                continue
            existente = db.query(Fornecedor).filter(
                Fornecedor.empresa_id == n.empresa_id,
                Fornecedor.nome == n.fornecedor_nome.strip()
            ).first()
            if not existente:
                novo_forn = Fornecedor(
                    empresa_id=n.empresa_id,
                    nome=n.fornecedor_nome.strip(),
                    cnpj_cpf=n.fornecedor_cnpj.strip() if n.fornecedor_cnpj else None,
                    uf=n.fornecedor_uf.strip().upper() if n.fornecedor_uf else None,
                    ativo=True,
                    created_at=datetime.utcnow(),
                )
                db.add(novo_forn)
                cadastrados += 1

        if cadastrados > 0:
            db.commit()
            print(f"[MIGRATE SPRINT 8B] {cadastrados} fornecedor(es) sincronizado(s) do histórico de notas.")

        print("[MIGRATE SPRINT 8B] Migração da Compra Manual finalizada com sucesso!")

    except Exception as e:
        db.rollback()
        print(f"[MIGRATE SPRINT 8B] Erro na migração: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
