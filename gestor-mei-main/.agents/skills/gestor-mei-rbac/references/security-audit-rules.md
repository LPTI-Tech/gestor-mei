# Regras de Segurança, Anti-Vazamento e Auditoria — Gestor MEI

Este documento detalha os mecanismos de defesa e auditoria em profundidade para garantir que o isolamento multiempresa e as restrições de RBAC sejam invioláveis.

---

## 1. Princípio de Isolamento de Tenant (Zero Data Leak)

Em um ambiente SaaS B2B, o vazamento acidental de dados entre empresas constitui violação de sigilo bancário/fiscal e da LGPD.

### Diretrizes Estritas:
1. **Origem Confiável do Tenant:**
   ```python
   # ❌ ERRADO: Confiar no ID enviado pelo cliente
   @router.get("/vendas")
   def list_vendas(empresa_id: int, db: Session = Depends(get_db)):
       return db.query(Venda).filter(Venda.empresa_id == empresa_id).all()

   # ✅ CORRETO: Extrair SEMPRE do token validado
   @router.get("/vendas")
   def list_vendas(
       current_user: User = Depends(get_current_active_user),
       db: Session = Depends(get_db)
   ):
       return db.query(Venda).filter(Venda.empresa_id == current_user.empresa_id).all()
   ```

2. **Prevenção de Injeção de ID no POST/PUT:**
   Ao criar registros (ex: `Produto`, `Cliente`, `Venda`), o backend deve sobrescrever forçadamente qualquer `empresa_id` do payload:
   ```python
   novo_produto = Produto(
       **produto_in.model_dump(exclude={"empresa_id"}),
       empresa_id=current_user.empresa_id
   )
   ```

---

## 2. Bloqueio Financeiro do Perfil OPERATOR

O operador de caixa nunca deve saber o lucro da empresa, quanto o negócio fatura por mês ou o valor de compra dos produtos de fornecedores.

### Medidas Obrigatórias:
1. **Campos Ocultos na API de Produtos para OPERATOR:**
   Ao serializar a resposta de `/api/produtos`, o schema para operadores deve omitir ou zerar:
   - `preco_custo: null`
   - `margem_lucro_percentual: null`
2. **Rotas com Bloqueio 403 Imediato:**
   - `/api/despesas/*` $\to$ `403 Forbidden`
   - `/api/relatorio-mei/*` $\to$ `403 Forbidden`
   - `/api/das/*` $\to$ `403 Forbidden`
   - `/api/saude-negocio/*` $\to$ `403 Forbidden`
   - `/api/compras/*` $\to$ `403 Forbidden`
   - `/api/nfe/*` $\to$ `403 Forbidden`

---

## 3. Trilha de Auditoria (Audit Trail)

Todas as ações sensíveis devem registrar:
1. `user_id`: ID do usuário que efetuou a ação.
2. `empresa_id`: ID da empresa proprietária do registro.
3. `timestamp`: Data e hora em UTC.
4. `tipo_operacao`: `CRIACAO`, `EDICAO`, `CANCELAMENTO`, `SANGRIA`, `SUPRIMENTO`.
5. `justificativa`: Campo de texto obrigatório para sangrias e cancelamentos de vendas.
