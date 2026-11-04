# Diretrizes do Projeto Gestor MEI

## 1. Skill de Domínio e Governança: gestor-mei-core (LPTI Tech)

- **Empresa:** LPTI Tech
- **Produto:** Gestor MEI
- **Stack Oficial:**
  - Frontend: React 18, TypeScript, Vite, Material UI (MUI v5)
  - Backend: FastAPI (Python 3.10+), SQLAlchemy 2.0, Uvicorn
  - Banco de Dados: PostgreSQL Neon Serverless (com suporte a SQLite local)
  - Infraestrutura: Vercel (Frontend) + Render (Backend)
- **Arquitetura:** SaaS Multiempresa (Multi-tenant via `empresa_id`), RBAC, Licenciamento SaaS, Painel Consultor
- **Perfis de Acesso (RBAC):** `MASTER`, `OWNER`, `CONSULTOR`, `OPERATOR`
- **Regras Inegociáveis:**
  1. `MASTER` cria Empresa.
  2. `MASTER` cria `OWNER`.
  3. `OWNER` cria `OPERATOR`.
  4. `CONSULTOR` vinculado estritamente por empresa (`empresa_id`).
  5. `OPERATOR` não visualiza financeiro (sem acesso a faturamento, despesas, margens, DAS e saúde do negócio).
- **12 Módulos Homologados (Status: 100% Funcionais):**
  PDV, Delivery, Caixa, Clientes, Produtos, Estoque, XML NF-e, Compra Manual, DAS, Relatório MEI, Saúde do Negócio, Painel Consultor.
- **Roadmap Oficial:**
  - Sprint 8C: NFC-e e QR Code
  - Sprint 9: Licenciamento SaaS
  - Sprint 10: Portal do Cliente
  - Sprint 11: Cobrança Recorrente

---

## 2. Skill de UI/UX Executivo: gestor-mei-ui-system

Para todo e qualquer desenvolvimento, refatoração e refinamento visual de interface:
1. **Nunca utilizar layouts genéricos:** Proibidas tabelas cruas, telas vazias e caixas empilhadas sem hierarquia.
2. **Nunca utilizar componentes visuais padrão sem personalização:** Todo componente deve possuir raio de curvatura moderno (12px a 16px), bordas sutis com opacidade, sombras multicamadas e hover states elegantes.
3. **Padrão SaaS Premium:** Inspiração mandatória em **Asaas**, **Omie**, **Conta Azul**, **Stripe Dashboard** e **Shopify Admin**.
4. **Prioridades Obrigatórias:** Espaçamento generoso (8px, 16px, 24px, 32px), hierarquia visual forte (Títulos 700/800), cards modernos e Business Intelligence (BI com $\Delta$).
5. **Intocáveis:** Não alterar regras de negócio, RBAC ou módulos homologados. Atuar somente sobre UX e Design.

---

## 3. Skill de Proteção e Isolamento: gestor-mei-rbac

Blindagem permanente de controle de acesso e governança de dados:
1. **Isolamento de Dados Multiempresa:** Consultas e mutações exigem filtro obrigatório por `empresa_id == current_user.empresa_id`.
2. **Hierarquia Inviolável:** `MASTER` $\to$ Empresas e `OWNER`; `OWNER` $\to$ `OPERATOR`; `CONSULTOR` $\to$ Carteira de empresas vinculadas.
3. **Bloqueio Financeiro Total do OPERATOR:** Sem acesso a faturamento, despesas, margens de lucro, relatórios tributários e saúde do negócio. Retornar `403 Forbidden` no backend e ocultar rotas no frontend.
4. **Imutabilidade de Auditoria:** Rastrear `user_id`, `empresa_id`, timestamp e justificativa em todas as movimentações críticas.

---

## 4. Skill de Licenciamento SaaS: gestor-mei-saas (Sprint 9)

Preparação oficial da infraestrutura de monetização e gestão de assinaturas:
1. **Planos Comerciais:**
   - **START:** PDV Balcão, Caixa, Clientes, Produtos, Estoque Básico, DAS e Relatório MEI (1 operador).
   - **DELIVERY PRO:** START + Delivery, Taxas de Região, Motoboys e iFood (até 3 operadores).
   - **FULL MEI:** Todos os recursos + XML NF-e, Compra Manual, Saúde do Negócio com BI, Consultoria e operadores ilimitados.
2. **Status da Licença:** `TRIAL` (14 dias grátis), `ATIVA`, `SUSPENSA` (Modo Somente Leitura) e `CANCELADA`.
3. **Regras Financeiras:**
   - Carência de 5 dias corridos pós-vencimento (Grace Period).
   - Suspensão automática no 6º dia (pausa novas vendas, preserva consulta histórica).
   - Reativação instantânea via webhook de confirmação de pagamento.

---

## 5. Skill de Identidade e Marca: lpti-brand-guidelines

Proteção mandatória da propriedade intelectual e identidade visual:
1. **Hierarquia Obrigatória:**
   - **A Empresa Desenvolvedora:** `LPTI Tech` (sempre creditada no rodapé da Sidebar e telas de login).
   - **O Produto Comercial:** `Gestor MEI` (marca principal visível no topo da Sidebar, telas e documentos).
2. **Proibição de Substituição:** Sob hipótese alguma renomear ou ocultar a marca "Gestor MEI" ou remover os créditos da "LPTI Tech".
3. **Paleta Oficial:** Navy Primário (`#071933`), Tech Blue (`#1976D2`), Verde Receita (`#2E7D32`), Âmbar Alerta MEI (`#ED6C02`).

---

## 6. Governança e Manutenção de Estado do Projeto

Sempre que uma sprint for encerrada ou uma nova funcionalidade for homologada, atualizar imediatamente o arquivo [`docs/PROJECT_STATUS.md`](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/docs/PROJECT_STATUS.md) com o status atualizado, versão, módulos entregues e definição da próxima sprint.

