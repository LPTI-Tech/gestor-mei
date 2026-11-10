import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.empresa import Empresa
from app.routers.empresas import get_metricas_globais_master, listar_todas_empresas_master

def extrair_evidencias_api():
    db = SessionLocal()
    master = db.query(User).filter(User.role == UserRole.MASTER).first()
    
    # 1. Metricas Globais
    metricas = get_metricas_globais_master(db=db, master_user=master)
    metricas_json = metricas.model_dump()

    # 2. Lista de Empresas com Owners e Contagens
    empresas = listar_todas_empresas_master(db=db, master_user=master)
    empresas_json = [e.model_dump(mode="json") for e in empresas]

    output = {
        "usuario_master_autenticado": {
            "id": master.id,
            "email": master.email,
            "nome": master.nome,
            "role": master.role.value if hasattr(master.role, "value") else str(master.role)
        },
        "endpoint_metricas_globais": {
            "rota": "GET /api/empresa/metricas-globais",
            "resposta_real": metricas_json
        },
        "endpoint_todas_empresas": {
            "rota": "GET /api/empresa/todas",
            "total_empresas_retornadas": len(empresas_json),
            "empresas": [
                {
                    "id": emp["id"],
                    "nome_fantasia": emp["nome_fantasia"],
                    "razao_social": emp["nome_empresarial"],
                    "cnpj": emp["cnpj"],
                    "ativo": emp["ativo"],
                    "total_usuarios": emp["total_usuarios"],
                    "owner": emp["owner"]
                }
                for emp in empresas_json
            ]
        }
    }

    db.close()

    output_path = os.path.join(os.path.dirname(__file__), "evidencia_real_master_dashboard.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    extrair_evidencias_api()
