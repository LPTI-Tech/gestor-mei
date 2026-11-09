"""
Migração: Unicidade de Produtos por Empresa (Tenant).
Garante que cada empresa não possua produtos duplicados com o mesmo nome (case-insensitive e sem espaços extras).

Passos:
1. Audita duplicatas existentes por (empresa_id, lower(trim(nome))).
2. Se houver duplicatas legadas, preserva o registro principal e desambigua os demais
   renomeando para '{nome} (Legado #{id})' e marcando ativo=False, evitando quebra de integridade referencial.
3. Cria o índice único condicional 'uq_produtos_empresa_nome' no PostgreSQL ou SQLite.
"""

import sys
from sqlalchemy import text
from app.database import engine, Base


def run_migration():
    print("[MIGRATE UNIQUE PRODUTO] Iniciando migração de unicidade de produtos por empresa...")

    with engine.connect() as conn:
        # 1. Auditar duplicatas existentes
        find_dups_sql = text("""
            SELECT empresa_id, lower(trim(nome)) AS nome_norm, COUNT(*) AS total
            FROM produtos
            GROUP BY empresa_id, lower(trim(nome))
            HAVING COUNT(*) > 1
        """)
        
        duplicatas = conn.execute(find_dups_sql).fetchall()
        
        if duplicatas:
            print(f"[MIGRATE UNIQUE PRODUTO] Encontrados {len(duplicatas)} grupos de nomes duplicados.")
            for row in duplicatas:
                emp_id = row[0]
                nome_norm = row[1]
                
                # Buscar todos os itens desse grupo
                itens_sql = text("""
                    SELECT id, nome, quantidade_estoque, ativo, created_at
                    FROM produtos
                    WHERE empresa_id = :emp_id AND lower(trim(nome)) = :nome_norm
                    ORDER BY ativo DESC, quantidade_estoque DESC, id DESC
                """)
                itens = conn.execute(itens_sql, {"emp_id": emp_id, "nome_norm": nome_norm}).fetchall()
                
                # O primeiro item é mantido; os demais são desambiguados
                item_principal = itens[0]
                itens_legados = itens[1:]
                
                print(f"  -> Empresa {emp_id} | '{nome_norm}': mantendo ID {item_principal[0]} como principal.")
                for leg in itens_legados:
                    novo_nome = f"{leg[1]} (Legado #{leg[0]})"
                    print(f"     Desambiguando ID {leg[0]}: '{leg[1]}' -> '{novo_nome}'")
                    update_sql = text("""
                        UPDATE produtos
                        SET nome = :novo_nome, ativo = 0
                        WHERE id = :id
                    """)
                    conn.execute(update_sql, {"novo_nome": novo_nome, "id": leg[0]})
            conn.commit()
            print("[MIGRATE UNIQUE PRODUTO] Desambiguação de duplicatas concluída com sucesso.")
        else:
            print("[MIGRATE UNIQUE PRODUTO] Nenhuma duplicata encontrada.")

        # 2. Criar índice único de unicidade por empresa
        print("[MIGRATE UNIQUE PRODUTO] Criando índice único uq_produtos_empresa_nome...")
        try:
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_produtos_empresa_nome
                ON produtos (empresa_id, lower(trim(nome)))
            """))
            conn.commit()
            print("[MIGRATE UNIQUE PRODUTO] Índice único uq_produtos_empresa_nome criado/garantido com sucesso!")
        except Exception as e:
            print(f"[MIGRATE UNIQUE PRODUTO] Aviso ao criar índice único: {e}")

    print("[MIGRATE UNIQUE PRODUTO] Migração concluída com sucesso!")


if __name__ == "__main__":
    run_migration()
