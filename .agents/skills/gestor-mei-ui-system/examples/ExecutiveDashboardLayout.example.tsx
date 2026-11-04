import React from 'react';
import { Box, Typography, Button, Grid, Paper, TextField, InputAdornment } from '@mui/material';
import { Add, FileDownload, Search, TrendingUp, AttachMoney, ShoppingCart } from '@mui/icons-material';
import { StatCardExecutive } from './StatCardExecutive.example';

export const ExecutiveDashboardLayoutExample: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* 1. Header Executivo de Página (Padrão Shopify / Stripe) */}
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
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            Controle Financeiro & Vendas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o faturamento em tempo real, limite anual do MEI e desempenho do caixa.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Exportar Relatório
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            }}
          >
            Nova Venda (PDV)
          </Button>
        </Box>
      </Box>

      {/* 2. Grid de Cards de BI / KPIs Executivos */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCardExecutive
            title="Faturamento Mensal"
            value="R$ 6.450,00"
            icon={<AttachMoney fontSize="small" />}
            iconColor="#2E7D32"
            iconBgColor="rgba(46, 125, 50, 0.08)"
            trend={{ value: '+14.2%', isPositive: true, periodText: 'vs. mês anterior' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCardExecutive
            title="Total de Vendas"
            value="182 pedidos"
            icon={<ShoppingCart fontSize="small" />}
            iconColor="#1976D2"
            iconBgColor="rgba(25, 118, 210, 0.08)"
            trend={{ value: '+8.1%', isPositive: true, periodText: 'neste período' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCardExecutive
            title="Teto Anual MEI"
            value="R$ 48.200,00"
            subtitle="59.5% do teto anual de R$ 81.000,00"
            icon={<TrendingUp fontSize="small" />}
            iconColor="#ED6C02"
            iconBgColor="rgba(237, 108, 2, 0.08)"
          />
        </Grid>
      </Grid>

      {/* 3. Toolbar de Filtros Modernos */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Buscar vendas, clientes ou produtos..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 300 } }}
        />
      </Paper>

      {/* 4. Área de Trabalho Principal (Tabela ou Painel) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Últimas Movimentações Homologadas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Apresentação limpa, alinhada e pronta para exibição comercial.
        </Typography>
      </Paper>
    </Box>
  );
};

