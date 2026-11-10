import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  Chip,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Calendar,
  CalendarRange,
  CalendarDays,
  CalendarCheck,
  Clock,
  TrendingUp as TrendingUpLucide,
  Activity as ActivityLucide,
  Wallet,
  Receipt,
  Warehouse,
  TriangleAlert,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Copy,
  CircleCheckBig,
  ReceiptText,
  LineChart as LineChartLucide,
  BarChart3,
  PackageSearch,
} from 'lucide-react';
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
import { DashboardGreeting } from '../components/DashboardGreeting';
import { formatCurrency } from '../services/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import {
  FiscalShieldCapsule,
  ClearSignalKPI,
  ProtectiveCard,
} from '../components/sentinel';
import { MasterDashboard } from '../components/MasterDashboard';

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { user, empresa, isAdmin, isConsultor, isMaster, isSupportMode, activeEmpresaId, setContextEmpresaId } = useAuth();
  const isGestor = isAdmin || isConsultor;
  const isMasterGlobalView = isMaster && !activeEmpresaId;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [saude, setSaude] = useState<SaudeNegocio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (isMasterGlobalView) {
      setLoading(false);
      return;
    }
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
  }, [activeEmpresaId, isMasterGlobalView]);

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

  if (isMasterGlobalView) {
    return <MasterDashboard />;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#2563EB' }} />
      </Box>
    );
  }

  if (error || !metrics) {
    return (
      <Alert severity="error" sx={{ my: 2, borderRadius: '12px' }}>
        {error || 'Erro ao carregar métricas.'}
      </Alert>
    );
  }

  const produtosCriticos = produtos.filter(
    (p) => (p.quantidade_estoque ?? 0) <= (p.estoque_minimo ?? 0)
  );

  return (
    <Box>
      {/* Banner de Modo Auditoria para Usuário MASTER em contexto de empresa */}
      {isMaster && activeEmpresaId && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setContextEmpresaId(null)}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Voltar à Visão Global MASTER
            </Button>
          }
          sx={{ mb: 3, borderRadius: 2.5, border: '1px solid rgba(2, 132, 199, 0.3)' }}
        >
          👁️ <strong>Modo Auditoria MASTER:</strong> Você está visualizando os dados operacionais da empresa{' '}
          <strong>{empresa?.nome_fantasia || `#${activeEmpresaId}`}</strong>.
        </Alert>
      )}
      {/* =============================================================== */}
      {/* 1. SAUDAÇÃO EXECUTIVA & INSIGHTS                               */}
      {/* =============================================================== */}
      <DashboardGreeting
        user={user}
        empresa={empresa}
        metrics={metrics}
        produtos={produtos}
      />

      {/* =============================================================== */}
      {/* 2. BLINDAGEM DO TETO MEI: THE FISCAL SHIELD CAPSULE            */}
      {/* Substitui o indicador estático pelo Escudo Fiscal Oficial       */}
      {/* =============================================================== */}
      {isGestor && (
        <Box sx={{ mb: 3 }}>
          <FiscalShieldCapsule
            variant="hero"
            faturamentoAcumulado={metrics.venda_ano || 0}
            limiteAnual={81000}
            anoReferencia={new Date().getFullYear()}
            statusDas={
              metrics.das_status_mes_atual === 'Pago'
                ? 'pago'
                : metrics.das_status_mes_atual === 'Atrasado' || (metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0)
                ? 'atrasado'
                : 'pendente'
            }
            onConsultorClick={() => navigate('/consultor')}
          />
        </Box>
      )}

      {/* =============================================================== */}
      {/* 3. ALERTAS EXECUTIVOS DO CONTROLE DAS                          */}
      {/* =============================================================== */}
      {/* Alerta: DAS em atraso */}
      {isGestor && Boolean(metrics.das_qtd_atrasados && metrics.das_qtd_atrasados > 0) && (
        <ProtectiveCard
          variant="accent"
          accentColor="error"
          padding={2.5}
          sx={{ mb: 2.5 }}
        >
          <Box
            sx={{
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
                  borderRadius: '12px',
                  bgcolor: 'rgba(239, 68, 68, 0.12)',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TriangleAlert size={22} strokeWidth={1.75} />
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
                      borderRadius: '6px',
                      bgcolor: 'rgba(239, 68, 68, 0.12)',
                      color: '#DC2626',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
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
                size="small"
                onClick={() => navigate('/das')}
                sx={{
                  fontWeight: 700,
                  borderRadius: '10px',
                  textTransform: 'none',
                  bgcolor: '#DC2626',
                  '&:hover': { bgcolor: '#B91C1C' },
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                }}
              >
                Regularizar DAS
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenPgmei}
                startIcon={<ExternalLink size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                }}
              >
                Abrir PGMEI
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCopyDasData}
                startIcon={<Copy size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                }}
              >
                Copiar Dados
              </Button>
            </Box>
          </Box>
        </ProtectiveCard>
      )}

      {/* Alerta: DAS Vence em breve (até 7 dias) */}
      {metrics.das_status_mes_atual === 'Pendente' &&
        metrics.das_dias_restantes !== undefined &&
        metrics.das_dias_restantes !== null &&
        metrics.das_dias_restantes >= 0 &&
        metrics.das_dias_restantes <= 7 && (
        <ProtectiveCard
          variant="accent"
          accentColor="warning"
          padding={2.5}
          sx={{ mb: 2.5 }}
        >
          <Box
            sx={{
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
                  borderRadius: '12px',
                  bgcolor: 'rgba(245, 158, 11, 0.12)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={22} strokeWidth={1.75} />
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
                      borderRadius: '6px',
                      bgcolor: 'rgba(245, 158, 11, 0.12)',
                      color: '#D97706',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
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
                  borderRadius: '10px',
                  textTransform: 'none',
                  bgcolor: '#D97706',
                  '&:hover': { bgcolor: '#B45309' },
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                }}
              >
                Ver Guia
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenPgmei}
                startIcon={<ExternalLink size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                }}
              >
                Abrir PGMEI
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCopyDasData}
                startIcon={<Copy size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                }}
              >
                Copiar Dados
              </Button>
            </Box>
          </Box>
        </ProtectiveCard>
      )}

      {/* Alerta: DAS Pago */}
      {metrics.das_status_mes_atual === 'Pago' && !metrics.das_qtd_atrasados && (
        <ProtectiveCard
          variant="accent"
          accentColor="success"
          padding={2.5}
          sx={{ mb: 2.5 }}
        >
          <Box
            sx={{
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
                  borderRadius: '12px',
                  bgcolor: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CircleCheckBig size={22} strokeWidth={1.75} />
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
                      borderRadius: '6px',
                      bgcolor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
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
                size="small"
                onClick={() => navigate('/das')}
                sx={{
                  fontWeight: 700,
                  borderRadius: '10px',
                  textTransform: 'none',
                  color: '#059669',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.08)' },
                }}
              >
                Ver Histórico
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenPgmei}
                startIcon={<ExternalLink size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                }}
              >
                Portal PGMEI
              </Button>
            </Box>
          </Box>
        </ProtectiveCard>
      )}

      {/* Alerta de Estoque Crítico */}
      {Boolean(metrics.itens_estoque_baixo && metrics.itens_estoque_baixo > 0) && (
        <ProtectiveCard
          variant="accent"
          accentColor="warning"
          padding={2.2}
          sx={{ mb: 3 }}
        >
          <Box
            sx={{
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
                  borderRadius: '10px',
                  bgcolor: 'rgba(245, 158, 11, 0.12)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} strokeWidth={1.75} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Alerta de Reposição: Há {metrics.itens_estoque_baixo} item(ns) com estoque crítico abaixo do mínimo!
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Evite perda de vendas repondo produtos com antecedência.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/estoque')}
              sx={{
                fontWeight: 700,
                borderRadius: '10px',
                textTransform: 'none',
                bgcolor: '#D97706',
                '&:hover': { bgcolor: '#B45309' },
                flexShrink: 0,
              }}
            >
              Ver Estoque
            </Button>
          </Box>
        </ProtectiveCard>
      )}

      {/* =============================================================== */}
      {/* 4. OS 8 KPIS CENTRAIS: THE CLEAR SIGNALS                       */}
      {/* Substitui os StatCards legados por ClearSignalKPIs             */}
      {/* =============================================================== */}
      
      {/* Linha 1: Ritmo de Vendas (Dia, Semana, Mês, Ano) */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Venda do Dia"
            value={metrics.venda_dia}
            humanExplanation="Faturamento gerado hoje até o momento"
            icon={<Clock size={18} strokeWidth={1.75} />}
            colorScheme="primary"
            onClick={() => navigate('/vendas')}
            interactive
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Venda da Semana"
            value={metrics.venda_semana}
            humanExplanation="Acumulado nos últimos 7 dias de operação"
            icon={<CalendarRange size={18} strokeWidth={1.75} />}
            colorScheme="primary"
            onClick={() => navigate('/vendas')}
            interactive
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Venda do Mês"
            value={metrics.venda_mes}
            humanExplanation="Volume bruto faturado na competência atual"
            icon={<CalendarDays size={18} strokeWidth={1.75} />}
            colorScheme="success"
            onClick={() => navigate('/vendas')}
            interactive
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Venda do Ano"
            value={metrics.venda_ano}
            humanExplanation="Faturamento anual acumulado no teto MEI"
            icon={<CalendarCheck size={18} strokeWidth={1.75} />}
            colorScheme="primary"
            onClick={() => navigate('/relatorio-mei')}
            interactive
          />
        </Grid>
      </Grid>

      {/* Linha 2: Caixa, Quantidade de Pedidos, Ticket Médio e Lucro Real */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Caixa Físico Atual"
            value={metrics.caixa_atual}
            humanExplanation="Saldo em espécie disponível no turno"
            icon={<Wallet size={18} strokeWidth={1.75} />}
            colorScheme={metrics.caixa_atual > 0 ? 'success' : 'neutral'}
            onClick={() => navigate('/caixa')}
            interactive
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Pedidos no Mês"
            value={metrics.qtd_vendas_mes}
            isCurrency={false}
            prefix=""
            humanExplanation="Volume total de transações emitidas no mês"
            icon={<Receipt size={18} strokeWidth={1.75} />}
            colorScheme="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Ticket Médio"
            value={metrics.ticket_medio_mes}
            humanExplanation="Média de gasto por cliente em cada venda"
            icon={<TrendingUpLucide size={18} strokeWidth={1.75} />}
            colorScheme="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isGestor ? (
            <ClearSignalKPI
              label="Lucro Real (Mês)"
              value={metrics.lucro_operacional_mes}
              humanExplanation={
                metrics.lucro_operacional_mes >= 0
                  ? 'Margem positiva após cobrir custos e despesas'
                  : 'Atenção: despesas superando faturamento do mês'
              }
              trend={
                metrics.lucro_operacional_mes >= 0
                  ? { value: '+18%', label: 'margem saudável', direction: 'up' }
                  : { value: '-4%', label: 'margem comprimida', direction: 'down' }
              }
              colorScheme={metrics.lucro_operacional_mes >= 0 ? 'success' : 'error'}
              icon={<ActivityLucide size={18} strokeWidth={1.75} />}
              onClick={() => navigate('/saude-negocio')}
              interactive
            />
          ) : (
            <ClearSignalKPI
              label="Estoque em Alerta"
              value={metrics.itens_estoque_baixo ?? 0}
              isCurrency={false}
              prefix=""
              humanExplanation="Itens abaixo da quantidade mínima segura"
              colorScheme={metrics.itens_estoque_baixo && metrics.itens_estoque_baixo > 0 ? 'warning' : 'success'}
              icon={<Warehouse size={18} strokeWidth={1.75} />}
              onClick={() => navigate('/estoque')}
              interactive
            />
          )}
        </Grid>
      </Grid>

      {/* =============================================================== */}
      {/* 5. PAINEL DE RESULTADO FINANCEIRO: PROTECTIVE CARD             */}
      {/* =============================================================== */}
      {isGestor && (
        <ProtectiveCard
          variant="default"
          padding={{ xs: 2.5, sm: 3 }}
          sx={{ mb: 3 }}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUpLucide size={20} strokeWidth={1.75} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.015em', color: 'text.primary' }}>
                  Resultado Financeiro do Mês (Entradas x Saídas)
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.3, ml: { sm: 6 } }}>
                Apuração detalhada entre fluxo de vendas, despesas operacionais e resultado líquido
              </Typography>
            </Box>
            <Chip
              label="BI Financeiro"
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 700, fontSize: '0.72rem', borderRadius: '6px' }}
            />
          </Box>

          <Grid container spacing={2.5}>
            {/* Total Entradas */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '14px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  bgcolor: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.12)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#059669',
                    }}
                  >
                    Total Entradas (Vendas)
                  </Typography>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUpLucide size={16} strokeWidth={2} />
                  </Box>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '1.45rem', sm: '1.65rem' },
                    color: '#059669',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    mb: 0.5,
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
                  borderRadius: '14px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  bgcolor: isDark ? 'rgba(239, 68, 68, 0.06)' : 'rgba(239, 68, 68, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px -4px rgba(239, 68, 68, 0.12)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#DC2626',
                    }}
                  >
                    Total Saídas (Despesas)
                  </Typography>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: 'rgba(239, 68, 68, 0.12)',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Wallet size={16} strokeWidth={2} />
                  </Box>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '1.45rem', sm: '1.65rem' },
                    color: '#DC2626',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    mb: 0.5,
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
                  borderRadius: '14px',
                  border: '1px solid',
                  borderColor:
                    metrics.lucro_operacional_mes >= 0
                      ? 'rgba(37, 99, 235, 0.3)'
                      : 'rgba(245, 158, 11, 0.3)',
                  bgcolor: isDark
                    ? metrics.lucro_operacional_mes >= 0
                      ? 'rgba(37, 99, 235, 0.08)'
                      : 'rgba(245, 158, 11, 0.08)'
                    : metrics.lucro_operacional_mes >= 0
                    ? 'rgba(37, 99, 235, 0.03)'
                    : 'rgba(245, 158, 11, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow:
                      metrics.lucro_operacional_mes >= 0
                        ? '0 8px 20px -4px rgba(37, 99, 235, 0.15)'
                        : '0 8px 20px -4px rgba(245, 158, 11, 0.15)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: metrics.lucro_operacional_mes >= 0 ? '#2563EB' : '#D97706',
                    }}
                  >
                    Quanto Sobrou (Lucro Líquido)
                  </Typography>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor:
                        metrics.lucro_operacional_mes >= 0
                          ? 'rgba(37, 99, 235, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                      color: metrics.lucro_operacional_mes >= 0 ? '#2563EB' : '#D97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUpLucide size={16} strokeWidth={2} />
                  </Box>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '1.45rem', sm: '1.65rem' },
                    color: metrics.lucro_operacional_mes >= 0 ? '#2563EB' : '#D97706',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    mb: 0.5,
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
        </ProtectiveCard>
      )}

      {/* =============================================================== */}
      {/* 6. PAINEL DE CONTROLE DAS MENSAL: PROTECTIVE CARD              */}
      {/* =============================================================== */}
      {isGestor && (
        <ProtectiveCard
          variant="accent"
          accentColor="primary"
          padding={{ xs: 2.5, sm: 3 }}
          sx={{ mb: 3 }}
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
                  borderRadius: '12px',
                  bgcolor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ReceiptText size={20} strokeWidth={1.75} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.015em', color: 'text.primary' }}>
                  Controle DAS Mensal — Situação Fiscal MEI
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Acompanhamento oficial de guias tributárias PGMEI
                </Typography>
              </Box>
            </Box>
            {/* Ações Rápidas */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleOpenPgmei}
                startIcon={<ExternalLink size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                }}
              >
                Abrir PGMEI
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCopyDasData}
                startIcon={<Copy size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                }}
              >
                Copiar Dados
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate('/das')}
                endIcon={<ArrowRight size={16} strokeWidth={1.75} />}
                sx={{
                  fontWeight: 700,
                  borderRadius: '10px',
                  textTransform: 'none',
                  bgcolor: '#2563EB',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
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
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
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
                    sx={{ fontWeight: 900, fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}
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
                      borderRadius: '6px',
                      bgcolor:
                        metrics.das_status_mes_atual === 'Pago'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : metrics.das_status_mes_atual === 'Atrasado'
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                      color:
                        metrics.das_status_mes_atual === 'Pago'
                          ? '#059669'
                          : metrics.das_status_mes_atual === 'Atrasado'
                          ? '#DC2626'
                          : '#D97706',
                      border: '1px solid',
                      borderColor:
                        metrics.das_status_mes_atual === 'Pago'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : metrics.das_status_mes_atual === 'Atrasado'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'rgba(245, 158, 11, 0.3)',
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
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  bgcolor: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.03)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#059669',
                  }}
                >
                  DAS Pagos no Ano
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color: '#059669',
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
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  bgcolor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.03)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#D97706',
                  }}
                >
                  DAS a Vencer (Pendentes)
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color: '#D97706',
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
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: metrics.das_qtd_atrasados
                    ? 'rgba(239, 68, 68, 0.3)'
                    : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                  bgcolor: metrics.das_qtd_atrasados
                    ? isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.03)'
                    : isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: metrics.das_qtd_atrasados ? '#DC2626' : 'text.secondary',
                  }}
                >
                  DAS em Atraso
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color: metrics.das_qtd_atrasados ? '#DC2626' : 'text.primary',
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
        </ProtectiveCard>
      )}

      {/* =============================================================== */}
      {/* 7. SAÚDE DO NEGÓCIO & ESTOQUE CRÍTICO: PROTECTIVE CARDS       */}
      {/* =============================================================== */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Saúde do Negócio */}
        {isGestor && (
          <Grid item xs={12} md={6}>
            <ProtectiveCard
              variant="default"
              padding={{ xs: 2.5, sm: 3 }}
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor:
                        saude?.score_saude && saude.score_saude >= 70
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                      color:
                        saude?.score_saude && saude.score_saude >= 70 ? '#059669' : '#D97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ActivityLucide size={20} strokeWidth={1.75} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.015em' }}>
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
                      borderRadius: '6px',
                      bgcolor:
                        saude.classificacao_saude === 'EXCELENTE' || saude.classificacao_saude === 'SAUDAVEL'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : saude.classificacao_saude === 'ATENCAO'
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                      color:
                        saude.classificacao_saude === 'EXCELENTE' || saude.classificacao_saude === 'SAUDAVEL'
                          ? '#059669'
                          : saude.classificacao_saude === 'ATENCAO'
                          ? '#D97706'
                          : '#DC2626',
                      border: '1px solid',
                      borderColor:
                        saude.classificacao_saude === 'EXCELENTE' || saude.classificacao_saude === 'SAUDAVEL'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : saude.classificacao_saude === 'ATENCAO'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)',
                    }}
                  />
                )}
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                Diagnóstico de rentabilidade e desempenho dos últimos 30 dias
              </Typography>

              {saude ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <Box sx={{ p: 2, borderRadius: '12px', bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)', border: '1px solid', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.8rem' }}>
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
                              ? '#059669'
                              : saude.score_saude >= 50
                              ? '#D97706'
                              : '#DC2626',
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
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor:
                            saude.score_saude >= 70
                              ? '#059669'
                              : saude.score_saude >= 50
                              ? '#D97706'
                              : '#DC2626',
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
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
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
                            fontWeight: 900,
                            mt: 0.5,
                            fontFeatureSettings: '"tnum"',
                            color: saude.margem_lucro_percentual >= 15 ? '#059669' : '#D97706',
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
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
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
                            fontWeight: 900,
                            mt: 0.5,
                            fontFeatureSettings: '"tnum"',
                            color: saude.resultado_operacional >= 0 ? '#059669' : '#DC2626',
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
                        borderRadius: '12px',
                        bgcolor: isDark ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.04)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        borderLeft: '4px solid #2563EB',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#2563EB' }}>
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
                      endIcon={<ArrowRight size={16} strokeWidth={1.75} />}
                      sx={{
                        fontWeight: 700,
                        borderRadius: '10px',
                        textTransform: 'none',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
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
            </ProtectiveCard>
          </Grid>
        )}

        {/* Produtos em Estoque Crítico */}
        <Grid item xs={12} md={isGestor ? 6 : 12}>
          <ProtectiveCard
            variant="default"
            padding={{ xs: 2.5, sm: 3 }}
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor:
                      produtosCriticos.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: produtosCriticos.length > 0 ? '#D97706' : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Warehouse size={20} strokeWidth={1.75} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.015em' }}>
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
                  borderRadius: '6px',
                  bgcolor: produtosCriticos.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: produtosCriticos.length > 0 ? '#D97706' : '#059669',
                  border: '1px solid',
                  borderColor:
                    produtosCriticos.length > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)',
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
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'text.secondary',
                            bgcolor: isDark ? '#1A243D' : '#F8FAFC',
                          }}
                        >
                          Produto
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'text.secondary',
                            bgcolor: isDark ? '#1A243D' : '#F8FAFC',
                          }}
                        >
                          Estoque Atual
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'text.secondary',
                            bgcolor: isDark ? '#1A243D' : '#F8FAFC',
                          }}
                        >
                          Estoque Mín.
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'text.secondary',
                            bgcolor: isDark ? '#1A243D' : '#F8FAFC',
                          }}
                        >
                          Ação
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {produtosCriticos.slice(0, 4).map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
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
                                borderRadius: '6px',
                                bgcolor:
                                  (p.quantidade_estoque ?? 0) <= 0
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(245, 158, 11, 0.12)',
                                color:
                                  (p.quantidade_estoque ?? 0) <= 0 ? '#DC2626' : '#D97706',
                                border: '1px solid',
                                borderColor:
                                  (p.quantidade_estoque ?? 0) <= 0
                                    ? 'rgba(239, 68, 68, 0.3)'
                                    : 'rgba(245, 158, 11, 0.3)',
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
                                borderRadius: '6px',
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
                    endIcon={<ArrowRight size={16} strokeWidth={1.75} />}
                    sx={{
                      fontWeight: 700,
                      borderRadius: '10px',
                      textTransform: 'none',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
                    }}
                  >
                    Gerenciar Todo o Estoque
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center', my: 'auto' }}>
                <CircleCheckBig size={44} color="#059669" strokeWidth={1.75} style={{ marginBottom: 8, opacity: 0.9 }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Estoque 100% equilibrado!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Nenhum produto cadastrado está abaixo da margem de reposição.
                </Typography>
              </Box>
            )}
          </ProtectiveCard>
        </Grid>
      </Grid>

      {/* =============================================================== */}
      {/* 8. GRÁFICOS DE VENDAS: PROTECTIVE CARDS                        */}
      {/* =============================================================== */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Vendas por Dia (últimos 14 dias) */}
        <Grid item xs={12} md={7}>
          <ProtectiveCard
            variant="default"
            padding={{ xs: 2.5, sm: 3 }}
            sx={{ height: '100%' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: 'rgba(37, 99, 235, 0.12)',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LineChartLucide size={20} strokeWidth={1.75} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.015em' }}>
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
                sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: '6px' }}
              />
            </Box>

            <Box sx={{ width: '100%', height: 260, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.vendas_por_dia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVendasDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#1E293B' : '#E2E8F0'} vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    fontSize={11}
                    stroke="#64748B"
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#1E293B' : '#E2E8F0' }}
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
                      backgroundColor: isDark ? '#0B1120' : '#071933',
                      borderRadius: 10,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                    }}
                    itemStyle={{ color: '#60A5FA', fontWeight: 700, fontFeatureSettings: '"tnum"' }}
                    labelStyle={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorVendasDia)"
                    activeDot={{ r: 6, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </ProtectiveCard>
        </Grid>

        {/* Vendas por Mês */}
        <Grid item xs={12} md={5}>
          <ProtectiveCard
            variant="default"
            padding={{ xs: 2.5, sm: 3 }}
            sx={{ height: '100%' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChart3 size={20} strokeWidth={1.75} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.015em' }}>
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
                sx={{ fontWeight: 700, fontSize: '0.7rem', borderRadius: '6px' }}
              />
            </Box>

            <Box sx={{ width: '100%', height: 260, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.vendas_por_mes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#1E293B' : '#E2E8F0'} vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    fontSize={11}
                    stroke="#64748B"
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#1E293B' : '#E2E8F0' }}
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
                      backgroundColor: isDark ? '#0B1120' : '#071933',
                      borderRadius: 10,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                    }}
                    itemStyle={{ color: '#34D399', fontWeight: 700, fontFeatureSettings: '"tnum"' }}
                    labelStyle={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}
                  />
                  <Bar dataKey="valor" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ProtectiveCard>
        </Grid>
      </Grid>

      {/* =============================================================== */}
      {/* 9. MEIOS DE PAGAMENTO E CANAIS: PROTECTIVE CARDS               */}
      {/* =============================================================== */}
      <Grid container spacing={3}>
        {/* Meios de Pagamento */}
        <Grid item xs={12} md={6}>
          <ProtectiveCard
            variant="default"
            padding={{ xs: 2.5, sm: 3 }}
            sx={{ height: '100%' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: 'rgba(37, 99, 235, 0.12)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={20} strokeWidth={1.75} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.015em' }}>
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
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor:
                          item.nome === 'PIX'
                            ? '#00B4D8'
                            : item.nome === 'Dinheiro'
                            ? '#059669'
                            : item.nome === 'Crédito'
                            ? '#7C3AED'
                            : '#D97706',
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </ProtectiveCard>
        </Grid>

        {/* Origens de Venda */}
        <Grid item xs={12} md={6}>
          <ProtectiveCard
            variant="default"
            padding={{ xs: 2.5, sm: 3 }}
            sx={{ height: '100%' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: 'rgba(245, 158, 11, 0.12)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PackageSearch size={20} strokeWidth={1.75} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.015em' }}>
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
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor:
                          item.nome === 'WhatsApp'
                            ? '#25D366'
                            : item.nome === 'iFood'
                            ? '#EA1D2C'
                            : item.nome === 'Balcão'
                            ? '#2563EB'
                            : '#D97706',
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </ProtectiveCard>
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
