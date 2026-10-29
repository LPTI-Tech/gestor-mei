"""
Migração e Seeding de Dados para a Sprint 7 — Painel do Consultor LPTI Tech.
Garante a existência do perfil CONSULTOR, cria usuário consultor padrão e
popula empresas clientes com cenários realistas de score (Saudável, Atenção e Crítico).
"""

from datetime import datetime, date, timedelta
from app.database import SessionLocal, engine
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.models.produto import Produto
from app.models.venda import Venda
from app.models.das import DasMensal
from app.models.nfe import NfeImportada
from app.security import hash_password


def run_migration():
    db = SessionLocal()
    try:
        print("[MIGRATE SPRINT 7] Inicializando migração do Painel do Consultor...")

        # 1. Garante a Empresa 1 e cria o usuário CONSULTOR padrão
        empresa_1 = db.query(Empresa).filter(Empresa.id == 1).first()
        if not empresa_1:
            print("[MIGRATE SPRINT 7] Empresa principal não encontrada. Execute o seed inicial.")
            return

        consultor_user = db.query(User).filter(User.email == "consultor@lptitech.com.br").first()
        if not consultor_user:
            consultor_user = User(
                empresa_id=empresa_1.id,
                nome="Consultor LPTI Tech",
                email="consultor@lptitech.com.br",
                hashed_password=hash_password("consultor123"),
                role=UserRole.CONSULTOR,
                ativo=True,
            )
            db.add(consultor_user)
            db.commit()
            print("[MIGRATE SPRINT 7] Usuário consultor@lptitech.com.br criado com sucesso.")

        ano_atual = datetime.utcnow().year
        hoje = date.today()

        # 2. Empresa 2: Barbearia Navalha de Ouro MEI (🟢 SAUDÁVEL)
        empresa_2 = db.query(Empresa).filter(Empresa.cnpj == "12.345.678/0001-90").first()
        if not empresa_2:
            empresa_2 = Empresa(
                nome_empresarial="BARBEARIA NAVALHA DE OURO LTDA MEI",
                nome_fantasia="Barbearia Navalha de Ouro",
                cnpj="12.345.678/0001-90",
                cpf_proprietario="234.567.890-11",
                endereco="Av. Principal, 450 - Centro",
                telefone="(11) 97123-4567",
                email="contato@navalhadaouro.com.br",
                limite_mei_anual=81000.00,
                segmento="BELEZA",
                modulo_delivery=False,
                modulo_estoque=True,
                data_inicio_atividades=datetime(ano_atual, 1, 1),
            )
            db.add(empresa_2)
            db.commit()
            db.refresh(empresa_2)

            # Produtos regulares (Estoque saudável)
            p1 = Produto(
                empresa_id=empresa_2.id,
                nome="Pomada Modeladora Efeito Seco",
                categoria="Cosméticos",
                preco_venda=45.00,
                custo_unitario=20.00,
                quantidade_estoque=25.0,
                estoque_minimo=5.0,
                ativo=True,
            )
            p2 = Produto(
                empresa_id=empresa_2.id,
                nome="Óleo para Barba 30ml",
                categoria="Cosméticos",
                preco_venda=35.00,
                custo_unitario=15.00,
                quantidade_estoque=18.0,
                estoque_minimo=4.0,
                ativo=True,
            )
            db.add_all([p1, p2])

            # Guias DAS em dia (todas pagas até o mês atual)
            for m in range(1, 13):
                status_guia = "Pago" if m <= hoje.month else "Pendente"
                data_pgto = date(ano_atual, m, 15) if m <= hoje.month else None
                g = DasMensal(
                    empresa_id=empresa_2.id,
                    ano=ano_atual,
                    mes=m,
                    valor=75.60,
                    vencimento=date(ano_atual, m, 20),
                    status=status_guia,
                    data_pagamento=data_pgto,
                    observacao="Quitação regular em dia",
                )
                db.add(g)

            # Vendas registradas (Faturamento moderado: ~R$ 32.400,00 -> 40% do teto)
            venda_saudavel = Venda(
                empresa_id=empresa_2.id,
                descricao_produto="Pacote Barba, Cabelo & Pomada",
                tipo_item="PRODUTO",
                quantidade=360,
                preco_unitario=90.00,
                valor_subtotal=32400.00,
                desconto=0.0,
                valor_total=32400.00,
                origem="BALCAO",
                forma_pagamento="PIX",
                status="Concluída",
                data_hora=datetime(ano_atual, 2, 10),
                created_at=datetime(ano_atual, 2, 10),
            )
            db.add(venda_saudavel)
            db.commit()
            print("[MIGRATE SPRINT 7] Empresa 2 (Barbearia - SAUDÁVEL) criada.")

        # 3. Empresa 3: Hamburgueria Burger Smash MEI (🟡 ATENÇÃO)
        empresa_3 = db.query(Empresa).filter(Empresa.cnpj == "23.456.789/0001-01").first()
        if not empresa_3:
            empresa_3 = Empresa(
                nome_empresarial="BURGER SMASH LANCHES MEI",
                nome_fantasia="Burger Smash Artesanal",
                cnpj="23.456.789/0001-01",
                cpf_proprietario="345.678.901-22",
                endereco="Rua dos Lanches, 88 - Bairro Alto",
                telefone="(11) 98234-5678",
                email="contato@burgersmash.com.br",
                limite_mei_anual=81000.00,
                segmento="ALIMENTACAO",
                modulo_delivery=True,
                modulo_estoque=True,
                data_inicio_atividades=datetime(ano_atual, 1, 1),
            )
            db.add(empresa_3)
            db.commit()
            db.refresh(empresa_3)

            # Produtos com estoque crítico
            p1 = Produto(
                empresa_id=empresa_3.id,
                nome="Pão Brioche Tradicional (Pct c/ 10)",
                categoria="Insumos",
                preco_venda=18.00,
                custo_unitario=10.00,
                quantidade_estoque=2.0,  # CRÍTICO (mínimo 15)
                estoque_minimo=15.0,
                ativo=True,
            )
            p2 = Produto(
                empresa_id=empresa_3.id,
                nome="Queijo Cheddar Fatiado 1kg",
                categoria="Insumos",
                preco_venda=42.00,
                custo_unitario=28.00,
                quantidade_estoque=1.0,  # CRÍTICO (mínimo 8)
                estoque_minimo=8.0,
                ativo=True,
            )
            db.add_all([p1, p2])

            # Guias DAS: Pagas até o mês corrente, próximos meses pendentes
            for m in range(1, 13):
                status_guia = "Pago" if m <= hoje.month else "Pendente"
                data_pgto = date(ano_atual, m, 10) if m <= hoje.month else None
                g = DasMensal(
                    empresa_id=empresa_3.id,
                    ano=ano_atual,
                    mes=m,
                    valor=75.60,
                    vencimento=date(ano_atual, m, 20),
                    status=status_guia,
                    data_pagamento=data_pgto,
                )
                db.add(g)

            # Vendas altas: R$ 68.850,00 -> 85% do limite (Próximo do teto!)
            venda_atencao = Venda(
                empresa_id=empresa_3.id,
                descricao_produto="Combos Smash Burger Delivery",
                tipo_item="PRODUTO",
                quantidade=1530,
                preco_unitario=45.00,
                valor_subtotal=68850.00,
                desconto=0.0,
                valor_total=68850.00,
                origem="DELIVERY",
                forma_pagamento="CARTAO_CREDITO",
                status="Concluída",
                data_hora=datetime(ano_atual, 3, 15),
                created_at=datetime(ano_atual, 3, 15),
            )
            db.add(venda_atencao)
            db.commit()
            print("[MIGRATE SPRINT 7] Empresa 3 (Hamburgueria - ATENÇÃO) criada.")

        # 4. Empresa 4: Distribuidora & Depósito da Vila MEI (🔴 CRÍTICO)
        empresa_4 = db.query(Empresa).filter(Empresa.cnpj == "34.567.890/0001-12").first()
        if not empresa_4:
            empresa_4 = Empresa(
                nome_empresarial="DEPOSITO DE BEBIDAS DA VILA MEI",
                nome_fantasia="Distribuidora & Depósito da Vila",
                cnpj="34.567.890/0001-12",
                cpf_proprietario="456.789.012-33",
                endereco="Av. das Nações, 1500 - Galpão 3",
                telefone="(11) 99345-6789",
                email="contato@depositodavila.com.br",
                limite_mei_anual=81000.00,
                segmento="COMERCIO",
                modulo_delivery=True,
                modulo_estoque=True,
                data_inicio_atividades=datetime(ano_atual, 1, 1),
            )
            db.add(empresa_4)
            db.commit()
            db.refresh(empresa_4)

            # Produtos com estoque zerado
            p1 = Produto(
                empresa_id=empresa_4.id,
                nome="Cerveja Puro Malte Lata 350ml Fardo",
                categoria="Bebidas",
                preco_venda=48.00,
                custo_unitario=32.00,
                quantidade_estoque=0.0,  # ZERADO
                estoque_minimo=20.0,
                ativo=True,
            )
            p2 = Produto(
                empresa_id=empresa_4.id,
                nome="Gelo em Cubos Pacote 5kg",
                categoria="Gelo",
                preco_venda=15.00,
                custo_unitario=7.00,
                quantidade_estoque=0.0,  # ZERADO
                estoque_minimo=30.0,
                ativo=True,
            )
            p3 = Produto(
                empresa_id=empresa_4.id,
                nome="Carvão Vegetal Saco 3kg",
                categoria="Churrasco",
                preco_venda=22.00,
                custo_unitario=12.00,
                quantidade_estoque=1.0,  # CRÍTICO
                estoque_minimo=25.0,
                ativo=True,
            )
            db.add_all([p1, p2, p3])

            # Guias DAS: 2 guias ATRASADAS
            for m in range(1, 13):
                if m in [1, 2]:
                    status_guia = "Atrasado"
                    data_pgto = None
                elif m < hoje.month:
                    status_guia = "Pago"
                    data_pgto = date(ano_atual, m, 18)
                else:
                    status_guia = "Pendente"
                    data_pgto = None

                g = DasMensal(
                    empresa_id=empresa_4.id,
                    ano=ano_atual,
                    mes=m,
                    valor=75.60,
                    vencimento=date(ano_atual, m, 20),
                    status=status_guia,
                    data_pagamento=data_pgto,
                    observacao="Guia vencida não regularizada" if status_guia == "Atrasado" else None,
                )
                db.add(g)

            # Faturamento estourando teto: R$ 82.500,00 -> 101.8% do limite MEI!
            venda_critica = Venda(
                empresa_id=empresa_4.id,
                descricao_produto="Vendas Distribuição Bebidas & Atacarejo",
                tipo_item="PRODUTO",
                quantidade=1650,
                preco_unitario=50.00,
                valor_subtotal=82500.00,
                desconto=0.0,
                valor_total=82500.00,
                origem="BALCAO",
                forma_pagamento="PIX",
                status="Concluída",
                data_hora=datetime(ano_atual, 4, 1),
                created_at=datetime(ano_atual, 4, 1),
            )
            db.add(venda_critica)
            db.commit()
            print("[MIGRATE SPRINT 7] Empresa 4 (Distribuidora - CRÍTICO) criada.")

        print("[MIGRATE SPRINT 7] Migração da Sprint 7 finalizada com sucesso!")

    except Exception as e:
        db.rollback()
        print(f"[MIGRATE SPRINT 7] Erro ao executar migração: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
