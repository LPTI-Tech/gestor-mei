import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  ButtonGroup,
  LinearProgress,
} from '@mui/material';
import {
  LocalShipping,
  TwoWheeler,
  AttachMoney,
  Map,
  TrendingUp,
  ReceiptLong,
  CalendarToday,
} from '@mui/icons-material';
import api from '../services/api';
import { RelatorioEntregasResponse } from '../types';
import { formatCurrency } from '../services/exportUtils';
import { StatCard } from '../components/StatCard';

export const RelatorioEntregas: React.FC = () => {
  const [data, setData] = useState<RelatorioEntregasResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [periodoFilter, setPeriodoFilter] = useState<'hoje' | 'semana' | 'mes' | 'ano' | 'tudo'>('mes');

  const fetchRelatorio = async () => {
    try {
      setLoading(true);
      const today = new Date();
      let dtInicio: string | undefined = undefined;
      let dtFim: string | undefined = today.toISOString().split('T')[0];

      if (periodoFilter === 'hoje') {
        dtInicio = dtFim;
      } else if (periodoFilter === 'semana') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        dtInicio = d.toISOString().split('T')[0];
      } else if (periodoFilter === 'mes') {
        const d = new Date(today.getFullYear(), today.getMonth(), 1);
        dtInicio = d.toISOString().split('T')[0];
      } else if (periodoFilter === 'ano') {
        const d = new Date(today.getFullYear(), 0, 1);
        dtInicio = d.toISOString().split('T')[0];
      }

      const res = await api.get<RelatorioEntregasResponse>('/relatorio-entregas', {
        params: {
          data_inicio: dtInicio,
          data_fim: dtFim,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorio();
  }, [periodoFilter]);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Box>
      {/* Header */}
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
          <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
            <LocalShipping color="primary" /> Relatório de Logística & Entregas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o faturamento com taxas de entrega, volume por bairro/região e acertos com motoboys.
          </Typography>
        </Box>

        {/* Period Filter Buttons */}
        <ButtonGroup variant="outlined" size="small">
          <Button
            variant={periodoFilter === 'hoje' ? 'contained' : 'outlined'}
            onClick={() => setPeriodoFilter('hoje')}
          >
            Hoje
          </Button>
          <Button
            variant={periodoFilter === 'semana' ? 'contained' : 'outlined'}
            onClick={() => setPeriodoFilter('semana')}
          >
            7 Dias
          </Button>
          <Button
            variant={periodoFilter === 'mes' ? 'contained' : 'outlined'}
            onClick={() => setPeriodoFilter('mes')}
          >
            Este Mês
          </Button>
          <Button
            variant={periodoFilter === 'ano' ? 'contained' : 'outlined'}
            onClick={() => setPeriodoFilter('ano')}
          >
            Este Ano
          </Button>
          <Button
            variant={periodoFilter === 'tudo' ? 'contained' : 'outlined'}
            onClick={() => setPeriodoFilter('tudo')}
          >
            Tudo
          </Button>
        </ButtonGroup>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Taxas Cobradas (Clientes)"
            value={formatCurrency(data.total_taxas_cobradas)}
            subtitle="Arrecadado com entregas"
            icon={<AttachMoney />}
            color="#2E7D32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Taxas Pagas aos Motoboys"
            value={formatCurrency(data.total_taxas_pagas_motoboy)}
            subtitle="Custo de frete terceirizado"
            icon={<TwoWheeler />}
            color="#E65100"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Saldo Líquido da Logística"
            value={formatCurrency(data.saldo_taxas_logistica)}
            subtitle="Margem de frete da empresa"
            icon={<TrendingUp />}
            color={data.saldo_taxas_logistica >= 0 ? '#1976D2' : '#D32F2F'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Entregas Realizadas"
            value={data.pedidos_entregues.toString()}
            subtitle={`De ${data.total_pedidos_entrega} pedidos no período`}
            icon={<LocalShipping />}
            color="#7B1FA2"
          />
        </Grid>
      </Grid>

      {/* Entregas por Região & Entregas por Motoboy */}
      <Grid container spacing={3}>
        {/* Entregas por Região */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <Map color="primary" /> Entregas por Região / Bairro
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Bairros com maior número de entregas e taxas arrecadadas
              </Typography>

              {data.entregas_por_regiao.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  Nenhuma entrega registrada para regiões cadastradas neste período.
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Região</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Taxa Padrão</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Qtd</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Taxas Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>% do Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.entregas_por_regiao.map((r, idx) => (
                        <TableRow key={r.regiao_id || idx} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{r.regiao_nome}</TableCell>
                          <TableCell>{formatCurrency(r.taxa_padrao)}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{r.total_entregas}</TableCell>
                          <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>
                            {formatCurrency(r.total_taxas_arrecadadas)}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                              <Typography variant="caption" fontWeight={700}>
                                {r.percentual_entregas}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={r.percentual_entregas}
                                sx={{ width: 50, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Entregas por Motoboy */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <TwoWheeler color="secondary" /> Entregas por Motoboy
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Desempenho dos entregadores e valor devido de taxas
              </Typography>

              {data.entregas_por_motoboy.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  Nenhum motoboy vinculado a pedidos neste período.
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Motoboy</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Entregas</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Total Devido</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Cobrado Cliente</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Saldo Empresa</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.entregas_por_motoboy.map((m, idx) => (
                        <TableRow key={m.motoboy_id || idx} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{m.motoboy_nome}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{m.total_entregas}</TableCell>
                          <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>
                            {formatCurrency(m.total_devido)}
                          </TableCell>
                          <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>
                            {formatCurrency(m.total_arrecadado_cliente)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 800,
                              color: m.saldo_empresa >= 0 ? 'primary.main' : 'error.main',
                            }}
                          >
                            {formatCurrency(m.saldo_empresa)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
