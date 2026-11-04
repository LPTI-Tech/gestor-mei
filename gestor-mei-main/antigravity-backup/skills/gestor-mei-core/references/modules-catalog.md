# Catálogo dos 12 Módulos Homologados — Gestor MEI

Este catálogo documenta o funcionamento, as rotas e os modelos de dados de cada um dos 12 módulos de negócio 100% homologados e funcionais do Gestor MEI.

---

### 1. PDV (Ponto de Venda Rápido)
- **Rota Frontend:** `/vendas`
- **Endpoints Backend:** `/api/vendas`, `/api/vendas/finalizar`
- **Funcionalidades:**
  - Registro ágil de itens via código de barras ou seleção em catálogo touch-friendly.
  - Multi-pagamento: Dinheiro (com cálculo automático de troco), PIX, Cartão de Débito, Cartão de Crédito.
  - Baixa automática no saldo de estoque.
  - Geração de cupom de conferência e envio de comprovante via WhatsApp.

---

### 2. Delivery & Pedidos
- **Rota Frontend:** `/pedidos-entrega` e `/regioes-entrega`
- **Endpoints Backend:** `/api/vendas/delivery`, `/api/regioes-entrega`
- **Funcionalidades:**
  - Gestão de pedidos com status: *Aguardando Preparo*, *Em Produção*, *Saiu para Entrega*, *Entregue*.
  - Configuração de taxas fixas por bairro ou região de entrega.
  - Atribuição de motoboy e cálculo automático da comissão de entrega.

---

### 3. Caixa do Dia
- **Rota Frontend:** `/caixa`
- **Endpoints Backend:** `/api/caixa/turno`, `/api/caixa/lancamentos`
- **Funcionalidades:**
  - Abertura de turno com valor de fundo de troco (suprimento).
  - Lançamento de sangrias justificadas (ex: pagamento de gelo ou retiradas).
  - Fechamento cego ou assistido com conferência por operador e apuração de sobras/faltas.

---

### 4. Clientes
- **Rota Frontend:** `/clientes`
- **Endpoints Backend:** `/api/clientes`
- **Funcionalidades:**
  - Cadastro de pessoa física (CPF) ou jurídica (CNPJ).
  - Histórico de pedidos e faturamento acumulado por cliente.
  - Endereço formatado com CEP integrado via ViaCEP.

---

### 5. Produtos & Serviços
- **Rota Frontend:** `/produtos`
- **Endpoints Backend:** `/api/produtos`
- **Funcionalidades:**
  - Preço de custo, margem de lucro (%) e preço final sugerido.
  - Código EAN-13 / Código interno e unidade de medida (UN, KG, L).
  - Categorização dinâmica e ativação/desativação de produtos no cardápio.

---

### 6. Controle de Estoque
- **Rota Frontend:** `/estoque`
- **Endpoints Backend:** `/api/estoque/movimentacoes`, `/api/estoque/alertas`
- **Funcionalidades:**
  - Movimentações rastreadas: entrada por compra, saída por venda, perda/avaria e ajuste de inventário.
  - Painel de alerta para itens com saldo abaixo do estoque mínimo de segurança.

---

### 7. Entrada XML NF-e
- **Rota Frontend:** `/nfe`
- **Endpoints Backend:** `/api/nfe/upload`, `/api/nfe/processar`
- **Funcionalidades:**
  - Upload direto do arquivo `.xml` da Nota Fiscal Eletrônica emitida por atacadistas.
  - Parser automático de emitente, chave de acesso, impostos, data de emissão e itens da nota.
  - Associação automática com produtos existentes ou cadastro rápido de novos itens com recalculo de custo médio.

---

### 8. Compra Manual
- **Rota Frontend:** `/compras` e `/compras/novo`
- **Endpoints Backend:** `/api/compras`
- **Funcionalidades:**
  - Lançamento de compras sem nota fiscal ou notas manuais de fornecedores informais.
  - Rateio de frete e despesas acessórias adicionadas ao custo dos produtos.

---

### 9. Controle DAS (Documento de Arrecadação do Simples Nacional)
- **Rota Frontend:** `/das`
- **Endpoints Backend:** `/api/das`
- **Funcionalidades:**
  - Grade com as 12 competências anuais (Janeiro a Dezembro).
  - Status visual de cada guia: *Pendente*, *Pago*, *Vencido*.
  - Link direto para geração da guia oficial no PGMEI da Receita Federal.

---

### 10. Relatório MEI (DASN-SIMEI)
- **Rota Frontend:** `/relatorio-mei`
- **Endpoints Backend:** `/api/relatorio-mei`
- **Funcionalidades:**
  - Segregação fiscal obrigatória: Vendas no Comércio (com incidência de ICMS) vs Serviços (ISS).
  - Totalizador mensal acumulado para preenchimento oficial da Declaração Anual do MEI (DASN).
  - Termômetro gráfico de proximidade do teto de R$ 81.000,00.

---

### 11. Saúde do Negócio
- **Rota Frontend:** `/saude-negocio`
- **Endpoints Backend:** `/api/saude-negocio`
- **Funcionalidades:**
  - Diagnóstico financeiro baseado nos números reais da operação.
  - Margem de contribuição média, ticket médio por cliente e projeção de faturamento até o fim do ano.
  - Recomendações práticas e acionáveis para o empreendedor economizar e lucrar mais.

---

### 12. Painel do Consultor
- **Rota Frontend:** `/consultor`
- **Endpoints Backend:** `/api/consultor/empresas`
- **Funcionalidades:**
  - Visão geral multi-carteira para consultores credenciados pela LPTI Tech.
  - Comparativo de faturamento entre clientes atendidos.
  - Alertas prioritários de empresas com DAS em atraso ou faturamento em risco de desenquadramento.

