# 🎨 GESTOR MEI — Official UI Design System

> **Versão:** 1.0.0 — Sprint Visual  
> **Empresa:** LPTI Tech  
> **Produto:** GESTOR MEI  
> **Objetivo:** Estabelecer o padrão visual oficial executivo (SaaS Premium), eliminando qualquer aparência genérica ou padrão do Material UI.

---

## 🏛️ 1. Filosofia de Design & Benchmarks Oficiais

O design system do **Gestor MEI** foi concebido a partir da fusão das 5 maiores referências globais em software empresarial e fintech:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GESTOR MEI UI SYSTEM                            │
├────────────────────┬───────────────────────────────────────────────────┤
│ 1. STRIPE          │ Tipografia tabular (tnum), pesos 700/800, micro-  │
│    DASHBOARD       │ interações, sombras multicamadas difusas.         │
├────────────────────┼───────────────────────────────────────────────────┤
│ 2. ASAAS           │ Clareza financeira, badges de status semânticos   │
│                    │ (pills com fundo pastel) e conciliação visual.    │
├────────────────────┼───────────────────────────────────────────────────┤
│ 3. CONTA AZUL      │ Acolhimento e clareza para o microempreendedor,   │
│                    │ foco em ações imediatas e termômetro do teto MEI. │
├────────────────────┼───────────────────────────────────────────────────┤
│ 4. OMIE            │ Robustez operacional, organização modular de dados│
│                    │ e densidade equilibrada em fluxos de estoque.     │
├────────────────────┼───────────────────────────────────────────────────┤
│ 5. SHOPIFY ADMIN   │ Page headers padronizados com hierarquia forte e  │
│                    │ ações contextuais alinhadas à direita.            │
└────────────────────┴───────────────────────────────────────────────────┘
```

---

## 📐 2. Espaçamentos & Ritmo Vertical

O Gestor MEI adota uma escala estrita baseada em grade de **8px** (com subunidades de 4px):

### Escala de Tokens de Espaçamento
| Token | Valor em Pixels | Aplicação Obrigatória |
| :--- | :---: | :--- |
| **`space.xs`** | `4px` (0.25rem) | Gaps de badges, ícone + texto em linha, microajustes. |
| **`space.sm`** | `8px` (0.5rem) | Espaço entre inputs, margem interna de chips e botões pequenos. |
| **`space.md`** | `16px` (1rem) | Gap padrão entre colunas em telas menores, padding interno de cards compactos. |
| **`space.lg`** | `24px` (1.5rem) | Padding padrão de cards (`p: 3`), gap entre blocos de métricas. |
| **`space.xl`** | `32px` (2rem) | Margem entre seções principais da tela (Header $\to$ KPIs $\to$ Tabela). |
| **`space.2xl`**| `48px` (3rem) | Respiro superior e inferior de páginas complexas. |

### Padrão de Container de Página
```tsx
// Aplicar em toda página principal:
<Box sx={{ p: { xs: 2, sm: 3, md: 3.5 }, maxWidth: 1440, mx: 'auto' }}>
```

---

## 🔲 3. Bordas & Raios de Curvatura (Borders & Radii)

Nenhum componente do Gestor MEI deve ter cantos vivos ou pontiagudos de 0px a 4px.

### Escala de Border Radius
| Componente | Radius em Pixels | Equivalência MUI `sx` |
| :--- | :---: | :--- |
| **Badges, Tags e Chips** | `6px` a `8px` | `borderRadius: 1.5` ou `2` |
| **Botões e Campos de Texto (Inputs)** | `8px` a `10px` | `borderRadius: 2` ou `2.5` |
| **Cards de KPI e Filtros** | `12px` | `borderRadius: 3` |
| **Painéis Principais, Tabelas e Containers** | `16px` | `borderRadius: 4` |
| **Modais e Diálogos de Confirmação** | `20px` | `borderRadius: 5` |

### Cores de Contorno (Bordas Sutis)
As bordas nunca devem ser pretas puras (`#000000`). Sempre usar opacidade sutil:
- **Modo Claro:** `border: '1px solid rgba(0, 0, 0, 0.06)'`
- **Modo Escuro:** `border: '1px solid rgba(255, 255, 255, 0.08)'`

---

## ☁️ 4. Sistema de Sombras & Elevação (Box Shadows)

As sombras no Gestor MEI utilizam a cor corporativa **Navy (`#071933`)** em baixa opacidade e difusão multicamada para criar profundidade sem sujeira visual.

### Níveis de Sombra
```css
/* Nível 0: Flat (Sem elevação) */
box-shadow: none;

/* Nível 1: Subtle (Card em repouso) */
box-shadow: 0 1px 3px rgba(7, 25, 51, 0.04), 0 1px 2px rgba(7, 25, 51, 0.02);

/* Nível 2: Elevated Hover (Elevação suave ao passar o mouse) */
box-shadow: 0 8px 24px -4px rgba(7, 25, 51, 0.08), 0 4px 8px -2px rgba(7, 25, 51, 0.03);
transform: translateY(-2px);
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Nível 3: Floating / Dropdown / Popover */
box-shadow: 0 12px 32px rgba(7, 25, 51, 0.12);

/* Nível 4: Modal & Backdrop */
box-shadow: 0 24px 60px rgba(7, 25, 51, 0.22);
```

---

## 🗂️ 5. Cards Modernos (SaaS Standard)

Os cards devem possuir contraste claro com o fundo da página (`#F8FAFC` no modo claro):

```tsx
<Card
  elevation={0}
  sx={{
    p: 2.5,
    borderRadius: 3,
    border: '1px solid',
    borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
    bgcolor: 'background.paper',
    boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      boxShadow: '0 8px 24px rgba(7, 25, 51, 0.08)',
      transform: 'translateY(-2px)',
    },
  }}
>
  {/* Conteúdo do Card */}
</Card>
```

---

## 📑 6. Cabeçalhos Executivos de Página (Page Headers)

Inspirados no padrão do **Shopify Admin**, todo topo de tela deve apresentar título forte, frase de contexto e botões de ação alinhados à direita:

```tsx
<Box
  sx={{
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    justifyContent: 'space-between',
    alignItems: { xs: 'flex-start', sm: 'center' },
    gap: 2,
    mb: 3.5,
  }}
>
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>
        Título da Página
      </Typography>
      {/* Opcional: Badge contextual */}
      <Chip label="Módulo Oficial" size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: 1.5 }} />
    </Box>
    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
      Descrição explicativa concisa que orienta o MEI sobre o objetivo da tela.
    </Typography>
  </Box>

  {/* Ações da Página */}
  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
    <Button variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
      Ação Secundária (Ex: Exportar)
    </Button>
    <Button
      variant="contained"
      color="primary"
      sx={{
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: 700,
        boxShadow: '0 4px 14px rgba(25, 118, 210, 0.35)',
      }}
    >
      + Ação Principal (Ex: Novo Registro)
    </Button>
  </Box>
</Box>
```

---

## 📊 7. Tabelas SaaS Modernas (Modern Data Tables)

Inspiradas no **Asaas** e **Stripe**, as tabelas do Gestor MEI devem ser limpas, legíveis e com alinhamento rigoroso:

```
┌────────────────────────────────────────────────────────────────────────┐
│ NOME / CLIENTE         DATA         STATUS       QUANTIDADE      VALOR │ (Header cinza ardósia)
├────────────────────────────────────────────────────────────────────────┤
│ Maria Silva            14/10/2026   🟢 Pago              02   R$ 85,00 │ (Linha hover)
│ João Santos            14/10/2026   🟡 Pendente          01   R$ 35,00 │
└────────────────────────────────────────────────────────────────────────┘
                                                         ▲             ▲
                                      Alinhamento centro │             │ Alinhamento direita (tnum)
```

### Regras Mandatórias de Tabelas:
1. **Cabeçalho:** Fundo suave (`#F8FAFC` no light), texto em caixa alta discreta (`fontSize: 0.72rem`, `fontWeight: 700`, `letterSpacing: 0.05em`).
2. **Células:** Altura mínima de `52px` para toque confortável em telas sensíveis ao toque.
3. **Alinhamento Numérico:** Valores de moeda (`R$`) e quantidades devem ser **sempre alinhados à direita** (`align="right"`).
4. **Fonte Tabular:** Aplicar `fontFeatureSettings: '"tnum"'` em números para que todos os dígitos tenham a mesma largura horizontal.
5. **Status Pills:** Status em chips com cantos arredondados, fundo pastel com 10% de opacidade e texto com 100% de saturação (ex: `🟢 Pago` com fundo `rgba(46, 125, 50, 0.1)`).

---

## 🪟 8. Modais & Janelas de Diálogo (Modals & Dialogs)

Os diálogos não devem ser caixas cruas de formulário.

### Padrão Estrutural:
- **Header:** Título H6 com peso 700, ícone do módulo e botão de fechar no canto superior direito (`IconButton <Close />`).
- **Body:** Agrupamento em cartões internos ou seções separadas por divisores suaves. Espaçamento interno de `24px`.
- **Footer (Actions):** Botão "Cancelar" com `variant="outlined"` ou cor discreta e botão de ação primária destacado à direita.
- **Raio de Borda:** `borderRadius: 4` ou `5` (`16px` a `20px`).

---

## 📈 9. Cards de KPI & Indicadores Executivos

O componente oficial para exibir KPIs deve conter:
1. **Ícone em Bolha (Icon Bubble):** Caixa de `42px x 42px` com cantos de `10px`, fundo com 10% de opacidade e ícone com cor vívida.
2. **Rótulo Superior:** Em maiúsculas atenuadas com `fontWeight: 700`.
3. **Valor Principal:** Tamanho `H4` com peso `800`, `letterSpacing: -0.02em` e números tabulares.
4. **Badge de Tendência ($\Delta$):** Chip com variação percentual vs. período anterior (`+14.2% ↑`).

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
  <Chip
    size="small"
    label="+14.2%"
    sx={{
      height: 22,
      fontWeight: 800,
      fontSize: '0.7rem',
      bgcolor: 'rgba(46, 125, 50, 0.1)',
      color: 'success.main',
    }}
  />
  <Typography variant="caption" color="text.secondary">
    vs. mês anterior
  </Typography>
</Box>
```

---

## 🎯 10. Métricas & Business Intelligence (BI)

### Termômetro do Teto MEI (R$ 81.000,00)
- Barra de progresso com visualização clara das 3 faixas legais:
  - **Até 80% (R$ 64.800):** 🟢 Verde (`#2E7D32`) — Faixa segura e confortável.
  - **Entre 80% e 100% (R$ 64.800 a R$ 81.000):** 🟡 Âmbar (`#ED6C02`) — Alerta preventivo.
  - **Acima de 100% (Tolerância até R$ 97.200):** 🔴 Vermelho (`#D32F2F`) — Risco iminente de desenquadramento.

### Gráficos Recharts (Padrão Stripe)
- Curvas suaves com `type="monotone"`.
- Gradientes lineares verticais (cor viva no topo $\to$ opacidade zero na base).
- Tooltips flutuantes com fundo escuro e cantos arredondados de `10px`.

---

## 📋 11. Cheat Sheet de Propriedades MUI (`sx`)

| Elemento Visual | Propriedades `sx` Obrigatórias |
| :--- | :--- |
| **Card Executivo** | `p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)'` |
| **Toolbar de Filtros** | `p: 1.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', gap: 2, alignItems: 'center'` |
| **Tabela Container** | `borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden'` |
| **Cabeçalho de Coluna** | `py: 1.8, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary'` |
| **Valor Monetário** | `fontWeight: 700, fontFeatureSettings: '"tnum"', align="right"` |
| **Pill de Status Sucesso** | `height: 24, fontWeight: 700, fontSize: '0.72rem', bgcolor: 'rgba(46, 125, 50, 0.08)', color: 'success.main', border: '1px solid rgba(46, 125, 50, 0.2)'` |
| **Pill de Status Alerta** | `height: 24, fontWeight: 700, fontSize: '0.72rem', bgcolor: 'rgba(237, 108, 2, 0.08)', color: 'warning.main', border: '1px solid rgba(237, 108, 2, 0.2)'` |
| **Pill de Status Erro** | `height: 24, fontWeight: 700, fontSize: '0.72rem', bgcolor: 'rgba(211, 47, 47, 0.08)', color: 'error.main', border: '1px solid rgba(211, 47, 47, 0.2)'` |

