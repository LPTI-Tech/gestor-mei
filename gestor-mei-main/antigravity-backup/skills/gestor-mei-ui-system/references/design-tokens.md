# Design Tokens — Gestor MEI UI System

Este documento define os valores universais de design tokens para garantir harmonia visual e acabamento premium em toda a interface do Gestor MEI.

---

## 1. Cores e Identidade

### Brand Core
- **Navy Primary (`#071933`):** Tom corporativo oficial, transmite segurança e seriedade bancária. Usado em headers, branding e contrastes fortes.
- **Tech Blue (`#1976D2`):** Acento dinâmico para botões principais, links ativos, indicadores de foco e abas ativas.
- **Electric Blue (`#42A5F5`):** Variação para modo escuro ou ícones decorativos de BI.

### Semântica Financeira (Padrão Asaas & Stripe)
- **Receitas / Faturamento (`#2E7D32` / `#16A34A`):** Verde escuro corporativo para saldo positivo, pagamentos concluídos e KPIs de alta.
- **Fundo Verde Suave (`rgba(46, 125, 50, 0.08)`):** Usado para pills e chips de status "Pago", "Aprovado" ou "Confirmado".
- **Despesas / Sangria / Saídas (`#D32F2F` / `#DC2626`):** Vermelho executivo para débitos, notas de cancelamento e custos fixos.
- **Fundo Vermelho Suave (`rgba(211, 47, 47, 0.08)`):** Usado para status "Pendente Atrasado", "Cancelado" ou "Crítico".
- **Alerta Fiscal MEI (`#ED6C02` / `#EA580C`):** Laranja âmbar para limite de faturamento de 80% do MEI, DAS a vencer e estoques baixos.
- **Fundo Âmbar Suave (`rgba(237, 108, 2, 0.08)`):** Usado para status "A vencer", "Aguardando", "Em entrega".

### Escala de Cinzas Executiva (Slate)
- **Slate 900 (`#0F172A`):** Texto de títulos principais (H1 a H5) no modo claro.
- **Slate 700 (`#334155`):** Texto de corpo principal, rótulos de campos.
- **Slate 500 (`#64748B`):** Subtítulos, textos de apoio, descrições secundárias.
- **Slate 300 (`#CBD5E1`):** Linhas divisórias ativas, bordas de inputs.
- **Slate 100 (`#F1F5F9`):** Fundo de linhas pares de tabelas (zebrado sutil), chips neutros.
- **Slate 50 (`#F8FAFC`):** Fundo principal da aplicação.

---

## 2. Tipografia Executiva

A tipografia deve guiar os olhos do usuário com hierarquia precisa:

| Nível | Tamanho | Peso | Letter Spacing | Uso Obrigatório |
| :--- | :--- | :--- | :--- | :--- |
| **Display KPI** | `2.25rem` (36px) | `800` | `-0.03em` | Valor principal de faturamento / saldo do caixa |
| **Page Title** | `1.5rem` (24px) | `700` ou `800` | `-0.02em` | Cabeçalho principal da página |
| **Card Header**| `1.125rem` (18px) | `700` | `-0.01em` | Título de seções e cartões |
| **Body Bold** | `0.9375rem` (15px) | `600` | `0` | Nomes de clientes, produtos e itens em destaque |
| **Body Normal**| `0.875rem` (14px) | `400` / `500` | `0` | Textos de células de tabelas, inputs |
| **Caption** | `0.75rem` (12px) | `600` | `+0.02em` | Rótulos de métricas, datas, status pills |

---

## 3. Sombras e Elevação (Box Shadows)

Nunca utilizar sombras duras ou pretas puras (`#000000`). Todas as sombras utilizam difusão no tom da marca:

- **Flat/Subtle (Padrão de Card):**
  `box-shadow: 0 1px 3px rgba(7, 25, 51, 0.05), 0 1px 2px rgba(7, 25, 51, 0.03);`
- **Elevated (Hover de Card / KPI):**
  `box-shadow: 0 10px 25px -5px rgba(7, 25, 51, 0.08), 0 8px 10px -6px rgba(7, 25, 51, 0.04);`
  `transform: translateY(-2px);`
- **Dropdown / Menu:**
  `box-shadow: 0 12px 30px rgba(7, 25, 51, 0.12);`
- **Modal / Diálogo:**
  `box-shadow: 0 20px 50px rgba(7, 25, 51, 0.22);`

---

## 4. Bordas e Superfícies

- **Card Border:** `1px solid rgba(0, 0, 0, 0.06)` no modo claro; `1px solid rgba(255, 255, 255, 0.08)` no modo escuro.
- **Border Radius Padrão:**
  - `borderRadius: 3` (12px) para cards de métricas e filtros.
  - `borderRadius: 4` (16px) para painéis principais e tabelas.
- **Glassmorphism Suave:** Em painéis superiores ou filtros flutuantes, aplicar:
  `backdropFilter: 'blur(8px)'`, `backgroundColor: 'rgba(255, 255, 255, 0.85)'`.

