import sys
import os
import json
import traceback

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.routers.empresas import get_metricas_globais_master, listar_todas_empresas_master

def test_endpoints():
    db = SessionLocal()
    try:
        master = db.query(User).filter(User.role == UserRole.MASTER).first()
        print(f"Master User: {master.email} (ID: {master.id})")

        print("\n--- Testando get_metricas_globais_master ---")
        try:
            metricas = get_metricas_globais_master(db=db, master_user=master)
            print("Status: SUCESSO!")
            print("Payload:", json.dumps(metricas.model_dump(), indent=2))
        except Exception as e:
            print("Status: ERRO!")
            traceback.print_exc()

        print("\n--- Testando listar_todas_empresas_master ---")
        try:
            empresas = listar_todas_empresas_master(db=db, master_user=master)
            print(f"Status: SUCESSO! ({len(empresas)} empresas encontradas)")
            for emp in empresas:
                print(f"  - ID: {emp.id} | {emp.nome_fantasia} | CNPJ: {emp.cnpj} | Ativo: {emp.ativo} | Owner: {emp.owner.nome if emp.owner else 'SEM OWNER'}")
        except Exception as e:
            print("Status: ERRO!")
            traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    test_endpoints()
