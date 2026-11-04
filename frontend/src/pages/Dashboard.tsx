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
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ButtonGroup,
} from '@mui/material';
import {
  Today,
  DateRange,
  CalendarMonth,
  EventNote,
  AccountBalanceWallet,
  ShoppingBag,
  TrendingUp,
  ArrowForward,
  WarningAmber,
  CheckCircle,
  ReportProblem,
  ReceiptLong,
  Favorite,
  OpenInNew,
  ContentCopy,
  Inventory2,
  ShowChart,
  BarChart as BarChartIcon,
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
import { DashboardMetrics, Produto, SaudeNegocio } from '../types';
import { StatCard } from '../components/StatCard';
import { DashboardGreeting } from '../components/DashboardGreeting';
import { formatCurrency } from '../services/exportUtils';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, empresa, isAdmin, isConsultor } = useAuth();
  const isGestor = isAdmin || isConsultor;
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [saude, setSaude] = useState<SaudeNegocio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [resMetrics, resProdutos, resSaude] = await Promise.all([
        api.get<DashboardMetrics>('/dashboard'),
        api.get<Produto[]>('/produtos?apenas_ativos=true').catch(() => ({ data: [] as Produto[] })),
        api.get<SaudeNegocio>('/saude-negocio?dias=30').catch(() => ({ data: null })),
      ]);
      setMetrics(resMetrics.data);
      setProdutos(resProdutos.data);
      if (resSaude?.data) {
        setSaude(resSaude.data);
      }
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

  const handleCopyDasData = () => {
    const cnpj = empresa?.cnpj || 'Não informado';
    const razao = empresa?.nome_empresarial || empresa?.nome_fantasia || 'MEI';
    const mesAtual = metrics?.das_vencimento_mes_atual ? `Vencimento: ${metrics.das_vencimento_mes_atual}` : 'Vencimento: Dia 20';
    const valor = formatCurrency(metrics?.das_valor_mes_atual || 75.60);
    const status = metrics?.das_status_mes_atual || 'Pendente';

    const text = `DADOS PARA PAGAMENTO DO DAS MEI\n` +
      `Razão Social / Nome: ${razao}\n` +
      `CNPJ: ${cnpj}\n` +
      `Valor da Guia: ${valor}\n` +
      `${mesAtual}\n` +
      `Status: ${status}\n` +
      `Portal Oficial PGMEI: https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setSnackbarMsg('Dados do DAS copiados com sucesso para a área de transferência!');
  };

  const handleOpenPgmei = () => {
    window.open(
      'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao',
      '_blank',
      'noopener,noreferrer'
    );
  };

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

  const produtosCriticos = produtos.filter(
    (p) => (p.quantidade_estoque ?? 0) <= (p.estoque_minimo ?? 0)
  );

  return (
    <Box>
      {/* Dashboard Inteligente: Saudação Personalizada & Insights Dinâmicos */}
      <DashboardGreeting
        user={user}
        empresa={empresa}
        metrics={metrics}
        produtos={produtos}
      />

      {/* Alertas Executivos do Controle DAS Mensal (Design System SaaS) */}
      {/* 1. Alerta: DAS Venceu / Em atraso */}
      {isGestor && Boolean(metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0) && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(211, 47, 47, 0.25)',
            borderLeft: '5px solid #D32F2F',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(211, 47, 47, 0.03)',
            boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: 'rgba(211, 47, 47, 0.12)',
                color: '#D32F2F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ReportProblem sx={{ fontSize: '1.4rem' }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                  DAS em Atraso
                </Typography>
                <Chip
                  label={`${metrics.das_qtd_atrasados} guia${metrics.das_qtd_atrasados > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    borderRadius: 1.5,
                    bgcolor: 'rgba(211, 47, 47, 0.12)',
                    color: '#D32F2F',
                    border: '1px solid rgba(211, 47, 47, 0.3)',
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, lineHeight: 1.45 }}>
                Regularize suas guias em aberto para evitar multas de mora e preservar benefícios previdenciários do MEI.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => navigate('/das')}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
              }}
            >
              Regularizar DAS
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleOpenPgmei}
              startIcon={<OpenInNew />}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: 'background.paper',
                borderColor: 'rgba(7, 25, 51, 0.15)',
                color: 'text.primary',
              }}
            >
              Abrir PGMEI
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyDasData}
              startIcon={<ContentCopy />}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: 'background.paper',
                borderColor: 'rgba(7, 25, 51, 0.15)',
                color: 'text.primary',
              }}
            >
              Copiar Dados
            </Button>
          </Box>
        </Paper>
      )}

      {/* 2. Alerta: DAS Vence em breve (até 7 dias) */}
      {metrics.das_status_mes_atual === 'Pendente' &&
        metrics.das_dias_restantes !== undefined &&
        metrics.das_dias_restantes !== null &&
        metrics.das_dias_restantes >= 0 &&
        metrics.das_dias_restantes <= 7 && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(237, 108, 2, 0.25)',
            borderLeft: '5px solid #ED6C02',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.08)' : 'rgba(237, 108, 2, 0.03)',
            boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: 'rgba(237, 108, 2, 0.12)',
                color: '#ED6C02',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarMonth sx={{ fontSize: '1.4rem' }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                  Lembrete Fiscal: O DAS vence {metrics.das_dias_restantes === 0 ? 'HOJE!' : `em ${metrics.das_dias_restantes} dia(s)`}
                </Typography>
                <Chip
                  label={metrics.das_dias_restantes === 0 ? 'Vence Hoje' : `${metrics.das_dias_restantes} dias`}
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    borderRadius: 1.5,
                    bgcolor: 'rgba(237, 108, 2, 0.12)',
                    color: '#ED6C02',
                    border: '1px solid rgba(237, 108, 2, 0.3)',
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, lineHeight: 1.45 }}>
                Vencimento: {metrics.das_vencimento_mes_atual || 'dia 20'} • Valor: {formatCurrency(metrics.das_valor_mes_atual || 75.60)}. Mantenha sua empresa 100% regularizada!
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/das')}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: '#ED6C02',
                '&:hover': { bgcolor: '#E65100' },
                boxShadow: '0 4px 12px rgba(237, 108, 2, 0.3)',
              }}
            >
              Ver Guia
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleOpenPgmei}
              startIcon={<OpenInNew />}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: 'background.paper',
                borderColor: 'rgba(7, 25, 51, 0.15)',
                color: 'text.primary',
              }}
            >
              Abrir PGMEI
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyDasData}
              startIcon={<ContentCopy />}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: 'background.paper',
                borderColor: 'rgba(7, 25, 51, 0.15)',
                color: 'text.primary',
              }}
            >
              Copiar Dados
            </Button>
          </Box>
        </Paper>
      )}

      {/* 3. Alerta: DAS Pago */}
      {metrics.das_status_mes_atual === 'Pago' && !metrics.das_qtd_atrasados && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(46, 125, 50, 0.25)',
            borderLeft: '5px solid #2E7D32',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(46, 125, 50, 0.03)',
            boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: 'rgba(46, 125, 50, 0.12)',
                color: '#2E7D32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle sx={{ fontSize: '1.4rem' }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                  Tudo Certo! DAS Quitado
                </Typography>
                <Chip
                  label="100% Em Dia"
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    borderRadius: 1.5,
                    bgcolor: 'rgba(46, 125, 50, 0.12)',
                    color: '#2E7D32',
                    border: '1px solid rgba(46, 125, 50, 0.3)',
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, lineHeight: 1.45 }}>
                A guia deste mês ({metrics.das_vencimento_mes_atual || 'competência atual'}) já está paga. Parabéns por manter seu negócio pontual e seguro!
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="outlined"
              color="success"
              size="small"
              onClick={() => navigate('/das')}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: 'background.paper',
              }}
            >
              Ver Histórico
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleOpenPgmei}
              startIcon={<OpenInNew />}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: 'background.paper',
                borderColor: 'rgba(7, 25, 51, 0.15)',
                color: 'text.primary',
              }}
            >
              Portal PGMEI
            </Button>
          </Box>
        </Paper>
      )}

      {/* Alerta de Estoque Crítico */}
      {Boolean(metrics.itens_estoque_baixo && metrics.itens_estoque_baixo > 0) && (
        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(237, 108, 2, 0.25)',
            borderLeft: '5px solid #ED6C02',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.08)' : 'rgba(237, 108, 2, 0.03)',
            boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: 'rgba(237, 108, 2, 0.12)',
                color: '#ED6C02',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <WarningAmber sx={{ fontSize: '1.35rem' }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Alerta de Reposição: Há {metrics.itens_estoque_baixo} item(ns) com estoque crítico abaixo do mínimo!
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Evite ruptura de estoque repondo produtos com antecedência.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate('/estoque')}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: '#ED6C02',
              '&:hover': { bgcolor: '#E65100' },
              flexShrink: 0,
            }}
          >
            Ver Estoque
          </Button>
        </Paper>
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
          {isGestor ? (
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
          ) : (
            <StatCard
              title="Estoque em Alerta"
              value={(metrics.itens_estoque_baixo ?? 0).toString()}
              subtitle="Produtos abaixo do mínimo"
              icon={<Inventory2 />}
              color={metrics.itens_estoque_baixo && metrics.itens_estoque_baixo > 0 ? '#ED6C02' : '#2E7D32'}
              onClick={() => navigate('/estoque')}
            />
          )}
        </Grid>
      </Grid>

      {/* Row 3: Indicadores Financeiros do Mês (Oculto para OPERATOR) */}
      {isGestor && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              mb: 2.5,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: 'rgba(25, 118, 210, 0.1)',
                    color: '#1976D2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp sx={{ fontSize: '1.2rem' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.01em', color: 'text.primary' }}>
                  Resultado Financeiro do Mês (Entradas x Saídas)
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.3, ml: { sm: 5 } }}>
                Apuração detalhada entre fluxo de vendas, despesas operacionais e resultado líquido
              </Typography>
            </Box>
            <Chip
              label="BI Financeiro"
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5, alignSelf: { xs: 'flex-start', sm: 'center' } }}
            />
          </Box>

          <Grid container spacing={2.5}>
            {/* Total Entradas */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid rgba(46, 125, 50, 0.2)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.06)' : 'rgba(46, 125, 50, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px -4px rgba(46, 125, 50, 0.12)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#2E7D32',
                    }}
                  >
                    Total Entradas (Vendas)
                  </Typography>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'rgba(46, 125, 50, 0.12)',
                      color: '#2E7D32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp sx={{ fontSize: '1.2rem' }} />
                  </Box>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.45rem', sm: '1.65rem' },
                    color: '#1B5E20',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    mb: 0.8,
                  }}
                >
                  {formatCurrency(metrics.entradas_mes)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
                  Faturamento bruto recebido no mês
                </Typography>
              </Box>
            </Grid>

            {/* Total Saídas */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid rgba(211, 47, 47, 0.2)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.06)' : 'rgba(211, 47, 47, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px -4px rgba(211, 47, 47, 0.12)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#D32F2F',
                    }}
                  >
                    Total Saídas (Despesas)
                  </Typography>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'rgba(211, 47, 47, 0.12)',
                      color: '#D32F2F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AccountBalanceWallet sx={{ fontSize: '1.2rem' }} />
                  </Box>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.45rem', sm: '1.65rem' },
                    color: '#B71C1C',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    mb: 0.8,
                  }}
                >
                  {formatCurrency(metrics.saidas_mes)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
                  Custos e compras operacionais
                </Typography>
              </Box>
            </Grid>

            {/* Quanto Sobrou */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor:
                    metrics.lucro_operacional_mes >= 0
                      ? 'rgba(25, 118, 210, 0.25)'
                      : 'rgba(237, 108, 2, 0.25)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? metrics.lucro_operacional_mes >= 0
                        ? 'rgba(25, 118, 210, 0.08)'
                        : 'rgba(237, 108, 2, 0.08)'
                      : metrics.lucro_operacional_mes >= 0
                      ? 'rgba(25, 118, 210, 0.03)'
                      : 'rgba(237, 108, 2, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow:
                      metrics.lucro_operacional_mes >= 0
                        ? '0 8px 20px -4px rgba(25, 118, 210, 0.15)'
                        : '0 8px 20px -4px rgba(237, 108, 2, 0.15)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: metrics.lucro_operacional_mes >= 0 ? '#1976D2' : '#ED6C02',
                    }}
                  >
                    Quanto Sobrou (Lucro Líquido)
                  </Typography>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor:
                        metrics.lucro_operacional_mes >= 0
                          ? 'rgba(25, 118, 210, 0.12)'
                          : 'rgba(237, 108, 2, 0.12)',
                      color: metrics.lucro_operacional_mes >= 0 ? '#1976D2' : '#ED6C02',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp sx={{ fontSize: '1.2rem' }} />
                  </Box>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.45rem', sm: '1.65rem' },
                    color: metrics.lucro_operacional_mes >= 0 ? '#0D47A1' : '#E65100',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    mb: 0.8,
                  }}
                >
                  {formatCurrency(metrics.lucro_operacional_mes)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
                  Margem líquida após dedução dos custos
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Card Controle DAS Mensal (Oculto para OPERATOR) */}
      {isGestor && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
            borderLeft: '5px solid #1976D2',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              mb: 2.5,
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                  color: '#1976D2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ReceiptLong sx={{ fontSize: '1.35rem' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.01em', color: 'text.primary' }}>
                  Controle DAS Mensal — Situação Fiscal MEI
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Acompanhamento oficial de guias tributárias PGMEI
                </Typography>
              </Box>
            </Box>
            {/* Ações Rápidas: Abrir PGMEI, Ver Guia, Copiar Dados */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleOpenPgmei}
                startIcon={<OpenInNew />}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  bgcolor: 'background.paper',
                  borderColor: 'rgba(7, 25, 51, 0.15)',
                  color: 'text.primary',
                }}
              >
                Abrir PGMEI
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCopyDasData}
                startIcon={<ContentCopy />}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  bgcolor: 'background.paper',
                  borderColor: 'rgba(7, 25, 51, 0.15)',
                  color: 'text.primary',
                }}
              >
                Copiar Dados
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate('/das')}
                endIcon={<ArrowForward />}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                }}
              >
                Acessar Controle DAS
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {/* Guia do Mês Atual */}
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(7, 25, 51, 0.02)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                  }}
                >
                  Guia do Mês Atual
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.8 }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}
                  >
                    {formatCurrency(metrics.das_valor_mes_atual || 75.60)}
                  </Typography>
                  <Chip
                    size="small"
                    label={metrics.das_status_mes_atual || 'Pendente'}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      height: 22,
                      borderRadius: 1.5,
                      bgcolor:
                        metrics.das_status_mes_atual === 'Pago'
                          ? 'rgba(46, 125, 50, 0.12)'
                          : metrics.das_status_mes_atual === 'Atrasado'
                          ? 'rgba(211, 47, 47, 0.12)'
                          : 'rgba(237, 108, 2, 0.12)',
                      color:
                        metrics.das_status_mes_atual === 'Pago'
                          ? '#2E7D32'
                          : metrics.das_status_mes_atual === 'Atrasado'
                          ? '#D32F2F'
                          : '#ED6C02',
                      border: '1px solid',
                      borderColor:
                        metrics.das_status_mes_atual === 'Pago'
                          ? 'rgba(46, 125, 50, 0.3)'
                          : metrics.das_status_mes_atual === 'Atrasado'
                          ? 'rgba(211, 47, 47, 0.3)'
                          : 'rgba(237, 108, 2, 0.3)',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
                  Vencimento: {metrics.das_vencimento_mes_atual || 'Dia 20'}
                </Typography>
              </Box>
            </Grid>

            {/* DAS Pagos no Ano */}
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid rgba(46, 125, 50, 0.2)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.06)' : 'rgba(46, 125, 50, 0.03)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#2E7D32',
                  }}
                >
                  DAS Pagos no Ano
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: '#1B5E20',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.02em',
                    my: 0.8,
                  }}
                >
                  {metrics.das_qtd_pagos || 0} guias
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
                  Obrigações quitadas
                </Typography>
              </Box>
            </Grid>

            {/* DAS a Vencer */}
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid rgba(237, 108, 2, 0.2)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.06)' : 'rgba(237, 108, 2, 0.03)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#ED6C02',
                  }}
                >
                  DAS a Vencer (Pendentes)
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: '#E65100',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.02em',
                    my: 0.8,
                  }}
                >
                  {metrics.das_qtd_pendentes || 0} guias
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
                  Aguardando vencimento
                </Typography>
              </Box>
            </Grid>

            {/* DAS em Atraso */}
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: metrics.das_qtd_atrasados
                    ? 'rgba(211, 47, 47, 0.3)'
                    : (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
                  bgcolor: (theme) =>
                    metrics.das_qtd_atrasados
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(211, 47, 47, 0.08)'
                        : 'rgba(211, 47, 47, 0.03)'
                      : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.02)'
                      : 'rgba(7, 25, 51, 0.02)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: metrics.das_qtd_atrasados ? '#D32F2F' : 'text.secondary',
                  }}
                >
                  DAS em Atraso
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: metrics.das_qtd_atrasados ? '#B71C1C' : 'text.primary',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.02em',
                    my: 0.8,
                  }}
                >
                  {metrics.das_qtd_atrasados || 0} guias
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
                  {metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0
                    ? 'Regularização urgente'
                    : 'Nenhuma guia atrasada'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Grid: Saúde do Negócio + Produtos com Estoque Crítico (Sprint 5.1 UX/UI) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Card 1: Saúde do Negócio (Oculto para OPERATOR) */}
        {isGestor && (
          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
                bgcolor: 'background.paper',
                boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
              }}
            >
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor:
                          saude?.score_saude && saude.score_saude >= 70
                            ? 'rgba(46, 125, 50, 0.12)'
                            : 'rgba(237, 108, 2, 0.12)',
                        color:
                          saude?.score_saude && saude.score_saude >= 70 ? '#2E7D32' : '#ED6C02',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Favorite sx={{ fontSize: '1.25rem' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                      Saúde do Negócio
                    </Typography>
                  </Box>
                  {saude && (
                    <Chip
                      size="small"
                      label={
                        saude.classificacao_saude === 'EXCELENTE'
                          ? 'Excelente'
                          : saude.classificacao_saude === 'SAUDAVEL'
                          ? 'Saudável'
                          : saude.classificacao_saude === 'ATENCAO'
                          ? 'Atenção'
                          : 'Crítico'
                      }
                      sx={{
                        height: 22,
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        borderRadius: 1.5,
                        bgcolor:
                          saude.classificacao_saude === 'EXCELENTE' || saude.classificacao_saude === 'SAUDAVEL'
                            ? 'rgba(46, 125, 50, 0.12)'
                            : saude.classificacao_saude === 'ATENCAO'
                            ? 'rgba(237, 108, 2, 0.12)'
                            : 'rgba(211, 47, 47, 0.12)',
                        color:
                          saude.classificacao_saude === 'EXCELENTE' || saude.classificacao_saude === 'SAUDAVEL'
                            ? '#2E7D32'
                            : saude.classificacao_saude === 'ATENCAO'
                            ? '#ED6C02'
                            : '#D32F2F',
                        border: '1px solid',
                        borderColor:
                          saude.classificacao_saude === 'EXCELENTE' || saude.classificacao_saude === 'SAUDAVEL'
                            ? 'rgba(46, 125, 50, 0.3)'
                            : saude.classificacao_saude === 'ATENCAO'
                            ? 'rgba(237, 108, 2, 0.3)'
                            : 'rgba(211, 47, 47, 0.3)',
                      }}
                    />
                  )}
                </Box>

                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Diagnóstico de rentabilidade e desempenho dos últimos 30 dias
                </Typography>

                {saude ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(7, 25, 51, 0.02)', border: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 25, 51, 0.06)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem' }}>
                          Score de Vitalidade Financeira
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            fontFeatureSettings: '"tnum"',
                            color:
                              saude.score_saude >= 70
                                ? '#2E7D32'
                                : saude.score_saude >= 50
                                ? '#ED6C02'
                                : '#D32F2F',
                          }}
                        >
                          {saude.score_saude}/100
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={saude.score_saude}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.08)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor:
                              saude.score_saude >= 70
                                ? '#2E7D32'
                                : saude.score_saude >= 50
                                ? '#ED6C02'
                                : '#D32F2F',
                            borderRadius: 5,
                          },
                        }}
                      />
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: (theme) =>
                              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 25, 51, 0.06)',
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(7, 25, 51, 0.02)',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'text.secondary',
                            }}
                          >
                            Margem de Lucro
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 800,
                              mt: 0.5,
                              fontFeatureSettings: '"tnum"',
                              color: saude.margem_lucro_percentual >= 15 ? '#1B5E20' : '#E65100',
                            }}
                          >
                            {saude.margem_lucro_percentual.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: (theme) =>
                              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 25, 51, 0.06)',
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(7, 25, 51, 0.02)',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'text.secondary',
                            }}
                          >
                            Resultado Líquido
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 800,
                              mt: 0.5,
                              fontFeatureSettings: '"tnum"',
                              color: saude.resultado_operacional >= 0 ? '#1B5E20' : '#B71C1C',
                            }}
                          >
                            {formatCurrency(saude.resultado_operacional)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {saude.insights && saude.insights.length > 0 && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)',
                          border: '1px solid rgba(25, 118, 210, 0.2)',
                          borderLeft: '4px solid #1976D2',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#1976D2' }}>
                          💡 {saude.insights[0].titulo}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.45 }}>
                          {saude.insights[0].descricao}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mt: 'auto', pt: 1 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="small"
                        onClick={() => navigate('/saude-negocio')}
                        endIcon={<ArrowForward />}
                        sx={{
                          fontWeight: 700,
                          borderRadius: 2,
                          textTransform: 'none',
                          borderColor: 'rgba(7, 25, 51, 0.15)',
                          color: 'text.primary',
                          bgcolor: 'background.paper',
                        }}
                      >
                        Ver Diagnóstico Detalhado
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Carregando indicadores de saúde do negócio...
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Card 2: Produtos com Estoque Crítico (Ocupa largura total para OPERATOR) */}
        <Grid item xs={12} md={isGestor ? 6 : 12}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            }}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor:
                        produtosCriticos.length > 0 ? 'rgba(237, 108, 2, 0.12)' : 'rgba(46, 125, 50, 0.12)',
                      color: produtosCriticos.length > 0 ? '#ED6C02' : '#2E7D32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Inventory2 sx={{ fontSize: '1.25rem' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                    Produtos em Estoque Crítico
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${produtosCriticos.length} ${produtosCriticos.length === 1 ? 'item' : 'itens'}`}
                  sx={{
                    height: 22,
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    borderRadius: 1.5,
                    bgcolor: produtosCriticos.length > 0 ? 'rgba(237, 108, 2, 0.12)' : 'rgba(46, 125, 50, 0.12)',
                    color: produtosCriticos.length > 0 ? '#ED6C02' : '#2E7D32',
                    border: '1px solid',
                    borderColor:
                      produtosCriticos.length > 0 ? 'rgba(237, 108, 2, 0.3)' : 'rgba(46, 125, 50, 0.3)',
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                Itens com saldo igual ou inferior ao estoque mínimo recomendado
              </Typography>

              {produtosCriticos.length > 0 ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <TableContainer
                    sx={{
                      maxHeight: 220,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 25, 51, 0.06)',
                    }}
                  >
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'text.secondary',
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                            }}
                          >
                            Produto
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'text.secondary',
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                            }}
                          >
                            Estoque Atual
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'text.secondary',
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                            }}
                          >
                            Estoque Mín.
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'text.secondary',
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                            }}
                          >
                            Ação
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {produtosCriticos.slice(0, 4).map((p) => (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              {p.nome}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={`${p.quantidade_estoque ?? 0} un`}
                                sx={{
                                  fontWeight: 800,
                                  height: 22,
                                  fontSize: '0.7rem',
                                  borderRadius: 1.5,
                                  bgcolor:
                                    (p.quantidade_estoque ?? 0) <= 0
                                      ? 'rgba(211, 47, 47, 0.12)'
                                      : 'rgba(237, 108, 2, 0.12)',
                                  color:
                                    (p.quantidade_estoque ?? 0) <= 0 ? '#D32F2F' : '#ED6C02',
                                  border: '1px solid',
                                  borderColor:
                                    (p.quantidade_estoque ?? 0) <= 0
                                      ? 'rgba(211, 47, 47, 0.3)'
                                      : 'rgba(237, 108, 2, 0.3)',
                                }}
                              />
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{ fontSize: '0.8rem', color: 'text.secondary', fontFeatureSettings: '"tnum"' }}
                            >
                              {p.estoque_minimo ?? 0} un
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => navigate('/estoque')}
                                sx={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  py: 0.3,
                                  px: 1.2,
                                  borderRadius: 1.5,
                                  minWidth: 'auto',
                                  textTransform: 'none',
                                }}
                              >
                                Repor
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {produtosCriticos.length > 4 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1.2, textAlign: 'center', display: 'block' }}>
                      + {produtosCriticos.length - 4} outro(s) produto(s) com atenção necessária.
                    </Typography>
                  )}

                  <Box sx={{ mt: 'auto', pt: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => navigate('/estoque')}
                      endIcon={<ArrowForward />}
                      sx={{
                        fontWeight: 700,
                        borderRadius: 2,
                        textTransform: 'none',
                        borderColor: 'rgba(7, 25, 51, 0.15)',
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                      }}
                    >
                      Gerenciar Todo o Estoque
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center', my: 'auto' }}>
                  <CheckCircle sx={{ fontSize: 44, color: '#2E7D32', mb: 1, opacity: 0.9 }} />
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Estoque 100% equilibrado!
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Nenhum produto cadastrado está abaixo da margem de reposição.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 4: Gráficos de Vendas (Stripe UI System) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Vendas por Dia (últimos 14 dias) */}
        <Grid item xs={12} md={7}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 3,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'rgba(25, 118, 210, 0.12)',
                      color: '#1976D2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShowChart sx={{ fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                      Vendas por Dia (Últimos 14 dias)
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Ritmo diário de faturamento para acompanhamento de picos operacionais
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label="Tempo Real"
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5 }}
                />
              </Box>

              <Box sx={{ width: '100%', height: 260, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.vendas_por_dia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVendasDia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1976D2" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#1976D2" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} opacity={0.6} />
                    <XAxis
                      dataKey="label"
                      fontSize={11}
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      fontSize={11}
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$ ${val}`}
                      width={65}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Faturamento']}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{
                        backgroundColor: '#071933',
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 10px 25px -5px rgba(7, 25, 51, 0.3)',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                      }}
                      itemStyle={{ color: '#90CAF9', fontWeight: 700, fontFeatureSettings: '"tnum"' }}
                      labelStyle={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="#1976D2"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorVendasDia)"
                      activeDot={{ r: 6, fill: '#1976D2', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Vendas por Mês */}
        <Grid item xs={12} md={5}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 3,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: 'rgba(46, 125, 50, 0.12)',
                      color: '#2E7D32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BarChartIcon sx={{ fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                      Vendas por Mês (Ano Vigente)
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Evolução mensal do faturamento acumulado
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label="Consolidado"
                  size="small"
                  variant="outlined"
                  color="success"
                  sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5 }}
                />
              </Box>

              <Box sx={{ width: '100%', height: 260, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.vendas_por_mes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} opacity={0.6} />
                    <XAxis
                      dataKey="label"
                      fontSize={11}
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      fontSize={11}
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      width={45}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Vendido']}
                      labelFormatter={(label) => `Mês: ${label}`}
                      contentStyle={{
                        backgroundColor: '#071933',
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 10px 25px -5px rgba(7, 25, 51, 0.3)',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                      }}
                      itemStyle={{ color: '#A5D6A7', fontWeight: 700, fontFeatureSettings: '"tnum"' }}
                      labelStyle={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}
                    />
                    <Bar dataKey="valor" fill="#2E7D32" radius={[6, 6, 0, 0]} />
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
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 3,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(2, 136, 209, 0.12)',
                    color: '#0288D1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AccountBalanceWallet sx={{ fontSize: '1.25rem' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                    Meios de Pagamento (Mês)
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Dinheiro, PIX, Débito e Cartão de Crédito
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2.5 }}>
                {metrics.pagamentos_breakdown.map((item) => (
                  <Box key={item.nome}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {item.nome}{' '}
                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          ({item.quantidade} vendas)
                        </Typography>
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontFeatureSettings: '"tnum"' }}>
                        {formatCurrency(item.valor)}{' '}
                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          ({item.percentual}%)
                        </Typography>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentual}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
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
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 3,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(237, 108, 2, 0.12)',
                    color: '#ED6C02',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShoppingBag sx={{ fontSize: '1.25rem' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                    Canais de Venda / Origens (Mês)
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Balcão, WhatsApp, Delivery Próprio, iFood, etc.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2.5 }}>
                {metrics.origens_breakdown.map((item) => (
                  <Box key={item.nome}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {item.nome}{' '}
                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          ({item.quantidade} pedidos)
                        </Typography>
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontFeatureSettings: '"tnum"' }}>
                        {formatCurrency(item.valor)}{' '}
                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          ({item.percentual}%)
                        </Typography>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentual}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
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

      {/* Snackbar para Copiar Dados do DAS */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
