import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Assessment,
  PictureAsPdf,
  TableChart,
  CheckCircle,
  WarningAmber,
  ErrorOutline,
  TrendingUp,
  AccountBalance,
} from '@mui/icons-material';
import api from '../services/api';
import type { RelatorioMei as RelatorioMeiData } from '../types';
import { formatCurrency } from '../services/exportUtils';
import { StatCard } from '../components/StatCard';

export const RelatorioMei: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedAno, setSelectedAno] = useState<number>(currentYear);
  const [relatorio, setRelatorio] = useState<RelatorioMeiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [downloadingExcel, setDownloadingExcel] = useState<boolean>(false);

  const fetchRelatorio = async () => {
    try {
      setLoading(true);
      const res = await api.get<RelatorioMeiData>('/relatorio-mei', {
        params: { ano: selectedAno },
      });
      setRelatorio(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorio();
  }, [selectedAno]);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await api.get('/relatorio-mei/pdf', {
        params: { ano: selectedAno },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Declaracao_Anual_MEI_${selectedAno}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao gerar PDF da Declaração Anual.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const res = await api.get('/relatorio-mei/excel', {
        params: { ano: selectedAno },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Relatorio_MEI_${selectedAno}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao gerar planilha Excel.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!relatorio) {
    return <Alert severity="error">Erro ao carregar relatório do MEI.</Alert>;
  }

  const pct = relatorio.percentual_utilizado;
  const isSeguro = pct <= 70;
  const isAtencao = pct > 70 && pct <= 85;
  const isAlerta = pct > 85 && pct <= 100;
  const isEstourado = pct > 100;

  return (
    <Box>
      {/* Top Header */}
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
              <Assessment color="secondary" /> Declaração Anual do MEI (DASN-SIMEI)
            </Typography>
            <Chip
              label="Módulo Mais Importante"
              size="small"
              color="secondary"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o teto anual do MEI, evite multas ou desenquadramento surpresa e gere seu relatório oficial em 1 clique.
          </Typography>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Ano-Base</InputLabel>
            <Select
              value={selectedAno}
              label="Ano-Base"
              onChange={(e) => setSelectedAno(Number(e.target.value))}
            >
              {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            startIcon={downloadingPdf ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdf />}
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            sx={{ fontWeight: 700, height: 40 }}
          >
            Gerar PDF Oficial
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={downloadingExcel ? <CircularProgress size={18} color="inherit" /> : <TableChart />}
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            sx={{ fontWeight: 700, height: 40 }}
          >
            Excel
          </Button>
        </Box>
      </Box>

      {/* Teto MEI Gauge & Status Alert */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          border: 2,
          borderColor: isSeguro ? 'success.main' : isAtencao ? 'warning.main' : 'error.main',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isSeguro && <CheckCircle color="success" sx={{ fontSize: 28 }} />}
              {isAtencao && <WarningAmber color="warning" sx={{ fontSize: 28 }} />}
              {(isAlerta || isEstourado) && <ErrorOutline color="error" sx={{ fontSize: 28 }} />}
              <Typography variant="h6" fontWeight={800}>
                Limite MEI Anual: {pct}% Utilizado
              </Typography>
            </Box>

            <Chip
              label={
                isSeguro
                  ? 'ZONA SEGURA'
                  : isAtencao
                  ? 'ATENÇÃO AO TETO'
                  : isAlerta
                  ? 'ALERTA MÁXIMO'
                  : 'LIMITE ULTRAPASSADO'
              }
              color={isSeguro ? 'success' : isAtencao ? 'warning' : 'error'}
              sx={{ fontWeight: 800, fontSize: '0.8rem', height: 28 }}
            />
          </Box>

          {/* Progress Bar Gauge */}
          <Box sx={{ my: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, pct)}
              sx={{
                height: 18,
                borderRadius: 9,
                bgcolor: 'divider',
                '& .MuiLinearProgress-bar': {
                  bgcolor: isSeguro ? '#2E7D32' : isAtencao ? '#ED6C02' : '#D32F2F',
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                R$ 0,00
              </Typography>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Teto Anual: {formatCurrency(relatorio.limite_mei_anual)}
              </Typography>
            </Box>
          </Box>

          <Alert
            severity={isSeguro ? 'success' : isAtencao ? 'warning' : 'error'}
            variant="outlined"
            sx={{ mt: 2, borderRadius: 2 }}
          >
            <Typography variant="body2" fontWeight={600}>
              {relatorio.mensagem_status}
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* KPI Cards for MEI */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Faturamento Acumulado"
            value={formatCurrency(relatorio.faturamento_acumulado_ano)}
            subtitle={`Ano-base ${relatorio.ano}`}
            icon={<AccountBalance />}
            color="#1976D2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Quanto Falta para o Limite"
            value={formatCurrency(relatorio.faturamento_restante)}
            subtitle="Espaço restante no teto"
            icon={<CheckCircle />}
            color="#2E7D32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Média Mensal Faturada"
            value={formatCurrency(relatorio.media_mensal)}
            subtitle="Média dos meses com atividade"
            icon={<TrendingUp />}
            color="#00897B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Projeção Anual de Fechamento"
            value={formatCurrency(relatorio.projecao_anual)}
            subtitle="Se mantiver o ritmo atual"
            icon={<Assessment />}
            color={relatorio.projecao_anual > relatorio.limite_mei_anual ? '#D32F2F' : '#7B1FA2'}
          />
        </Grid>
      </Grid>

      {/* Demonstrativo Mensal DASN-SIMEI Table */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Demonstrativo Mensal de Receita Bruta (DASN-SIMEI)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Conforme exigido pelo Artigo 68 da Resolução CGSN nº 140/2018 para prestação de contas à Receita Federal
              </Typography>
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Mês</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Receita Bruta (Comércio/Refeições)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Receita Bruta (Serviços)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total do Mês</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Qtd Vendas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ticket Médio</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Acumulado no Ano</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relatorio.meses.map((m) => (
                  <TableRow key={m.mes_num} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{m.mes_nome}</TableCell>
                    <TableCell>{formatCurrency(m.faturamento_produtos)}</TableCell>
                    <TableCell>{formatCurrency(m.faturamento_servicos)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatCurrency(m.faturamento_total)}</TableCell>
                    <TableCell>{m.qtd_vendas}</TableCell>
                    <TableCell>{formatCurrency(m.ticket_medio)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {formatCurrency(m.acumulado_ate_o_mes)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total Row */}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>TOTAL ANUAL</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {formatCurrency(relatorio.faturamento_acumulado_ano)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>R$ 0,00</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1rem' }}>
                    {formatCurrency(relatorio.faturamento_acumulado_ano)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {relatorio.meses.reduce((acc, cur) => acc + cur.qtd_vendas, 0)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>-</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: 'primary.dark', fontSize: '1.05rem' }}>
                    {formatCurrency(relatorio.faturamento_acumulado_ano)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Segregação por Canal e Forma de Pagamento */}
      <Grid container spacing={3}>
        {/* Receita por Forma de Pagamento */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Receita por Forma de Pagamento no Ano
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Dinheiro, PIX e Cartões recebidos em {relatorio.ano}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {relatorio.receita_por_forma_pagamento.map((item) => (
                  <Box key={item.forma}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.forma}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(item.valor)} ({item.percentual}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentual}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Receita por Canal de Venda */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Receita por Canal de Venda no Ano
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Origens de vendas (Balcão, WhatsApp, Delivery, iFood, etc.)
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {relatorio.receita_por_canal.map((item) => (
                  <Box key={item.canal}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.canal}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(item.valor)} ({item.percentual}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentual}
                      color="secondary"
                      sx={{ height: 8, borderRadius: 4 }}
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
