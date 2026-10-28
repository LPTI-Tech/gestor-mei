import sqlite3
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.regiao_entrega import RegiaoEntrega
from app.models.cliente import Cliente
from app.models.venda import Venda
from app.models.empresa import Empresa
from app.models.motoboy import Motoboy

def run_migration():
    print("Running Sprint 3 Database Migration...")

    if "sqlite" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if db_path.startswith("./"):
            db_path = os.path.join(backend_dir, db_path[2:])
        
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # 1. Update clientes columns
            cursor.execute("PRAGMA table_info(clientes)")
            cli_cols = [r[1] for r in cursor.fetchall()]
            if "regiao_id" not in cli_cols:
                print("Adding column 'regiao_id' to clientes...")
                cursor.execute("ALTER TABLE clientes ADD COLUMN regiao_id INTEGER REFERENCES regioes_entrega(id)")

            # 2. Update vendas columns
            cursor.execute("PRAGMA table_info(vendas)")
            venda_cols = [r[1] for r in cursor.fetchall()]

            if "numero_pedido" not in venda_cols:
                print("Adding column 'numero_pedido' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN numero_pedido VARCHAR(30)")

            if "tipo_pedido" not in venda_cols:
                print("Adding column 'tipo_pedido' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN tipo_pedido VARCHAR(30) DEFAULT 'BALCAO'")

            if "status_pedido" not in venda_cols:
                print("Adding column 'status_pedido' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN status_pedido VARCHAR(30) DEFAULT 'Recebido'")

            if "regiao_entrega_id" not in venda_cols:
                print("Adding column 'regiao_entrega_id' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN regiao_entrega_id INTEGER REFERENCES regioes_entrega(id)")

            if "taxa_entrega" not in venda_cols:
                print("Adding column 'taxa_entrega' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN taxa_entrega FLOAT DEFAULT 0.0")

            if "motoboy_id" not in venda_cols:
                print("Adding column 'motoboy_id' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN motoboy_id INTEGER REFERENCES motoboys(id)")

            if "taxa_motoboy" not in venda_cols:
                print("Adding column 'taxa_motoboy' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN taxa_motoboy FLOAT DEFAULT 0.0")

            if "endereco_entrega" not in venda_cols:
                print("Adding column 'endereco_entrega' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN endereco_entrega VARCHAR(250)")

            if "data_entrega" not in venda_cols:
                print("Adding column 'data_entrega' to vendas...")
                cursor.execute("ALTER TABLE vendas ADD COLUMN data_entrega DATETIME")

            cursor.execute("UPDATE vendas SET tipo_pedido = 'BALCAO' WHERE tipo_pedido IS NULL")
            cursor.execute("UPDATE vendas SET status_pedido = 'Entregue' WHERE status_pedido IS NULL OR status_pedido = 'Recebido'")
            cursor.execute("UPDATE vendas SET taxa_entrega = 0.0 WHERE taxa_entrega IS NULL")
            cursor.execute("UPDATE vendas SET taxa_motoboy = 0.0 WHERE taxa_motoboy IS NULL")

            conn.commit()
            conn.close()
            print("SQLite alter table completed for Sprint 3!")

    # Create new tables (regioes_entrega)
    Base.metadata.create_all(bind=engine)
    print("Base.metadata.create_all completed!")

    # Seed demo delivery regions
    db = SessionLocal()
    try:
        empresa = db.query(Empresa).first()
        if empresa:
            qtd_regioes = db.query(RegiaoEntrega).filter(RegiaoEntrega.empresa_id == empresa.id).count()
            if qtd_regioes == 0:
                print("Seeding delivery regions...")
                r1 = RegiaoEntrega(empresa_id=empresa.id, nome="Centro / Região Central", taxa_entrega=5.00, tempo_estimado_minutos=25, ativo=True)
                r2 = RegiaoEntrega(empresa_id=empresa.id, nome="Jardim das Flores & Vila Nova", taxa_entrega=7.00, tempo_estimado_minutos=35, ativo=True)
                r3 = RegiaoEntrega(empresa_id=empresa.id, nome="Parque Industrial & Distrito", taxa_entrega=10.00, tempo_estimado_minutos=45, ativo=True)
                r4 = RegiaoEntrega(empresa_id=empresa.id, nome="Zona Sul & Bairros Altos", taxa_entrega=8.50, tempo_estimado_minutos=40, ativo=True)
                db.add_all([r1, r2, r3, r4])
                db.commit()
                db.refresh(r1)
                db.refresh(r2)
                db.refresh(r3)
                print("Seeded 4 delivery regions!")

                # Link existing clients to regions
                clientes = db.query(Cliente).filter(Cliente.empresa_id == empresa.id).all()
                if len(clientes) >= 3:
                    clientes[0].regiao_id = r1.id
                    clientes[1].regiao_id = r2.id
                    clientes[2].regiao_id = r3.id
                    db.commit()
                    print("Linked sample clients to delivery regions!")

            # Ensure numero_pedido is filled for all sales
            vendas = db.query(Venda).filter(Venda.empresa_id == empresa.id).all()
            for v in vendas:
                if not v.numero_pedido:
                    v.numero_pedido = f"PED-{v.id:04d}"
            db.commit()
            print("Populated numero_pedido for all sales!")

    finally:
        db.close()

    print("Sprint 3 Migration Finished Successfully!")

if __name__ == "__main__":
    run_migration()
