import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  Today,
  DateRange,
  CalendarMonth,
  EventNote,
  AccountBalanceWallet,
  ShoppingBag,
  TrendingUp,
  PointOfSale,
  ArrowForward,
  TrendingDown,
  Assessment,
  WarningAmber,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import api from '../services/api';
import { DashboardMetrics } from '../types';
import { StatCard } from '../components/StatCard';
import { formatCurrency } from '../services/exportUtils';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardMetrics>('/dashboard');
      setMetrics(res.data);
      setError(null);
    } catch (err: any) {
      setError('Não foi possível carregar os dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !metrics) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error || 'Erro ao carregar métricas.'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Top Welcome & Fast Action Bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            Visão Geral do Negócio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {empresa?.nome_fantasia} — Acompanhe vendas, caixa e lucratividade em tempo real.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PointOfSale />}
            onClick={() => navigate('/vendas')}
            fullWidth={false}
            sx={{ fontWeight: 700, px: 3, height: 44 }}
          >
            Nova Venda (PDV)
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Assessment />}
            onClick={() => navigate('/relatorio-mei')}
            sx={{ fontWeight: 700, height: 44 }}
          >
            Ver Limite MEI
          </Button>
        </Box>
      </Box>

      {/* Alerta de Estoque Crítico (Sprint 4) */}
      {Boolean(metrics.itens_estoque_baixo && metrics.itens_estoque_baixo > 0) && (
        <Alert
          severity="warning"
          icon={<WarningAmber />}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/estoque')} sx={{ fontWeight: 700 }}>
              Ver Estoque
            </Button>
          }
          sx={{ mb: 3, fontWeight: 600, borderRadius: 2 }}
        >
          Alerta de Reposição: Há {metrics.itens_estoque_baixo} item(ns) com estoque crítico abaixo do mínimo!
        </Alert>
      )}

      {/* Primary KPI Row 1: Vendas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Venda do Dia"
            value={formatCurrency(metrics.venda_dia)}
            subtitle="Hoje"
            icon={<Today />}
            color="#1976D2"
            onClick={() => navigate('/vendas')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Venda da Semana"
            value={formatCurrency(metrics.venda_semana)}
            subtitle="Últimos 7 dias"
            icon={<DateRange />}
            color="#0288D1"
            onClick={() => navigate('/vendas')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Venda do Mês"
            value={formatCurrency(metrics.venda_mes)}
            subtitle="Mês corrente"
            icon={<CalendarMonth />}
            color="#2E7D32"
            onClick={() => navigate('/vendas')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Venda do Ano"
            value={formatCurrency(metrics.venda_ano)}
            subtitle="Ano corrente"
            icon={<EventNote />}
            color="#7B1FA2"
            onClick={() => navigate('/relatorio-mei')}
          />
        </Grid>
      </Grid>

      {/* Primary KPI Row 2: Caixa, Quantidade, Ticket Médio e Lucro */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Caixa Físico Atual"
            value={formatCurrency(metrics.caixa_atual)}
            subtitle="Saldo em espécie no turno"
            icon={<AccountBalanceWallet />}
            color={metrics.caixa_atual > 0 ? '#2E7D32' : '#757575'}
            onClick={() => navigate('/caixa')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vendas Realizadas"
            value={String(metrics.qtd_vendas_mes)}
            subtitle="Pedidos no mês"
            icon={<ShoppingBag />}
            color="#ED6C02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ticket Médio"
            value={formatCurrency(metrics.ticket_medio_mes)}
            subtitle="Média por venda no mês"
            icon={<TrendingUp />}
            color="#00897B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Lucro Operacional"
            value={formatCurrency(metrics.lucro_operacional_mes)}
            subtitle="Entradas - Despesas (Mês)"
            icon={<TrendingUp />}
            color={metrics.lucro_operacional_mes >= 0 ? '#2E7D32' : '#D32F2F'}
            trend={metrics.lucro_operacional_mes >= 0 ? 'Positivo' : 'Negativo'}
            trendType={metrics.lucro_operacional_mes >= 0 ? 'positive' : 'negative'}
            onClick={() => navigate('/saude-negocio')}
          />
        </Grid>
      </Grid>

      {/* Row 3: Indicadores Operacionais do Mês (Entradas, Saídas, Sobra) */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Resultado Financeiro do Mês (Entradas x Saídas)
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9 }}>
                Total Entradas (Vendas)
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatCurrency(metrics.entradas_mes)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9 }}>
                Total Saídas (Despesas)
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatCurrency(metrics.saidas_mes)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: metrics.lucro_operacional_mes >= 0 ? 'primary.main' : 'warning.main',
                color: 'white',
              }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9 }}>
                Quanto Sobrou (Lucro Líquido)
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {formatCurrency(metrics.lucro_operacional_mes)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Row 4: Gráficos de Vendas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Vendas por Dia (últimos 14 dias) */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Vendas por Dia (Últimos 14 dias)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Ritmo diário de faturamento para acompanhar picos de movimento
              </Typography>

              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.vendas_por_dia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVendasDia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976D2" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#1976D2" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis
                      fontSize={12}
                      tickFormatter={(val) => `R$ ${val}`}
                      width={70}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Faturamento']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="#1976D2"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorVendasDia)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Vendas por Mês */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                Vendas por Mês (Ano Vigente)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Evolução mensal do faturamento
              </Typography>

              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.vendas_por_mes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis
                      fontSize={11}
                      tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      width={45}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Vendido']}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Bar dataKey="valor" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 5: Meios de Pagamento e Origens */}
      <Grid container spacing={3}>
        {/* Meios de Pagamento */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Meios de Pagamento (Mês)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Dinheiro, PIX, Débito e Crédito
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {metrics.pagamentos_breakdown.map((item) => (
                  <Box key={item.nome}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.nome} ({item.quantidade} vendas)
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(item.valor)} ({item.percentual}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentual}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'divider',
                        '& .MuiLinearProgress-bar': {
                          bgcolor:
                            item.nome === 'PIX'
                              ? '#00B4D8'
                              : item.nome === 'Dinheiro'
                              ? '#2E7D32'
                              : item.nome === 'Crédito'
                              ? '#9C27B0'
                              : '#ED6C02',
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Origens de Venda */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Canais de Venda / Origens (Mês)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Balcão, WhatsApp, Delivery Próprio, iFood, etc.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {metrics.origens_breakdown.map((item) => (
                  <Box key={item.nome}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.nome} ({item.quantidade} pedidos)
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(item.valor)} ({item.percentual}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentual}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'divider',
                        '& .MuiLinearProgress-bar': {
                          bgcolor:
                            item.nome === 'WhatsApp'
                              ? '#25D366'
                              : item.nome === 'iFood'
                              ? '#EA1D2C'
                              : item.nome === 'Balcão'
                              ? '#1976D2'
                              : '#FB8C00',
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
