import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import {
  Favorite,
  TrendingUp,
  ReceiptLong,
  PointOfSale,
  AccountBalanceWallet,
  CheckCircle,
  Warning,
  Info,
  Error as ErrorIcon,
  Storefront,
} from '@mui/icons-material';
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
import { SaudeNegocio } from '../types';
import { formatCurrency } from '../services/exportUtils';
import { StatCard } from '../components/StatCard';

export const SaudeNegocioPage: React.FC = () => {
  const [dias, setDias] = useState<number>(30);
  const [saude, setSaude] = useState<SaudeNegocio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSaude = async () => {
    try {
      setLoading(true);
      const res = await api.get<SaudeNegocio>('/saude-negocio', {
        params: { dias },
      });
      setSaude(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaude();
  }, [dias]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!saude) {
    return <Alert severity="error">Erro ao carregar diagnóstico de saúde do negócio.</Alert>;
  }

  const score = saude.score_saude;
  const isExcelente = saude.classificacao_saude === 'EXCELENTE';
  const isSaudavel = saude.classificacao_saude === 'SAUDAVEL';
  const isAtencao = saude.classificacao_saude === 'ATENCAO';

  return (
    <Box>
      {/* Title */}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
              <Favorite color="error" /> Saúde Financeira do Negócio
            </Typography>
            <Chip
              label={saude.classificacao_saude}
              color={isExcelente || isSaudavel ? 'success' : isAtencao ? 'warning' : 'error'}
              sx={{ fontWeight: 800 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Diagnóstico claro: quanto entrou, quanto saiu, quanto sobrou de margem real e onde otimizar.
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Período de Análise</InputLabel>
          <Select
            value={dias}
            label="Período de Análise"
            onChange={(e) => setDias(Number(e.target.value))}
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

      {/* Health Score Banner */}
      <Card sx={{ mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'left', sm: 'center' } }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                SCORE DE SAÚDE OPERACIONAL
              </Typography>
              <Typography
                variant="h2"
                fontWeight={900}
                color={isExcelente || isSaudavel ? 'success.main' : isAtencao ? 'warning.main' : 'error.main'}
              >
                {score}/100
              </Typography>
              <Chip
                label={`Status: ${saude.classificacao_saude}`}
                size="small"
                color={isExcelente || isSaudavel ? 'success' : isAtencao ? 'warning' : 'error'}
                sx={{ fontWeight: 700 }}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Termômetro de Lucratividade: Margem de {saude.margem_lucro_percentual}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, score))}
                sx={{
                  height: 14,
                  borderRadius: 7,
                  mb: 1.5,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: isExcelente || isSaudavel ? '#2E7D32' : isAtencao ? '#ED6C02' : '#D32F2F',
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {isExcelente || isSaudavel
                  ? 'Seu negócio gera lucro operacional consistente. Continue reinvestindo e mantendo o controle das compras.'
                  : isAtencao
                  ? 'Atenção aos custos com mercadorias e taxas de aplicativos. Sua margem está apertada.'
                  : 'Alerta: as despesas estão consumindo todo o faturamento. Revise custos fixos e compras com urgência.'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Key Metrics Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Receita Total"
            value={formatCurrency(saude.receita_total)}
            subtitle={`Entradas nos últimos ${dias} dias`}
            icon={<PointOfSale />}
            color="#1976D2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Despesas Totais"
            value={formatCurrency(saude.despesas_totais)}
            subtitle="Mercadorias, gás e contas"
            icon={<ReceiptLong />}
            color="#D32F2F"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Resultado Operacional (Lucro)"
            value={formatCurrency(saude.resultado_operacional)}
            subtitle="Quanto realmente sobrou no bolso"
            icon={<TrendingUp />}
            color={saude.resultado_operacional >= 0 ? '#2E7D32' : '#D32F2F'}
            trend={`${saude.margem_lucro_percentual}% de margem`}
            trendType={saude.resultado_operacional >= 0 ? 'positive' : 'negative'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ticket Médio"
            value={formatCurrency(saude.ticket_medio)}
            subtitle="Gasto médio por cliente"
            icon={<Storefront />}
            color="#00897B"
          />
        </Grid>
      </Grid>

      {/* Maior Canal & Maior Forma de Pagamento */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              CANAL DE MAIOR FATURAMENTO
            </Typography>
            <Typography variant="h5" fontWeight={800} color="primary" sx={{ my: 0.5 }}>
              {saude.maior_canal_venda}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerou <b>{formatCurrency(saude.valor_maior_canal)}</b> em vendas no período.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              MEIO DE PAGAMENTO PREDILETO
            </Typography>
            <Typography variant="h5" fontWeight={800} color="secondary" sx={{ my: 0.5 }}>
              {saude.maior_forma_pagamento}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Totalizou <b>{formatCurrency(saude.valor_maior_forma)}</b> recebidos no período.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Evolução Mensal Chart */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            Evolução Mensal (Receitas x Despesas x Lucro)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Comparativo histórico dos últimos 6 meses para avaliar se seu negócio está crescendo
          </Typography>

          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={saude.evolucao_mensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis
                  fontSize={11}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  width={50}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  labelFormatter={(lbl) => `Mês: ${lbl}`}
                />
                <Legend />
                <Bar dataKey="receita" name="Receita Bruta" fill="#1976D2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesas" fill="#D32F2F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resultado" name="Lucro Operacional" fill="#2E7D32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Automated Diagnostic Insights */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
            Dicas & Diagnósticos Automáticos para seu Negócio
          </Typography>

          <Grid container spacing={2}>
            {saude.insights.map((ins, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    borderLeft: 5,
                    borderLeftColor:
                      ins.tipo === 'SUCCESS'
                        ? 'success.main'
                        : ins.tipo === 'WARNING'
                        ? 'warning.main'
                        : ins.tipo === 'DANGER'
                        ? 'error.main'
                        : 'info.main',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {ins.tipo === 'SUCCESS' && <CheckCircle color="success" fontSize="small" />}
                    {ins.tipo === 'WARNING' && <Warning color="warning" fontSize="small" />}
                    {ins.tipo === 'DANGER' && <ErrorIcon color="error" fontSize="small" />}
                    {ins.tipo === 'INFO' && <Info color="info" fontSize="small" />}
                    <Typography variant="subtitle2" fontWeight={700}>
                      {ins.titulo}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {ins.descricao}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
