# 📋 Changelog — GESTOR MEI

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.1.0] - 2026-10-28
### 🚀 Sprint 4 — Controle Completo de Estoque & Custos

#### ✨ Adicionado (Added)
- **Modelagem de Estoque e Custos:**
  - Adicionados os campos `quantidade_estoque`, `estoque_minimo` e `custo_unitario` na entidade `Produto` ([produto.py](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/backend/app/models/produto.py)).
  - Criada a entidade `MovimentacaoEstoque` ([estoque.py](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/backend/app/models/estoque.py)) com isolamento multiempresa (`empresa_id`), tipo (`ENTRADA`, `SAIDA`, `AJUSTE`), quantidade, motivo, usuário responsável e observações.
  - Criado o script de migração unificado [migrate_sprint4.py](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/backend/app/migrate_sprint4.py) para SQLite e PostgreSQL.

- **APIs REST de Estoque:**
  - `POST /api/estoque/entrada`: Registro de entrada de mercadorias com atualização opcional de custo unitário.
  - `POST /api/estoque/saida`: Baixa manual de estoque com justificativa (perdas, avarias, consumo interno, validade, descarte).
  - `POST /api/estoque/ajuste`: Correção de saldo após conferência física de inventário.
  - `POST /api/estoque/movimentacao`: Endpoint unificado de movimentação de estoque.
  - `GET /api/estoque/movimentacoes`: Histórico cronológico de movimentações filtrado por produto e tipo.
  - `GET /api/estoque/resumo`: Panorama patrimonial com total de itens, contagem de estoque baixo, valorização a preço de custo e potencial de venda.
  - `GET /api/estoque/baixo`: Listagem exclusiva de produtos em nível crítico.

- **Integração com PDV / Vendas:**
  - Baixa automática no estoque ao concluir uma venda com itens do tipo `PRODUTO`, registrando auditoria de saída.
  - Estorno automático de estoque ao cancelar pedidos/vendas, registrando auditoria de entrada com motivo de estorno.

- **Frontend & Interface do Usuário:**
  - Criada a tela [Estoque.tsx](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/frontend/src/pages/Estoque.tsx) com 4 cartões de métricas (KPIs), tabela de posição de estoque com busca e filtros, aba de histórico de movimentações e modais interativos para Entrada, Baixa e Ajuste.
  - Alerta de reposição de estoque crítico adicionado no [Dashboard.tsx](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/frontend/src/pages/Dashboard.tsx) com botão de atalho direto para a tela de estoque.
  - Campos de custo e estoque integrados ao modal de criação/edição de produtos em [Produtos.tsx](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/frontend/src/pages/Produtos.tsx).
  - Adicionado item "Controle de Estoque" no menu lateral do [Layout.tsx](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/frontend/src/components/Layout.tsx) e rota `/estoque` no [App.tsx](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/frontend/src/App.tsx).
  - Componente [ApiStatusIndicator.tsx](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/frontend/src/components/ApiStatusIndicator.tsx) com indicador em tempo real `🟢 Sistema Online` e `🔴 Sistema Offline`.

- **Testes Automatizados:**
  - Criada a suíte de testes [test_sprint4_estoque.py](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/backend/tests/test_sprint4_estoque.py) com 7 testes cobrindo todas as regras da Sprint 4 (totalizando 19 testes automatizados com 100% de aprovação).

#### 🔧 Corrigido (Fixed)
- Adicionada a dependência `email-validator` no [requirements.txt](file:///c:/Users/LeonidasPaulino/Desktop/gestor-mei-main/backend/requirements.txt) para compatibilidade com Pydantic v2.
- Resolvido conflito da porta padrão `8000` no Windows (WinError 10013) direcionando a API para a porta `8001`.
- Ajustada a estrutura de pastas raiz do projeto removendo diretório aninhado redundante.

---

## [1.0.0] - 2026-10-21
### 🚀 Sprints 1, 2 e 3 — Núcleo SaaS, Carrinho 1:N & Logística de Entrega

#### ✨ Funcionalidades
- **Sprint 1:** Autenticação JWT com perfis Admin e Operador, Dashboard Executivo, Catálogo de Produtos e Serviços, PDV Rápido (<10s), Controle de Caixa com Fechamento Cego, Despesas e Relatório Anual DASN-SIMEI (Teto de R$ 81.000,00).
- **Sprint 2:** Modelagem relacional `Venda` e `ItemVenda` com carrinho interativo, gestão de clientes com WhatsApp e cálculo automático de totais.
- **Sprint 3:** Regiões de entrega e bairros com frete fixo, Kanban operacional de delivery (*Recebido ➔ Em Preparo ➔ Saiu para Entrega ➔ Entregue*), vinculação de motoboys e arquitetura para impressão de comanda térmica ESC/POS (58mm e 80mm).
