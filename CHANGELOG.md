# 📋 Changelog — GESTOR MEI

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.2.0] - 2026-10-29
### 🚀 Sprint 5 — Controle DAS Mensal (MEI)

#### ✨ Adicionado (Added)
- **Modelagem da Entidade DasMensal:**
  - Criada a entidade `DasMensal` ([das.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/models/das.py)) com isolamento multiempresa (`empresa_id`), contendo os campos: `id`, `empresa_id`, `ano`, `mes`, `valor`, `vencimento`, `status` (`Pago`, `Pendente`, `Atrasado`), `data_pagamento`, `observacao`, `created_at` e `updated_at`.
  - Criado o script de migração unificado [migrate_sprint5.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/app/migrate_sprint5.py) para SQLite e PostgreSQL.
  - Configurado fixture global de inicialização em [conftest.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/tests/conftest.py) para execução resiliente da suíte de testes.

- **APIs REST de Controle DAS:**
  - `GET /api/das`: Listagem com filtros por ano e status, auto-geração dos 12 meses do ano e atualização automática para `Atrasado` caso a data de vencimento tenha expirado sem pagamento.
  - `POST /api/das/{id}/pagamento`: Registro de liquidação de guia com definição de `data_pagamento`, valor e observações/código de autenticação.
  - `PATCH /api/das/{id}/status`: Alteração de status (`Pago`, `Pendente`, `Atrasado`) com preenchimento ou limpeza automática da data de liquidação.
  - `GET /api/das/vencimentos`: Consulta detalhada de vencimentos com agrupamento por guias a vencer nos próximos 7 dias, guias em atraso e guias já pagas.
  - `GET /api/das/resumo`: Resumo financeiro consolidado contendo totais e quantidades por status (`Pago`, `Pendente`, `Atrasado`) e identificação do próximo vencimento prioritário.
  - `POST /api/das/gerar-ano`: Sincronização ou criação antecipada das 12 guias para qualquer exercício fiscal.
  - `GET /api/das/{id}` e `PUT /api/das/{id}`: Detalhamento e atualização cadastral de guias individuais.

- **Integração com Dashboard Inteligente:**
  - Adicionados campos e KPIs do DAS no retorno do endpoint `/api/dashboard`: `das_status_mes_atual`, `das_valor_mes_atual`, `das_vencimento_mes_atual`, `das_dias_restantes`, `das_qtd_atrasados`, `das_qtd_pendentes`, `das_qtd_pagos`, `das_alerta_tipo` e `das_alerta_mensagem`.
  - Alertas prioritários dinâmicos integrados no [DashboardGreeting.tsx](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/frontend/src/components/DashboardGreeting.tsx) e banners de notificação no topo de [Dashboard.tsx](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/frontend/src/pages/Dashboard.tsx):
    - Alerta crítico: DAS venceu / guias em atraso (com link direto de regularização).
    - Alerta de atenção: DAS vence em até 7 dias (com contagem regressiva de dias).
    - Alerta de conformidade: DAS quitado (com confirmação de conformidade com a Receita Federal).
  - Painel de indicadores do DAS Mensal adicionado na visão geral do Dashboard.

- **Frontend & Interface do Usuário:**
  - Criada a página [ControleDas.tsx](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/frontend/src/pages/ControleDas.tsx) com 4 cards de KPIs visuais (`DAS Pago`, `DAS Pendente`, `DAS Atrasado` e `Competência Atual`), seletor de ano fiscal, botão para sincronizar guias e atalho para o portal PGMEI da Receita Federal.
  - Tabela com listagem dos 12 meses do ano com chips coloridos de status (`Pago` em verde, `Pendente` em amarelo, `Atrasado` em vermelho), data de liquidação, observações e botões de ação rápida.
  - Modal interativo para registro de pagamento com data, valor e observações.
  - Modal de gerenciamento e alteração de status/valores da guia.
  - Exportação de dados do DAS para Excel e CSV.
  - Adicionado item "Controle DAS" no menu lateral do [Layout.tsx](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/frontend/src/components/Layout.tsx) com badge "Sprint 5" e rota `/das` no [App.tsx](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/frontend/src/App.tsx).

- **Testes Automatizados:**
  - Criada a suíte de testes [test_sprint5_das.py](file:///c:/Users/LeonidasPaulino/Downloads/gestor-mei-main/gestor-mei-main/backend/tests/test_sprint5_das.py) com 8 testes cobrindo auto-geração das 12 guias, registro de pagamento, alteração manual de status, consulta de vencimentos e alertas, resumo financeiro, integração com Dashboard, filtros e isolamento multiempresa (totalizando 27 testes com 100% de aprovação).

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
