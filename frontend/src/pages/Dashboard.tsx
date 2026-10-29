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
  const { user, empresa } = useAuth();
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

      {/* Alertas Aprimorados do Controle DAS Mensal (Sprint 5.1 UX/UI) */}
      {/* 1. Alerta: DAS Venceu / Em atraso */}
      {Boolean(metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0) && (
        <Alert
          severity="error"
          icon={<ReportProblem />}
          sx={{ mb: 2.5, fontWeight: 500, borderRadius: 2 }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5, width: '100%' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                DAS em Atraso ({metrics.das_qtd_atrasados} guia{metrics.das_qtd_atrasados > 1 ? 's' : ''})
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.2 }}>
                Regularize suas guias em aberto para evitar multas de mora e preservar benefícios como aposentadoria e auxílio-doença.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: { xs: 1, md: 0 } }}>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => navigate('/das')}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                Regularizar DAS
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleOpenPgmei}
                startIcon={<OpenInNew />}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Abrir PGMEI
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleCopyDasData}
                startIcon={<ContentCopy />}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Copiar Dados
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      {/* 2. Alerta: DAS Vence em breve (até 7 dias) */}
      {metrics.das_status_mes_atual === 'Pendente' &&
        metrics.das_dias_restantes !== undefined &&
        metrics.das_dias_restantes !== null &&
        metrics.das_dias_restantes >= 0 &&
        metrics.das_dias_restantes <= 7 && (
        <Alert
          severity="warning"
          icon={<CalendarMonth />}
          sx={{ mb: 2.5, fontWeight: 500, borderRadius: 2 }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5, width: '100%' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                Lembrete Amigo: O DAS deste mês vence {metrics.das_dias_restantes === 0 ? 'HOJE!' : `em ${metrics.das_dias_restantes} dia(s)`}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.2 }}>
                Vencimento: {metrics.das_vencimento_mes_atual || 'dia 20'} • Valor: {formatCurrency(metrics.das_valor_mes_atual || 75.60)}. O pagamento pontual mantém sua empresa 100% legalizada!
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: { xs: 1, md: 0 } }}>
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={() => navigate('/das')}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                Ver Guia
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleOpenPgmei}
                startIcon={<OpenInNew />}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Abrir PGMEI
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleCopyDasData}
                startIcon={<ContentCopy />}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Copiar Dados
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      {/* 3. Alerta: DAS Pago */}
      {metrics.das_status_mes_atual === 'Pago' && !metrics.das_qtd_atrasados && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 2.5, fontWeight: 500, borderRadius: 2 }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5, width: '100%' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800}>
                Tudo Certo! DAS Quitado
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.2 }}>
                A guia deste mês ({metrics.das_vencimento_mes_atual || 'competência atual'}) já está paga. Parabéns por manter seu negócio pontual e seguro!
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1, md: 0 } }}>
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={() => navigate('/das')}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                Ver Histórico
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleOpenPgmei}
                startIcon={<OpenInNew />}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Portal PGMEI
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      {/* Alerta de Estoque Crítico */}
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

      {/* Card Controle DAS Mensal (Sprint 5) com Ações Rápidas (Sprint 5.1 UX/UI) */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, borderLeft: '6px solid #1976D2' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLong color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Controle DAS Mensal — Situação Fiscal MEI
            </Typography>
          </Box>
          {/* Ações Rápidas: Abrir PGMEI, Ver Guia, Copiar Dados */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={handleOpenPgmei}
              startIcon={<OpenInNew />}
              sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
            >
              Abrir PGMEI
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleCopyDasData}
              startIcon={<ContentCopy />}
              sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
            >
              Copiar Dados
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => navigate('/das')}
              endIcon={<ArrowForward />}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
            >
              Acessar Controle DAS
            </Button>
          </Box>
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

      {/* Grid: Saúde do Negócio + Produtos com Estoque Crítico (Sprint 5.1 UX/UI) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Card 1: Saúde do Negócio */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Favorite sx={{ color: saude?.score_saude && saude.score_saude >= 70 ? '#2E7D32' : '#ED6C02' }} />
                  <Typography variant="h6" fontWeight={700}>
                    Saúde do Negócio
                  </Typography>
                </Box>
                {saude && (
                  <Chip
                    size="small"
                    label={
                      saude.classificacao_saude === 'EXCELENTE' ? 'Excelente' :
                      saude.classificacao_saude === 'SAUDAVEL' ? 'Saudável' :
                      saude.classificacao_saude === 'ATENCAO' ? 'Atenção' : 'Crítico'
                    }
                    color={
                      saude.classificacao_saude === 'EXCELENTE' || saude.classificacao_saude === 'SAUDAVEL'
                        ? 'success'
                        : saude.classificacao_saude === 'ATENCAO'
                        ? 'warning'
                        : 'error'
                    }
                    sx={{ fontWeight: 800 }}
                  />
                )}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                Diagnóstico de rentabilidade e desempenho dos últimos 30 dias.
              </Typography>

              {saude ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        Score de Vitalidade Financeira
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        sx={{
                          color: saude.score_saude >= 70 ? '#2E7D32' : saude.score_saude >= 50 ? '#ED6C02' : '#D32F2F',
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
                        bgcolor: 'divider',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: saude.score_saude >= 70 ? '#2E7D32' : saude.score_saude >= 50 ? '#ED6C02' : '#D32F2F',
                        },
                      }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Margem de Lucro
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color={saude.margem_lucro_percentual >= 15 ? 'success.main' : 'warning.main'}>
                          {saude.margem_lucro_percentual.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Resultado Líquido
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color={saude.resultado_operacional >= 0 ? 'success.main' : 'error.main'}>
                          {formatCurrency(saude.resultado_operacional)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {saude.insights && saude.insights.length > 0 && (
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.06)', borderLeft: '4px solid #1976D2' }}>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        💡 {saude.insights[0].titulo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
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
                      sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
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

        {/* Card 2: Produtos com Estoque Crítico */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory2 color={produtosCriticos.length > 0 ? 'warning' : 'success'} />
                  <Typography variant="h6" fontWeight={700}>
                    Produtos em Estoque Crítico
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${produtosCriticos.length} ${produtosCriticos.length === 1 ? 'item' : 'itens'}`}
                  color={produtosCriticos.length > 0 ? 'warning' : 'success'}
                  sx={{ fontWeight: 800 }}
                />
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                Itens com saldo igual ou inferior ao estoque mínimo recomendado.
              </Typography>

              {produtosCriticos.length > 0 ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <TableContainer sx={{ maxHeight: 220 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Produto</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Estoque Atual</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Estoque Mín.</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Ação</TableCell>
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
                                color={(p.quantidade_estoque ?? 0) <= 0 ? 'error' : 'warning'}
                                sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              {p.estoque_minimo ?? 0} un
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="text"
                                color="primary"
                                onClick={() => navigate('/estoque')}
                                sx={{ fontSize: '0.75rem', fontWeight: 700, p: 0.5, minWidth: 'auto', textTransform: 'none' }}
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
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                      + {produtosCriticos.length - 4} outro(s) produto(s) com atenção necessária.
                    </Typography>
                  )}

                  <Box sx={{ mt: 'auto', pt: 1.5 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => navigate('/estoque')}
                      endIcon={<ArrowForward />}
                      sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                    >
                      Gerenciar Todo o Estoque
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center', my: 'auto' }}>
                  <CheckCircle sx={{ fontSize: 44, color: 'success.main', mb: 1, opacity: 0.9 }} />
                  <Typography variant="body2" fontWeight={700} color="text.primary">
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
