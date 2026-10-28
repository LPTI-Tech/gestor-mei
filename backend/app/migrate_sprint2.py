import sqlite3
import os
import sys

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.cliente import Cliente
from app.models.venda import Venda, ItemVenda
from app.models.empresa import Empresa

def run_migration():
    print("Running Sprint 2 Database Migration...")

    # Check if using SQLite
    if "sqlite" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if db_path.startswith("./"):
            db_path = os.path.join(backend_dir, db_path[2:])
        
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(vendas)")
            cols = [r[1] for r in cursor.fetchall()]

            if "tipo_item" not in cols:
                print("Adding column 'tipo_item' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN tipo_item VARCHAR(20) DEFAULT 'PRODUTO'")

            if "cliente_id" not in cols:
                print("Adding column 'cliente_id' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id)")

            if "valor_subtotal" not in cols:
                print("Adding column 'valor_subtotal' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN valor_subtotal FLOAT DEFAULT 0.0")

            if "desconto" not in cols:
                print("Adding column 'desconto' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN desconto FLOAT DEFAULT 0.0")

            cursor.execute("UPDATE vendas SET valor_subtotal = valor_total WHERE valor_subtotal = 0.0 OR valor_subtotal IS NULL")
            cursor.execute("UPDATE vendas SET tipo_item = 'PRODUTO' WHERE tipo_item IS NULL")

            # Check empresas columns
            cursor.execute("PRAGMA table_info(empresas)")
            emp_cols = [r[1] for r in cursor.fetchall()]

            if "segmento" not in emp_cols:
                print("Adding column 'segmento' to empresas...")
                cursor.execute("ALTER TABLE empresas ADD COLUMN segmento VARCHAR(50) DEFAULT 'ALIMENTACAO'")

            if "modulo_delivery" not in emp_cols:
                print("Adding column 'modulo_delivery' to empresas...")
                cursor.execute("ALTER TABLE empresas ADD COLUMN modulo_delivery BOOLEAN DEFAULT 1")

            if "modulo_motoboy" not in emp_cols:
                print("Adding column 'modulo_motoboy' to empresas...")
                cursor.execute("ALTER TABLE empresas ADD COLUMN modulo_motoboy BOOLEAN DEFAULT 1")

            if "modulo_ifood" not in emp_cols:
                print("Adding column 'modulo_ifood' to empresas...")
                cursor.execute("ALTER TABLE empresas ADD COLUMN modulo_ifood BOOLEAN DEFAULT 1")

            if "modulo_estoque" not in emp_cols:
                print("Adding column 'modulo_estoque' to empresas...")
                cursor.execute("ALTER TABLE empresas ADD COLUMN modulo_estoque BOOLEAN DEFAULT 0")

            # Check produtos columns
            cursor.execute("PRAGMA table_info(produtos)")
            prod_cols = [r[1] for r in cursor.fetchall()]
            if "tipo" not in prod_cols:
                print("Adding column 'tipo' to produtos...")
                cursor.execute("ALTER TABLE produtos ADD COLUMN tipo VARCHAR(20) DEFAULT 'PRODUTO'")

            conn.commit()
            conn.close()
            print("SQLite vendas and empresas columns updated successfully!")

    # Create new tables
    Base.metadata.create_all(bind=engine)
    print("Base.metadata.create_all completed!")

    # Seed demo clients
    db = SessionLocal()
    try:
        empresa = db.query(Empresa).first()
        if empresa:
            qtd_clientes = db.query(Cliente).filter(Cliente.empresa_id == empresa.id).count()
            if qtd_clientes == 0:
                print("Seeding demo clients...")
                c1 = Cliente(
                    empresa_id=empresa.id,
                    nome="Dra. Juliana Mendes (Clínica Sorriso)",
                    telefone="(11) 98888-1111",
                    email="juliana@clinicasorriso.com.br",
                    endereco="Av. Paulista, 1000 - Conjunto 42",
                    observacoes="Cliente fixa de marmitas executivas de segunda a sexta.",
                    ativo=True
                )
                c2 = Cliente(
                    empresa_id=empresa.id,
                    nome="Marcos Silva (Auto Peças Silva)",
                    telefone="(11) 97777-2222",
                    email="marcos@autopecassilva.com.br",
                    endereco="Rua do Comércio, 450 - Galpão B",
                    observacoes="Paga semanalmente via PIX às sextas-feiras.",
                    ativo=True
                )
                c3 = Cliente(
                    empresa_id=empresa.id,
                    nome="Ana Paula Souza (Escritório Contábil)",
                    telefone="(11) 96666-3333",
                    email="anapaula@contabil.com.br",
                    endereco="Rua das Flores, 88 - Sala 12",
                    observacoes="Pedidos via WhatsApp para entrega às 12h.",
                    ativo=True
                )
                c4 = Cliente(
                    empresa_id=empresa.id,
                    nome="Roberto Carlos da Silva",
                    telefone="(11) 95555-4444",
                    endereco="Rua dos Pinheiros, 230 - Apto 31",
                    observacoes="Cliente de balcão e delivery no jantar.",
                    ativo=True
                )
                db.add_all([c1, c2, c3, c4])
                db.commit()
                print("Seeded 4 demo clients!")

            # Migrate legacy sales to ItemVenda records
            vendas = db.query(Venda).all()
            migrated = 0
            for v in vendas:
                if not v.itens or len(v.itens) == 0:
                    desc = v.descricao_produto or "Marmita Tradicional M"
                    qtd = v.quantidade or 1.0
                    preco = v.preco_unitario or (v.valor_total / qtd if qtd > 0 else v.valor_total)
                    it = ItemVenda(
                        venda_id=v.id,
                        produto_id=v.produto_id,
                        descricao=desc,
                        tipo_item=v.tipo_item or "PRODUTO",
                        quantidade=qtd,
                        preco_unitario=preco,
                        subtotal=v.valor_total,
                        observacoes="Item migrado do histórico"
                    )
                    db.add(it)
                    migrated += 1
            if migrated > 0:
                db.commit()
                print(f"Migrated {migrated} sales to have ItemVenda records!")

    finally:
        db.close()

    print("Sprint 2 Database Migration Finished Successfully!")

if __name__ == "__main__":
    run_migration()
