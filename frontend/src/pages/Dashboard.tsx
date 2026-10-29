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
  Chip,
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
  CheckCircle,
  ReportProblem,
  ReceiptLong,
  Payment,
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
import { DashboardMetrics, Produto } from '../types';
import { StatCard } from '../components/StatCard';
import { DashboardGreeting } from '../components/DashboardGreeting';
import { formatCurrency } from '../services/exportUtils';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, empresa } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [resMetrics, resProdutos] = await Promise.all([
        api.get<DashboardMetrics>('/dashboard'),
        api.get<Produto[]>('/produtos?apenas_ativos=true').catch(() => ({ data: [] as Produto[] })),
      ]);
      setMetrics(resMetrics.data);
      setProdutos(resProdutos.data);
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
      {/* Dashboard Inteligente: Saudação Personalizada & Insights Dinâmicos */}
      <DashboardGreeting
        user={user}
        empresa={empresa}
        metrics={metrics}
        produtos={produtos}
      />

      {/* Alertas do Controle DAS Mensal (Sprint 5) */}
      {/* 1. Alerta: DAS Venceu */}
      {Boolean(metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0) && (
        <Alert
          severity="error"
          icon={<ReportProblem />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/das')}
              sx={{ fontWeight: 700 }}
            >
              Regularizar DAS
            </Button>
          }
          sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
        >
          DAS Venceu: Você possui {metrics.das_qtd_atrasados} guia(s) DAS em atraso. Regularize para evitar multas de mora e suspensão de benefícios!
        </Alert>
      )}

      {/* 2. Alerta: DAS Vence em 7 dias */}
      {metrics.das_status_mes_atual === 'Pendente' &&
        metrics.das_dias_restantes !== undefined &&
        metrics.das_dias_restantes !== null &&
        metrics.das_dias_restantes >= 0 &&
        metrics.das_dias_restantes <= 7 && (
        <Alert
          severity="warning"
          icon={<CalendarMonth />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/das')}
              sx={{ fontWeight: 700 }}
            >
              Pagar DAS
            </Button>
          }
          sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
        >
          DAS Vence em {metrics.das_dias_restantes === 0 ? 'HOJE (dia 20)!' : `${metrics.das_dias_restantes} dias (${metrics.das_vencimento_mes_atual || 'dia 20'})`}: Valor de {formatCurrency(metrics.das_valor_mes_atual || 75.60)}.
        </Alert>
      )}

      {/* 3. Alerta: DAS Pago */}
      {metrics.das_status_mes_atual === 'Pago' && !metrics.das_qtd_atrasados && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/das')}
              sx={{ fontWeight: 700 }}
            >
              Ver Detalhes
            </Button>
          }
          sx={{ mb: 2.5, fontWeight: 600, borderRadius: 2 }}
        >
          DAS Pago: A guia deste mês ({metrics.das_vencimento_mes_atual}) já está quitada! Sua empresa está em dia com a Receita Federal.
        </Alert>
      )}

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

      {/* Indicadores do Controle DAS Mensal (Sprint 5) */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, borderLeft: '6px solid #1976D2' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLong color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Controle DAS Mensal — Situação Fiscal MEI
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/das')}
            endIcon={<ArrowForward />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Acessar Controle DAS
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Guia do Mês Atual
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                <Typography variant="h6" fontWeight={800}>
                  {formatCurrency(metrics.das_valor_mes_atual || 75.60)}
                </Typography>
                <Chip
                  size="small"
                  label={metrics.das_status_mes_atual || 'Pendente'}
                  color={
                    metrics.das_status_mes_atual === 'Pago'
                      ? 'success'
                      : metrics.das_status_mes_atual === 'Atrasado'
                      ? 'error'
                      : 'warning'
                  }
                  sx={{ fontWeight: 800 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Vencimento: {metrics.das_vencimento_mes_atual || 'Dia 20'}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(46, 125, 50, 0.08)' }}>
              <Typography variant="caption" color="success.dark" fontWeight={600}>
                DAS Pagos no Ano
              </Typography>
              <Typography variant="h6" fontWeight={800} color="success.dark" sx={{ my: 0.5 }}>
                {metrics.das_qtd_pagos || 0} guias
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Obrigações quitadas
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(237, 108, 2, 0.08)' }}>
              <Typography variant="caption" color="warning.dark" fontWeight={600}>
                DAS a Vencer (Pendentes)
              </Typography>
              <Typography variant="h6" fontWeight={800} color="warning.dark" sx={{ my: 0.5 }}>
                {metrics.das_qtd_pendentes || 0} guias
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aguardando vencimento
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(211, 47, 47, 0.08)' }}>
              <Typography variant="caption" color="error.dark" fontWeight={600}>
                DAS em Atraso
              </Typography>
              <Typography variant="h6" fontWeight={800} color="error.dark" sx={{ my: 0.5 }}>
                {metrics.das_qtd_atrasados || 0} guias
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0 ? 'Regularização urgente' : 'Nenhuma guia atrasada'}
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
