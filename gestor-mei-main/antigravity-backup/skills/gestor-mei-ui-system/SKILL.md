---
name: gestor-mei-ui-system
description: >-
  Sistema de design executivo e diretrizes visuais para o Gestor MEI.
  Ative esta skill para qualquer implementação, desenvolvimento ou refatoração
  de interface (UI/UX) para garantir padrão SaaS comercial premium inspirado em
  Stripe, Asaas, Conta Azul, Omie e Shopify Admin, eliminando componentes padrão
  e layouts genéricos.
---

# Gestor MEI — Executive UI System (SaaS Premium)

Este documento define a especificação obrigatória de interface (UI), experiência do usuário (UX) e design system executivo para o **GESTOR MEI**. O objetivo supremo é **eliminar qualquer aparência genérica ou padrão de template**, elevando todas as telas ao nível de produtos SaaS comerciais consolidados de alto valor de mercado.

---

## 🎯 10 Regras Obrigatórias Inegociáveis

1. **Nunca utilizar layouts genéricos:** Telas vazias, tabelas cruas sem estilização, formulários cinzentos e caixas empilhadas sem hierarquia são terminantemente proibidos.
2. **Nunca utilizar componentes visuais padrão sem personalização:** Todo componente (MUI/Tailwind/CSS) deve possuir raio de curvatura moderno, bordas sutis com opacidade, sombras multicamadas em hover e transições suaves.
3. **Padrão SaaS Premium em 100% dos desenvolvimentos:** Cada tela deve transmitir credibilidade imediata, segurança de nível bancário e elegância corporativa.
4. **Benchmarks de Referência Obrigatórios:**
   - **Stripe Dashboard:** Tipografia nítida, microinterações, densidade equilibrada de informações, números em destaque com peso 700/800.
   - **Asaas:** Clareza e precisão em fluxos financeiros, badges com status nítidos e legíveis (Pago, Pendente, Atrasado), conciliação visual rápida.
   - **Conta Azul:** Simplicidade executiva focada no microempreendedor brasileiro, jornada sem atritos, cards de fácil digestão.
   - **Omie:** Robustez corporativa, organização estruturada de módulos operacionais, agrupamento coerente de ferramentas.
   - **Shopify Admin:** Cabeçalhos de página com títulos fortes, botões de ação primária bem demarcados, cards com métricas contextuais e deltas comparativos.
5. **Prioridades de Design:**
   - **Espaçamento generoso:** Respiro intencional (8px, 16px, 24px, 32px), sem aglomeração claustrofóbica de elementos.
   - **Hierarquia visual forte:** Título da página (H5/H6 700/800) $\to$ Contexto/Subtítulo $\to$ Indicadores de KPI/BI $\to$ Área de Dados/Ação Principal.
   - **Cards modernos:** Fundo contrastante, borda de `1px solid rgba(..., 0.08)`, cantos arredondados de `12px` a `16px`, efeito sutil de hover (`translateY(-2px)` e expansão de sombra).
   - **Design executivo:** Paleta sóbria (Azul profundo/marinho, Cinza ardósia, Branco puro / Dark mode profundo), com toques semânticos (Verde esmeralda para lucro/saldo, Âmbar para atenção/alerta, Carmim para despesa/risco).
   - **Business Intelligence (BI):** Indicadores acompanhados de badges percentuais comparativos ($\Delta$ vs período anterior), metas fiscais do MEI (R$ 81.000) e barras de progresso elegantes.
6. **Aparência de Produto Comercial Vendável:** Qualquer tela deve estar pronta para ser exibida em um pitch comercial ou landing page institucional sem demandar ajustes.
7. **Regras de Negócio Intocáveis:** Não alterar cálculos tributários MEI, DAS, limites de faturamento, margens de lucro ou regras fiscais.
8. **RBAC Intocável:** Não alterar verificações de permissões e perfis de acesso (`ADMIN`, `OPERADOR`, `CONSULTOR`, `OWNER`, `MASTER`).
9. **Módulos Homologados Intocáveis:** Não alterar lógica funcional já homologada (PDV, Caixa, Motoboy, iFood, NF-e, Compras, DAS, Consultor).
10. **Escopo Restrito:** Atuar estritamente sobre **UX, Design, Layout e Estilização Visual**.

---

## 🏛️ Anatomia Padrão de uma Tela SaaS Executiva

Toda página deve respeitar a estrutura de 4 blocos verticais:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. HEADER EXECUTIVO DE PÁGINA                                   │
│    Título H5 (700) + Subtítulo de Contexto + Botões de Ação     │
├─────────────────────────────────────────────────────────────────┤
│ 2. CARDS DE KPI / BUSINESS INTELLIGENCE (GRID RESPONSIVO)        │
│    [ Card 1: R$ Valor ]  [ Card 2: Quantidade ]  [ Card 3: % ]   │
│    + Variação vs mês anterior (ex: +14.2% ↑ em verde)          │
├─────────────────────────────────────────────────────────────────┤
│ 3. BARRA DE FILTROS & AÇÕES RÁPIDAS                             │
│    [ Campo Busca ] [ Select Status ] [ Filtro Data ] [ Export ] │
├─────────────────────────────────────────────────────────────────┤
│ 4. ÁREA PRINCIPAL DE TRABALHO (CARD CONTAINER MODERNO)          │
│    Tabela estilizada / Gráfico interativo / Formulário premium  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Tokens Visuais Essenciais

### 1. Paleta de Cores e Gradientes

| Propósito | Modo Claro | Modo Escuro | Aplicação |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `#071933` / `#1976D2` | `#42A5F5` / `#0D2847` | Ações principais, cabeçalhos, logos |
| **Secondary Success** | `#2E7D32` | `#4CAF50` | Faturamento, lucro, status pago |
| **Warning / MEI Alert**| `#ED6C02` | `#FF9800` | Atenção limite MEI, pendências |
| **Error / Critical** | `#D32F2F` | `#EF5350` | Despesas, saídas, prejuízo |
| **Background Default**| `#F8FAFC` (Slate 50) | `#0B132B` | Fundo principal da aplicação |
| **Surface / Card** | `#FFFFFF` | `#131C38` | Superfície dos cards e tabelas |
| **Border Subtle** | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)`| Delimitação refinada |

### 2. Cantos Arredondados (Border Radius)
- **Badges / Chips:** `6px` a `8px`
- **Campos de Texto / Botões:** `8px` a `10px`
- **Cards e Painéis:** `12px` a `16px`
- **Modais e Diálogos:** `16px` a `20px`

### 3. Sombras (Box Shadow)
- **Nível 1 (Card normal):** `0 2px 8px rgba(7, 25, 51, 0.05), 0 1px 2px rgba(7, 25, 51, 0.03)`
- **Nível 2 (Hover de Card / Dropdown):** `0 8px 24px rgba(7, 25, 51, 0.08), 0 2px 6px rgba(7, 25, 51, 0.04)`
- **Nível 3 (Modais / Destaques):** `0 16px 40px rgba(7, 25, 51, 0.16)`

---

## 📑 Guias Complementares da Skill

Para implementações detalhadas, consulte os arquivos complementares:
- [Design Tokens Detalhados](./references/design-tokens.md)
- [Benchmark de Referências (Stripe, Asaas, Conta Azul, etc.)](./references/benchmark-references.md)
- [Catálogo de Componentes SaaS](./references/components-catalog.md)
- [Regras Estritas: O que Fazer vs O que Não Fazer](./references/do-and-dont.md)
- [Exemplos Prontos de Código](./examples/)

