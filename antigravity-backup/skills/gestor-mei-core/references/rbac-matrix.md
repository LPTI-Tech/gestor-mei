# Matriz de Acesso RBAC — Gestor MEI

Este documento define com precisão cirúrgica a matriz de controle de acesso baseado em funções (Role-Based Access Control) do **GESTOR MEI**.

---

## 1. Definição Formal dos Perfis

### 👑 MASTER (Plataforma LPTI Tech)
- **Atribuição:** Membros da equipe de engenharia e operações da LPTI Tech.
- **Hierarquia:** Nível 1 (Máximo).
- **Competências Exclusivas:**
  - Criar, editar, suspender e reativar Empresas (Tenants).
  - Provisionar e resetar credenciais do usuário `OWNER` de cada empresa.
  - Configurar parâmetros globais da plataforma e licenças de uso.

### 🏢 OWNER (Proprietário da Empresa MEI)
- **Atribuição:** O microempreendedor individual titular do CNPJ.
- **Hierarquia:** Nível 2.
- **Competências:**
  - Acesso total e irrestrito a todos os dados da **sua** empresa.
  - Convidar, criar, pausar e excluir contas de `OPERATOR` vinculadas à sua equipe.
  - Visualizar todo o faturamento, margens, compras, controle de estoque e auditoria de caixa.
  - Acessar o Relatório MEI (DASN) e Controle DAS.

### 💼 CONSULTOR (Consultoria LPTI Tech / Contabilidade Parceira)
- **Atribuição:** Consultores de negócios, assessores contábeis ou analistas financeiros.
- **Hierarquia:** Nível 2 (Especializado).
- **Competências:**
  - Acesso de leitura/auditoria profunda nas empresas da sua carteira atribuída.
  - Auditoria de despesas, conciliação de notas fiscais XML e saúde do negócio.
  - Emissão de relatórios fiscais do SIMEI.
  - **Restrição:** Não pode criar operadores nem alterar dados cadastrais ou societários da empresa.

### 🛒 OPERATOR (Operador de Caixa / Atendente)
- **Atribuição:** Funcionários de balcão, caixa e delivery.
- **Hierarquia:** Nível 3 (Operacional).
- **Competências:**
  - Realizar vendas no PDV e cadastrar pedidos para entrega.
  - Consultar preços e catálogo de produtos.
  - Abrir turno de caixa, registrar entradas operacionais e fechar seu turno.
- **Restrição Absoluta (Regra Inegociável):**
  - **PROIBIDO** visualizar relatórios de faturamento global da empresa.
  - **PROIBIDO** visualizar tela de Despesas, Saúde do Negócio e Controle DAS.
  - **PROIBIDO** visualizar custos de aquisição em notas fiscais ou margens de lucro dos produtos.

---

## 2. Matriz de Permissões por Módulo

| Módulo / Funcionalidade | MASTER | OWNER | CONSULTOR | OPERATOR |
| :--- | :---: | :---: | :---: | :---: |
| **Gerenciar Empresas (Criar/Bloquear)** | ✅ | ❌ | ❌ | ❌ |
| **Criar/Resetar Contas OWNER** | ✅ | ❌ | ❌ | ❌ |
| **Criar/Gerenciar OPERATOR** | ✅ | ✅ | ❌ | ❌ |
| **PDV / Registrar Vendas** | ✅ | ✅ | ❌ | ✅ |
| **Pedidos Delivery & Regiões** | ✅ | ✅ | ❌ | ✅ |
| **Abertura/Fechamento de Caixa**| ✅ | ✅ | ❌ | ✅ (Seu Turno) |
| **Visualizar Histórico Completo de Caixa** | ✅ | ✅ | ✅ | ❌ |
| **Cadastro de Produtos & Preço Venda** | ✅ | ✅ | ❌ | 👁️ (Leitura) |
| **Preço de Custo & Margem de Lucro** | ✅ | ✅ | ✅ | ❌ (Oculto) |
| **Controle de Estoque (Kardex)**| ✅ | ✅ | ✅ | 👁️ (Saldo apenas) |
| **Entrada XML NF-e & Compras** | ✅ | ✅ | ✅ | ❌ |
| **Gestão de Despesas** | ✅ | ✅ | ✅ | ❌ |
| **Controle DAS (Guias MEI)** | ✅ | ✅ | ✅ | ❌ |
| **Relatório MEI (DASN)** | ✅ | ✅ | ✅ | ❌ |
| **Saúde do Negócio (BI & Margens)**| ✅ | ✅ | ✅ | ❌ |
| **Painel do Consultor** | ✅ | ❌ | ✅ | ❌ |
| **Configurações Gerais da Empresa** | ✅ | ✅ | ❌ | ❌ |

---

## 3. Implementação Técnica de Guarda (Backend & Frontend)

### Backend (FastAPI Dependency Injection)
```python
# app/dependencies.py
def require_roles(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso não autorizado para o perfil do seu usuário."
            )
        return current_user
    return role_checker
```

### Frontend (React Auth Context Guard)
```tsx
// Exemplo no App.tsx ou Layout.tsx
{isAdminOrOwner && <MenuItem to="/despesas">Despesas</MenuItem>}
{!isOperator && <MenuItem to="/relatorio-mei">Relatório MEI</MenuItem>}
```

