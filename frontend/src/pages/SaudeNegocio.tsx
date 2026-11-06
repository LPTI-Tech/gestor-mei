import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Activity,
  Receipt,
  ReceiptText,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  CalendarDays,
  Sparkles,
  Store,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import { StatusPill } from '../components/StatusPill';
import { FiscalLimitIndicator } from '../components/FiscalLimitIndicator';
import { StatCard } from '../components/StatCard';
import { VitalityRing, ProtectiveCard } from '../components/sentinel';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import api from '../services/api';
import { SaudeNegocio, DashboardMetrics } from '../types';
import { formatCurrency } from '../services/exportUtils';

export const SaudeNegocioPage: React.FC = () => {
  const theme = useTheme();
  const [dias, setDias] = useState<number>(30);
  const [saude, setSaude] = useState<SaudeNegocio | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSaude = async () => {
    try {
      setLoading(true);
      const [resSaude, resMetrics] = await Promise.allSettled([
        api.get<SaudeNegocio>('/saude-negocio', { params: { dias } }),
        api.get<DashboardMetrics>('/dashboard/metrics'),
      ]);

      if (resSaude.status === 'fulfilled') {
        setSaude(resSaude.value.data);
      }
      if (resMetrics.status === 'fulfilled') {
        setMetrics(resMetrics.value.data);
      }
    } catch (err) {
      console.error('Erro ao buscar dados de saúde:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaude();
  }, [dias]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 12, gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Calculando diagnóstico financeiro e score de vitalidade...
        </Typography>
      </Box>
    );
  }

  if (!saude) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2.5, fontWeight: 600 }}>
        Erro ao carregar diagnóstico de saúde do negócio. Verifique a conexão com o servidor.
      </Alert>
    );
  }

  const score = saude.score_saude;
  const isExcelente = saude.classificacao_saude === 'EXCELENTE';
  const isSaudavel = saude.classificacao_saude === 'SAUDAVEL';
  const isAtencao = saude.classificacao_saude === 'ATENCAO';

  // Mapeamento semântico do StatusPill
  const getPillVariant = () => {
    if (isExcelente || isSaudavel) return 'success';
    if (isAtencao) return 'warning';
    return 'error';
  };

  const getScoreColor = () => {
    if (isExcelente || isSaudavel) return '#10B981';
    if (isAtencao) return '#F59E0B';
    return '#EF4444';
  };

  const scoreColor = getScoreColor();
  const faturamentoAcumuladoAno = metrics?.venda_ano ?? saude.receita_total;

  return (
    <Box sx={{ pb: 4 }}>
      {/* 1. Header Executivo Estilo Stripe Analytics */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={22} strokeWidth={1.75} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
              }}
            >
              Saúde Financeira do Negócio
            </Typography>
            <StatusPill
              label={saude.classificacao_saude}
              variant={getPillVariant()}
              pulse={isExcelente || isSaudavel}
            />
          </Box>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mt: 0.6, fontWeight: 500 }}
          >
            Diagnóstico analítico da LPTI Tech: entradas, queima de custos, margem líquida real e termômetro de vitalidade.
          </Typography>
        </Box>

        {/* Seletor de Período Executivo */}
        <FormControl
          size="small"
          sx={{
            minWidth: 180,
            bgcolor: 'background.paper',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.85rem',
            },
          }}
        >
          <InputLabel sx={{ fontWeight: 600 }}>Período de Análise</InputLabel>
          <Select
            value={dias}
            label="Período de Análise"
            IconComponent={() => <ChevronDown size={18} strokeWidth={1.75} style={{ marginRight: 8, pointerEvents: 'none' }} />}
            onChange={(e) => setDias(Number(e.target.value))}
            startAdornment={
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'text.secondary' }}>
                <CalendarDays size={16} strokeWidth={1.75} />
              </Box>
            }
          >
            <MenuItem value={15}>Últimos 15 dias</MenuItem>
            <MenuItem value={30}>Últimos 30 dias (Mês)</MenuItem>
            <MenuItem value={60}>Últimos 60 dias</MenuItem>
            <MenuItem value={90}>Últimos 90 dias (Trimestre)</MenuItem>
            <MenuItem value={180}>Últimos 180 dias (Semestre)</MenuItem>
            <MenuItem value={365}>Últimos 365 dias (Ano)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 2. Monitor do Teto MEI (FiscalLimitIndicator - Stripe Radar) */}
      <Box sx={{ mb: 3 }}>
        <FiscalLimitIndicator
          faturamentoAcumulado={faturamentoAcumuladoAno}
          limiteAnual={81000}
          anoReferencia={new Date().getFullYear()}
        />
      </Box>

      {/* 3. Health Score Banner — VitalityRing & ProtectiveCard Sentinel */}
      <ProtectiveCard
        variant="default"
        padding={{ xs: 2.5, sm: 3 }}
        sx={{ mb: 3 }}
      >
        <Grid container spacing={3} alignItems="center">
          {/* Coluna 1: VitalityRing Sentinel */}
          <Grid
            item
            xs={12}
            sm={4}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VitalityRing
              score={score}
              size={140}
              strokeWidth={11}
              margemLucro={saude.margem_lucro_percentual}
              statusLabel={saude.classificacao_saude}
              pulse={isExcelente || isSaudavel}
            />
          </Grid>

          {/* Coluna 2: Termômetro de Margem & Diagnóstico Textual */}
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.98rem' }}>
                Termômetro de Lucratividade: Margem Líquida de {saude.margem_lucro_percentual}%
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontFeatureSettings: '"tnum"',
                  color: saude.resultado_operacional >= 0 ? '#10B981' : '#EF4444',
                }}
              >
                {saude.resultado_operacional >= 0 ? '+ Lucro positivo' : '- Déficit operacional'}
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, score))}
              sx={{
                height: 12,
                borderRadius: 6,
                mb: 1.8,
                bgcolor: (t) =>
                  t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  bgcolor: scoreColor,
                },
              }}
            />

            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', lineHeight: 1.5, fontWeight: 500 }}
            >
              {isExcelente || isSaudavel
                ? 'Seu negócio opera com sólida geração de caixa e despesas controladas. Continue reinvestindo e monitorando suas compras de fornecedores.'
                : isAtencao
                ? 'Atenção aos custos com compras de mercadorias e tarifas operacionais. Sua margem líquida está apertada frente às receitas geradas.'
                : 'Alerta crítico: as despesas e contas estão superando ou consumindo todo o faturamento. Revise custos fixos e renegocie compras com urgência.'}
            </Typography>
          </Grid>
        </Grid>
      </ProtectiveCard>

      {/* 4. Metric Surfaces em Grid (Stripe Analytics Cards) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Receita Bruta Total"
            value={formatCurrency(saude.receita_total)}
            subtitle={`Entradas nos últimos ${dias} dias`}
            icon={<Receipt size={20} strokeWidth={1.75} />}
            color="#2563EB"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Despesas Operacionais"
            value={formatCurrency(saude.despesas_totais)}
            subtitle="Custos, mercadorias e contas"
            icon={<ReceiptText size={20} strokeWidth={1.75} />}
            color="#DC2626"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Resultado Líquido (Lucro)"
            value={formatCurrency(saude.resultado_operacional)}
            subtitle="Saldo real restante no caixa"
            icon={<Activity size={20} strokeWidth={1.75} />}
            color={saude.resultado_operacional >= 0 ? '#10B981' : '#EF4444'}
            trend={`${saude.margem_lucro_percentual}% margem`}
            trendType={saude.resultado_operacional >= 0 ? 'positive' : 'negative'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ticket Médio de Venda"
            value={formatCurrency(saude.ticket_medio)}
            subtitle="Gasto médio por cliente atendido"
            icon={<TrendingUp size={20} strokeWidth={1.75} />}
            color="#0D9488"
          />
        </Grid>
      </Grid>

      {/* 5. Destaques Comerciais (Metric Surfaces 2 Colunas) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Maior Canal */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                CANAL DE MAIOR FATURAMENTO
              </Typography>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={16} strokeWidth={1.75} />
              </Box>
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'primary.main',
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.25rem', sm: '1.4rem' },
              }}
            >
              {saude.maior_canal_venda || 'Balcão'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Gerou{' '}
              <Box
                component="span"
                sx={{ fontWeight: 800, color: 'text.primary', fontFeatureSettings: '"tnum"' }}
              >
                {formatCurrency(saude.valor_maior_canal)}
              </Box>{' '}
              em vendas no período selecionado.
            </Typography>
          </Paper>
        </Grid>

        {/* Maior Forma de Pagamento */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                MEIO DE PAGAMENTO PREDILETO
              </Typography>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreditCard size={16} strokeWidth={1.75} />
              </Box>
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'secondary.main',
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.25rem', sm: '1.4rem' },
              }}
            >
              {saude.maior_forma_pagamento || 'PIX'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Totalizou{' '}
              <Box
                component="span"
                sx={{ fontWeight: 800, color: 'text.primary', fontFeatureSettings: '"tnum"' }}
              >
                {formatCurrency(saude.valor_maior_forma)}
              </Box>{' '}
              recebidos no período selecionado.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 6. Gráfico de Evolução Mensal (Stripe Billing Style) */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em', fontSize: '1.05rem' }}>
              Evolução Mensal (Receitas x Despesas x Lucro)
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.3 }}>
              Comparativo histórico dos últimos 6 meses para diagnosticar o ritmo de crescimento e margem do negócio
            </Typography>
          </Box>
          <StatusPill label="Histórico Consolidado" variant="info" />
        </Box>

        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={saude.evolucao_mensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} opacity={0.6} />
              <XAxis dataKey="mes" fontSize={11} stroke="#64748B" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis
                fontSize={11}
                stroke="#64748B"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                width={50}
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val)), '']}
                labelFormatter={(lbl) => `Competência: ${lbl}`}
                contentStyle={{
                  backgroundColor: '#071933',
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgba(7, 25, 51, 0.3)',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                }}
                itemStyle={{ fontWeight: 700, fontFeatureSettings: '"tnum"' }}
                labelStyle={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.75rem', marginBottom: 4 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 12, fontSize: '0.8rem', fontWeight: 600 }}
              />
              <Bar dataKey="receita" name="Receita Bruta" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesas Totais" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resultado" name="Lucro Operacional" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* 7. Dicas & Diagnósticos Automáticos (100% Lucide React) */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} strokeWidth={1.75} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              Inteligência de Gestão: Diagnósticos Automáticos
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Recomendações contextuais da IA para maximizar sua lucratividade
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {saude.insights.map((ins, idx) => {
            const isSuccess = ins.tipo === 'SUCCESS';
            const isWarning = ins.tipo === 'WARNING';
            const isDanger = ins.tipo === 'DANGER';

            const borderColor = isSuccess ? '#10B981' : isWarning ? '#F59E0B' : isDanger ? '#EF4444' : '#2563EB';
            const bgColor = isSuccess
              ? 'rgba(16, 185, 129, 0.04)'
              : isWarning
              ? 'rgba(245, 158, 11, 0.04)'
              : isDanger
              ? 'rgba(239, 68, 68, 0.04)'
              : 'rgba(37, 99, 235, 0.04)';

            return (
              <Grid item xs={12} md={6} key={idx}>
                <Box
                  sx={{
                    p: 2.2,
                    height: '100%',
                    borderRadius: 2.5,
                    bgcolor: bgColor,
                    border: '1px solid',
                    borderColor: alpha(borderColor, 0.25),
                    borderLeft: `4px solid ${borderColor}`,
                    transition: 'transform 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.8 }}>
                    <Box sx={{ color: borderColor, display: 'flex', alignItems: 'center' }}>
                      {isSuccess && <CheckCircle2 size={18} strokeWidth={1.75} />}
                      {isWarning && <AlertTriangle size={18} strokeWidth={1.75} />}
                      {isDanger && <AlertCircle size={18} strokeWidth={1.75} />}
                      {!isSuccess && !isWarning && !isDanger && <Info size={18} strokeWidth={1.75} />}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                      {ins.titulo}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.45, fontSize: '0.84rem' }}>
                    {ins.descricao}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
};
