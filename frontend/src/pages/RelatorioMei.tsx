import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Layers,
  PieChart,
  Building2,
  Sparkles,
  CheckCircle2,
  Printer,
  Table as TableIcon,
  HelpCircle,
} from 'lucide-react';
import api from '../services/api';
import type { RelatorioMei as RelatorioMeiData } from '../types';
import { formatCurrency } from '../services/exportUtils';
import {
  ProtectiveCard,
  ClearSignalKPI,
  FiscalShieldCapsule,
} from '../components/sentinel';
import { StatusPill } from '../components/StatusPill';

export const RelatorioMei: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12, flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={36} />
        <Typography variant="body2" color="text.secondary">
          Compilando dados fiscais do exercício de {selectedAno}...
        </Typography>
      </Box>
    );
  }

  if (!relatorio) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Erro ao carregar relatório fiscal do MEI.
      </Alert>
    );
  }

  const pct = relatorio.percentual_utilizado;
  const isSeguro = pct <= 70;
  const isAtencao = pct > 70 && pct <= 85;
  const isAlerta = pct > 85 && pct <= 100;
  const isEstourado = pct > 100;

  // Limite com 20% de tolerância
  const limiteComTolerancia = (relatorio.limite_mei_anual || 81000) * 1.2;

  return (
    <Box sx={{ pb: 6, maxWidth: 1400, mx: 'auto' }}>
      {/* CABEÇALHO DO RELATÓRIO ANUAL — CENTRAL DASN-SIMEI */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: 'primary.main',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 136, 209, 0.3)',
              }}
            >
              <FileText size={24} />
            </Box>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
              Painel Fiscal Anual (DASN-SIMEI)
            </Typography>
            <StatusPill
              label={`Ano-Base ${selectedAno}`}
              variant={isSeguro ? 'success' : isAtencao ? 'warning' : 'error'}
              pulse={!isSeguro}
              size="medium"
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 820 }}>
            Acompanhe o teto oficial do MEI (R$ 81.000,00), previna desenquadramento tributário surpresa
            e exporte o relatório mensal de receita bruta em conformidade com o Art. 68 da Resolução CGSN nº 140/2018.
          </Typography>
        </Box>

        {/* Controles de Ação */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Ano-Base</InputLabel>
            <Select
              value={selectedAno}
              label="Ano-Base"
              onChange={(e) => setSelectedAno(Number(e.target.value))}
              sx={{ borderRadius: '10px' }}
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
            startIcon={
              downloadingPdf ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Printer size={16} />
              )
            }
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            sx={{
              borderRadius: '10px',
              fontWeight: 800,
              textTransform: 'none',
              height: 38,
              px: 2.2,
              boxShadow: '0 4px 12px rgba(2, 136, 209, 0.3)',
            }}
          >
            Gerar PDF Oficial
          </Button>

          <Button
            variant="outlined"
            startIcon={
              downloadingExcel ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Download size={16} />
              )
            }
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            sx={{
              borderRadius: '10px',
              fontWeight: 700,
              textTransform: 'none',
              height: 38,
              px: 2,
            }}
          >
            Planilha Excel
          </Button>
        </Box>
      </Box>

      {/* FISCAL SHIELD CAPSULE — BLINDAGEM DO TETO MEI HERO */}
      <Box sx={{ mb: 3.5 }}>
        <FiscalShieldCapsule
          faturamentoAcumulado={relatorio.faturamento_acumulado_ano}
          limiteAnual={relatorio.limite_mei_anual}
          anoReferencia={relatorio.ano}
          variant="hero"
        />
      </Box>

      {/* 4 CARDS DE INDICADORES EXECUTIVOS COM CLEARSIGNALKPI */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* 1. Faturamento Acumulado */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Faturamento Acumulado"
            value={formatCurrency(relatorio.faturamento_acumulado_ano)}
            icon={<DollarSign size={20} />}
            colorScheme="primary"
            humanExplanation={`Receita bruta consolidada apurada em ${relatorio.ano}`}
            statusPill={{
              label: `${pct.toFixed(1)}% do Teto`,
              variant: isSeguro ? 'success' : isAtencao ? 'warning' : 'error',
              pulse: !isSeguro,
            }}
          />
        </Grid>

        {/* 2. Quanto Falta para o Limite */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Margem Livre no Teto"
            value={formatCurrency(relatorio.faturamento_restante)}
            icon={<ShieldCheck size={20} />}
            colorScheme={relatorio.faturamento_restante > 0 ? 'success' : 'error'}
            humanExplanation="Espaço restante antes de atingir o limite de R$ 81.000,00"
            statusPill={{
              label: relatorio.faturamento_restante > 0 ? 'Espaço Disponível' : 'Limite Atingido',
              variant: relatorio.faturamento_restante > 0 ? 'success' : 'error',
              pulse: relatorio.faturamento_restante <= 0,
            }}
          />
        </Grid>

        {/* 3. Média Mensal Faturada */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Média Mensal Faturada"
            value={formatCurrency(relatorio.media_mensal)}
            icon={<TrendingUp size={20} />}
            colorScheme="neutral"
            humanExplanation="Média de receita nos meses com atividade comercial"
            statusPill={{
              label: 'Ritmo Médio',
              variant: 'neutral',
            }}
          />
        </Grid>

        {/* 4. Projeção Anual de Fechamento */}
        <Grid item xs={12} sm={6} md={3}>
          <ClearSignalKPI
            label="Projeção Anual Fechamento"
            value={formatCurrency(relatorio.projecao_anual)}
            icon={<BarChart3 size={20} />}
            colorScheme={
              relatorio.projecao_anual > relatorio.limite_mei_anual ? 'error' : 'primary'
            }
            humanExplanation={
              relatorio.projecao_anual > relatorio.limite_mei_anual
                ? 'Projeção ultrapassa R$ 81k! Prepare migração para ME'
                : 'Ritmo atual seguro dentro do limite anual do MEI'
            }
            statusPill={{
              label:
                relatorio.projecao_anual > relatorio.limite_mei_anual
                  ? 'Risco de Excesso'
                  : 'Projeção Segura',
              variant:
                relatorio.projecao_anual > relatorio.limite_mei_anual ? 'error' : 'success',
              pulse: relatorio.projecao_anual > relatorio.limite_mei_anual,
            }}
          />
        </Grid>
      </Grid>

      {/* INDICADORES DE DESENQUADRAMENTO TRIBUTÁRIO — REGRAS LEGAIS DO SIMPLES NACIONAL */}
      <ProtectiveCard
        variant="accent"
        accentColor={isEstourado ? 'error' : isAlerta ? 'warning' : 'primary'}
        title="Orientação Tributária: Regras de Desenquadramento do MEI"
        subtitle="Entenda as duas faixas oficiais de excesso de receita bruta perante a Receita Federal"
        icon={<HelpCircle size={20} />}
        padding={2.5}
        sx={{ mb: 3.5 }}
      >
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <StatusPill label="Faixa 1: Excesso até 20%" variant="warning" size="small" />
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  Até {formatCurrency(limiteComTolerancia)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                • Se o faturamento ultrapassar R$ 81.000,00 mas ficar <strong>até R$ 97.200,00</strong>, o MEI continua enquadrado até 31 de dezembro.
                <br />
                • Recolhe DAS complementar sobre o valor excedente e migra para Microempresa (ME) no Simples Nacional a partir de janeiro do ano seguinte.
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <StatusPill label="Faixa 2: Excesso acima de 20%" variant="error" pulse={true} size="small" />
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  Acima de {formatCurrency(limiteComTolerancia)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                • Se ultrapassar <strong>R$ 97.200,00</strong>, o desenquadramento é <strong>retroativo a 1º de janeiro</strong> do ano corrente.
                <br />
                • A empresa passa a pagar tributos sobre todo o faturamento do ano pelas regras de Microempresa (Anexo I ou III), com juros e multas se não fizer a transição imediata.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </ProtectiveCard>

      {/* DEMONSTRATIVO MENSAL DE RECEITA BRUTA DASN-SIMEI TABLE */}
      <ProtectiveCard
        variant="default"
        title="Demonstrativo Mensal de Receita Bruta (DASN-SIMEI)"
        subtitle="Conforme Art. 68 da Resolução CGSN nº 140/2018 para prestação de contas obrigatória"
        icon={<TableIcon size={20} />}
        statusPill={<StatusPill label="12 Meses" variant="neutral" size="small" />}
        padding={0}
        sx={{ mb: 3.5, overflow: 'hidden' }}
      >
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>MÊS</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>RECEITA COMÉRCIO / PRODUTOS</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>RECEITA SERVIÇOS</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>TOTAL DO MÊS</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }} align="center">QTD VENDAS</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>TICKET MÉDIO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.8rem', py: 1.8 }}>ACUMULADO NO ANO</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {relatorio.meses.map((m) => (
                <TableRow
                  key={m.mes_num}
                  hover
                  sx={{
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell sx={{ fontWeight: 700 }}>{m.mes_nome}</TableCell>
                  <TableCell>{formatCurrency(m.faturamento_produtos)}</TableCell>
                  <TableCell>{formatCurrency(m.faturamento_servicos)}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {formatCurrency(m.faturamento_total)}
                  </TableCell>
                  <TableCell align="center">{m.qtd_vendas}</TableCell>
                  <TableCell>{formatCurrency(m.ticket_medio)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main', fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(m.acumulado_ate_o_mes)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Linha de Totalização Anual */}
              <TableRow
                sx={{
                  bgcolor: isDark ? 'rgba(2, 136, 209, 0.12)' : 'rgba(2, 136, 209, 0.05)',
                  '& td': { borderTop: '2px solid', borderColor: 'primary.main' },
                }}
              >
                <TableCell sx={{ fontWeight: 900, color: 'primary.main' }}>TOTAL DO ANO</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>
                  {formatCurrency(relatorio.faturamento_acumulado_ano)}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>R$ 0,00</TableCell>
                <TableCell sx={{ fontWeight: 900, color: 'primary.main', fontSize: '1rem' }}>
                  {formatCurrency(relatorio.faturamento_acumulado_ano)}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>
                  {relatorio.meses.reduce((acc, cur) => acc + cur.qtd_vendas, 0)}
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>—</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: 'primary.main', fontSize: '1.05rem', fontFeatureSettings: '"tnum"' }}>
                  {formatCurrency(relatorio.faturamento_acumulado_ano)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </ProtectiveCard>

      {/* SEGREGAÇÃO DASN: FORMA DE PAGAMENTO E CANAL DE VENDA */}
      <Grid container spacing={3}>
        {/* Receita por Forma de Pagamento */}
        <Grid item xs={12} md={6}>
          <ProtectiveCard
            variant="default"
            title="Receita por Meio de Pagamento"
            subtitle={`Divisão financeira das receitas em ${relatorio.ano}`}
            icon={<PieChart size={20} />}
            padding={2.5}
            sx={{ height: '100%' }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              {relatorio.receita_por_forma_pagamento.map((item) => (
                <Box key={item.forma}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {item.forma}
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontFeatureSettings: '"tnum"' }}>
                      {formatCurrency(item.valor)}{' '}
                      <span style={{ color: 'var(--mui-palette-text-secondary)', fontWeight: 600 }}>
                        ({item.percentual}%)
                      </span>
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.percentual}
                    sx={{
                      height: 8,
                      borderRadius: '4px',
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'primary.main',
                        borderRadius: '4px',
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </ProtectiveCard>
        </Grid>

        {/* Receita por Canal de Venda */}
        <Grid item xs={12} md={6}>
          <ProtectiveCard
            variant="default"
            title="Receita por Canal de Venda"
            subtitle={`Origem dos pedidos em ${relatorio.ano} (Balcão, Delivery, etc.)`}
            icon={<Layers size={20} />}
            padding={2.5}
            sx={{ height: '100%' }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              {relatorio.receita_por_canal.map((item) => (
                <Box key={item.canal}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {item.canal}
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color="secondary.main" sx={{ fontFeatureSettings: '"tnum"' }}>
                      {formatCurrency(item.valor)}{' '}
                      <span style={{ color: 'var(--mui-palette-text-secondary)', fontWeight: 600 }}>
                        ({item.percentual}%)
                      </span>
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.percentual}
                    color="secondary"
                    sx={{
                      height: 8,
                      borderRadius: '4px',
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: '4px',
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </ProtectiveCard>
        </Grid>
      </Grid>
    </Box>
  );
};
