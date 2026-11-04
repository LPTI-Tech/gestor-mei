# Catálogo de Componentes SaaS Executivos

Todos os componentes do Gestor MEI devem seguir rigorosamente estes padrões arquiteturais de apresentação visual.

---

## 1. Cards de Indicador / KPI (Business Intelligence)

### Estrutura Padrão:
- **Ícone em Bolha (Icon Bubble):** Fundo suave em tom pastel translúcido com ícone em cor viva.
- **Rótulo Superior:** Em maiúsculas discretas ou peso 600 em cor neutra atenuada.
- **Valor Principal:** Peso 800, tipografia tabular (números com largura fixa para evitar saltos visuais).
- **Badge de Tendência (Trend Delta):** Tag verde com seta para cima (`+14.5% vs mês anterior`) ou vermelha (`-3.2%`).

```tsx
<Card
  sx={{
    p: 2.5,
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    boxShadow: '0 2px 8px rgba(7, 25, 51, 0.05)',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 8px 24px rgba(7, 25, 51, 0.09)',
      transform: 'translateY(-2px)',
    },
  }}
>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      Faturamento Total
    </Typography>
    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', color: 'primary.main' }}>
      <PointOfSale fontSize="small" />
    </Box>
  </Box>
  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
    R$ 42.850,00
  </Typography>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Chip
      size="small"
      icon={<TrendingUp sx={{ fontSize: '14px !important' }} />}
      label="+12.4%"
      sx={{
        height: 22,
        fontWeight: 700,
        fontSize: '0.7rem',
        bgcolor: 'rgba(46, 125, 50, 0.1)',
        color: 'success.main',
        border: 'none',
      }}
    />
    <Typography variant="caption" color="text.secondary">
      vs. mês anterior
    </Typography>
  </Box>
</Card>
```

---

## 2. Tabelas Executivas (Modern Data Table)

### Regras de Ouro para Tabelas:
- **Cabeçalho:** Fundo sutil (`#F8FAFC` no modo claro), texto em caixa alta discreta (`fontSize: 0.75rem`, `fontWeight: 700`, `letterSpacing: 0.05em`).
- **Linhas (Rows):**
  - Altura confortável (`minHeight: 52px`).
  - Hover expressivo: mudança sutil de fundo para destacar a linha sob o cursor.
  - Alinhamento: Texto à esquerda, status centralizado, valores monetários **sempre alinhados à direita**.
- **Ações:** Botões de ação rápida com tooltip ou menu de 3 pontinhos (`MoreVert`) para não poluir visualmente a tabela.

---

## 3. Barra de Filtros e Busca (Toolbar Executiva)

Nunca colocar campos de busca jogados na tela. Integrar em um container elegante com sombra ou elevação mínima:

```tsx
<Paper
  elevation={0}
  sx={{
    p: 1.5,
    mb: 2.5,
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    gap: 2,
    alignItems: 'center',
    flexWrap: 'wrap',
    bgcolor: 'background.paper',
  }}
>
  <TextField
    size="small"
    placeholder="Buscar por cliente, pedido ou código..."
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <Search fontSize="small" sx={{ color: 'text.secondary' }} />
        </InputAdornment>
      ),
    }}
    sx={{ flexGrow: 1, minWidth: 260 }}
  />
  {/* Selects de filtros e botões de ação */}
</Paper>
```

---

## 4. Gráficos com Estilo BI (Recharts)

- Utilizar áreas com gradiente vertical (cor viva no topo $\to$ opacidade zero na base).
- Eixos X e Y sem linhas de grade pesadas (`stroke="#E2E8F0"`, `strokeDasharray="3 3"`).
- Tooltips flutuantes estilizados com fundo escuro elegante ou vidro branco (`backdropFilter: blur`).
- Curvas suaves com `type="monotone"`.
