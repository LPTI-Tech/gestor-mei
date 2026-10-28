from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.empresa import Empresa
from app.models.user import User, UserRole
from app.models.produto import Produto
from app.models.venda import Venda
from app.models.caixa import CaixaTurno, CaixaLancamento
from app.models.despesa import Despesa
from app.models.motoboy import Motoboy, EntregaMotoboy
from app.models.ifood import LancamentoIFood
from app.security import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if company exists
        empresa = db.query(Empresa).first()
        if empresa:
            print("Database already contains data. Skipping seed.")
            return
            
        print("Seeding initial data for GESTOR MEI...")
        
        # 1. Create Demo Empresa (Marmitaria & Comida Caseira)
        empresa = Empresa(
            nome_empresarial="MARMITARIA SABOR & FAMILIA LTDA MEI",
            nome_fantasia="Sabor & Família Marmitaria",
            cnpj="45.123.456/0001-89",
            cpf_proprietario="123.456.789-00",
            endereco="Rua dos Sabores, 120 - Centro",
            telefone="(11) 98765-4321",
            email="contato@saborefamilia.com.br",
            limite_mei_anual=81000.00,
            data_inicio_atividades=datetime(datetime.utcnow().year, 1, 1)
        )
        db.add(empresa)
        db.commit()
        db.refresh(empresa)
        
        # 2. Users: Admin and Operador
        admin_user = User(
            empresa_id=empresa.id,
            nome="Leonidas Paulino (Administrador)",
            email="admin@gestormei.com.br",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
            ativo=True
        )
        operador_user = User(
            empresa_id=empresa.id,
            nome="Carlos Atendente (Operador)",
            email="operador@gestormei.com.br",
            hashed_password=hash_password("operador123"),
            role=UserRole.OPERADOR,
            ativo=True
        )
        db.add_all([admin_user, operador_user])
        db.commit()
        db.refresh(admin_user)
        db.refresh(operador_user)
        
        # 3. Produtos (Categorias: Refeições, Bebidas, Porções, Lanches, Mercearia, Outros)
        produtos = [
            Produto(empresa_id=empresa.id, nome="Marmita Tradicional M (Feijoada / Bife)", categoria="Refeições", preco_venda=22.00, ativo=True),
            Produto(empresa_id=empresa.id, nome="Marmita Grande G (Executiva com Salada)", categoria="Refeições", preco_venda=26.00, ativo=True),
            Produto(empresa_id=empresa.id, nome="Prato Feito Comercial (PF)", categoria="Refeições", preco_venda=19.90, ativo=True),
            Produto(empresa_id=empresa.id, nome="Porção de Batata Frita com Queijo", categoria="Porções", preco_venda=24.00, ativo=True),
            Produto(empresa_id=empresa.id, nome="Porção de Calabresa Acebolada", categoria="Porções", preco_venda=28.00, ativo=True),
            Produto(empresa_id=empresa.id, nome="X-Tudo Especial da Casa", categoria="Lanches", preco_venda=25.00, ativo=True),
            Produto(empresa_id=empresa.id, nome="Hambúrguer Artesanal Smash", categoria="Lanches", preco_venda=23.50, ativo=True),
            Produto(empresa_id=empresa.id, nome="Refrigerante Lata 350ml", categoria="Bebidas", preco_venda=6.00, ativo=True),
            Produto(empresa_id=empresa.id, nome="Suco Natural da Fruta 500ml", categoria="Bebidas", preco_venda=8.50, ativo=True),
            Produto(empresa_id=empresa.id, nome="Água Mineral 500ml", categoria="Bebidas", preco_venda=4.00, ativo=True),
            Produto(empresa_id=empresa.id, nome="Pote de Doce Caseiro (Sobremesa)", categoria="Mercearia", preco_venda=7.00, ativo=True),
        ]
        db.add_all(produtos)
        db.commit()
        
        # 4. Motoboys
        motoboys = [
            Motoboy(empresa_id=empresa.id, nome="Lucas Entrega Rápida", telefone="(11) 99111-2222", valor_por_entrega=7.00, ativo=True),
            Motoboy(empresa_id=empresa.id, nome="Rodrigo Express", telefone="(11) 99333-4444", valor_por_entrega=8.00, ativo=True),
        ]
        db.add_all(motoboys)
        db.commit()
        db.refresh(motoboys[0])
        db.refresh(motoboys[1])
        
        # 5. Open Cash Shift
        turno = CaixaTurno(
            empresa_id=empresa.id,
            user_abertura_id=admin_user.id,
            valor_inicial=150.00,
            status="ABERTO",
            data_abertura=datetime.utcnow() - timedelta(hours=4),
            observacoes="Abertura matinal com troco em notas pequenas e moedas."
        )
        db.add(turno)
        db.commit()
        db.refresh(turno)
        
        # 6. Sample Sales over the last 15 days
        today = datetime.utcnow()
        vendas_sample = []
        origens = ["Balcão", "WhatsApp", "Delivery Próprio", "iFood", "Telefone"]
        pagamentos = ["PIX", "Dinheiro", "Débito", "Crédito"]
        
        # Sales today
        vendas_sample.append(Venda(
            empresa_id=empresa.id, user_id=admin_user.id, caixa_turno_id=turno.id,
            produto_id=produtos[0].id, descricao_produto=produtos[0].nome,
            quantidade=2, preco_unitario=22.00, valor_total=44.00,
            origem="Balcão", forma_pagamento="Dinheiro", status="Concluída",
            data_hora=today - timedelta(hours=3)
        ))
        vendas_sample.append(Venda(
            empresa_id=empresa.id, user_id=operador_user.id, caixa_turno_id=turno.id,
            produto_id=produtos[1].id, descricao_produto=produtos[1].nome,
            quantidade=3, preco_unitario=26.00, valor_total=78.00,
            origem="WhatsApp", forma_pagamento="PIX", status="Concluída",
            data_hora=today - timedelta(hours=2)
        ))
        vendas_sample.append(Venda(
            empresa_id=empresa.id, user_id=operador_user.id, caixa_turno_id=turno.id,
            produto_id=produtos[7].id, descricao_produto=produtos[7].nome,
            quantidade=4, preco_unitario=6.00, valor_total=24.00,
            origem="Balcão", forma_pagamento="Débito", status="Concluída",
            data_hora=today - timedelta(hours=1)
        ))
        vendas_sample.append(Venda(
            empresa_id=empresa.id, user_id=operador_user.id, caixa_turno_id=turno.id,
            produto_id=produtos[5].id, descricao_produto=produtos[5].nome,
            quantidade=2, preco_unitario=25.00, valor_total=50.00,
            origem="Delivery Próprio", forma_pagamento="Crédito", status="Concluída",
            data_hora=today - timedelta(minutes=30)
        ))
        
        # Historical sales across earlier days in the year
        for d in range(1, 20):
            past_date = today - timedelta(days=d)
            vendas_sample.append(Venda(
                empresa_id=empresa.id, user_id=admin_user.id,
                produto_id=produtos[d % len(produtos)].id,
                descricao_produto=produtos[d % len(produtos)].nome,
                quantidade=3 + (d % 4),
                preco_unitario=produtos[d % len(produtos)].preco_venda,
                valor_total=round((3 + (d % 4)) * produtos[d % len(produtos)].preco_venda, 2),
                origem=origens[d % len(origens)],
                forma_pagamento=pagamentos[d % len(pagamentos)],
                status="Concluída",
                data_hora=past_date
            ))
            
        db.add_all(vendas_sample)
        db.commit()
        
        # 7. Despesas (Gás, Mercadorias, Energia, Água, Motoboy)
        despesas = [
            Despesa(empresa_id=empresa.id, data=date.today(), categoria="Gás", descricao="Recarga Botijão P13 Cozinha", valor=115.00, forma_pagamento="PIX"),
            Despesa(empresa_id=empresa.id, data=date.today() - timedelta(days=2), categoria="Mercadorias", descricao="Compra Carnes e Legumes no Atacadista", valor=340.50, forma_pagamento="Débito"),
            Despesa(empresa_id=empresa.id, data=date.today() - timedelta(days=5), categoria="Insumos", descricao="Embalagens descartáveis marmitex e sacolas", valor=180.00, forma_pagamento="PIX"),
            Despesa(empresa_id=empresa.id, data=date.today() - timedelta(days=10), categoria="Energia", descricao="Conta de Luz Comercial Enel", valor=290.00, forma_pagamento="Boleto"),
            Despesa(empresa_id=empresa.id, data=date.today() - timedelta(days=12), categoria="Água", descricao="Conta de Água Sabesp", valor=85.00, forma_pagamento="Boleto"),
            Despesa(empresa_id=empresa.id, data=date.today() - timedelta(days=15), categoria="Internet", descricao="Internet Fibra Óptica Loja", valor=99.90, forma_pagamento="PIX"),
        ]
        db.add_all(despesas)
        db.commit()
        
        # 8. Entregas Motoboy
        entregas = [
            EntregaMotoboy(empresa_id=empresa.id, motoboy_id=motoboys[0].id, numero_pedido="PED-101", valor_entrega=7.00, status_pagamento="PENDENTE", data_hora=today - timedelta(hours=2)),
            EntregaMotoboy(empresa_id=empresa.id, motoboy_id=motoboys[0].id, numero_pedido="PED-102", valor_entrega=7.00, status_pagamento="PENDENTE", data_hora=today - timedelta(hours=1)),
            EntregaMotoboy(empresa_id=empresa.id, motoboy_id=motoboys[1].id, numero_pedido="PED-098", valor_entrega=8.00, status_pagamento="PAGO", data_pagamento=today, data_hora=today - timedelta(days=1)),
        ]
        db.add_all(entregas)
        db.commit()
        
        # 9. Lançamentos iFood
        ifoods = [
            LancamentoIFood(empresa_id=empresa.id, data=date.today() - timedelta(days=1), numero_pedido="IFOOD-8841", valor_bruto=88.00, taxa_ifood=11.44, valor_liquido=76.56, observacoes="2 Marmitas + 2 Sucos"),
            LancamentoIFood(empresa_id=empresa.id, data=date.today() - timedelta(days=2), numero_pedido="IFOOD-8835", valor_bruto=62.00, taxa_ifood=8.06, valor_liquido=53.94, observacoes="1 Porção Calabresa + Refri"),
            LancamentoIFood(empresa_id=empresa.id, data=date.today() - timedelta(days=4), numero_pedido="IFOOD-8812", valor_bruto=115.00, taxa_ifood=14.95, valor_liquido=100.05, observacoes="Combo Almoço Família"),
        ]
        db.add_all(ifoods)
        db.commit()
        
        print("Initial demo data seeded successfully!")
        print("Admin user: admin@gestormei.com.br / admin123")
        print("Operador user: operador@gestormei.com.br / operador123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
