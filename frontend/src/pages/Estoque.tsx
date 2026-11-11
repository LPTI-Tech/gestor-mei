import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  InputAdornment,
} from '@mui/material';
import {
  AddCircleOutline,
  RemoveCircleOutline,
  Tune,
  Search,
  WarningAmber,
  Inventory2,
  AttachMoney,
  TrendingUp,
  History,
  CheckCircle,
  Refresh,
  Close,
} from '@mui/icons-material';
import api from '../services/api';
import {
  ResumoEstoqueGeral,
  ResumoEstoqueItem,
  MovimentacaoEstoque,
  EntradaEstoqueRequest,
  SaidaEstoqueRequest,
  AjusteEstoqueRequest,
} from '../types';
import { StatCard } from '../components/StatCard';
import { formatCurrency } from '../services/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import {
  SentinelCard,
  SentinelTableContainer,
  SentinelTable,
  SentinelTableHead,
  SentinelTableRow,
  SentinelTableCell,
  SentinelBadge,
  SentinelInput,
} from '../design-system';

export const Estoque: React.FC = () => {
  const { empresa } = useAuth();
  const [saidaNegativaModal, setSaidaNegativaModal] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [resumo, setResumo] = useState<ResumoEstoqueGeral | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [tipoMovFilter, setTipoMovFilter] = useState('Todos');

  // Dialog States
  const [entradaOpen, setEntradaOpen] = useState(false);
  const [saidaOpen, setSaidaOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [selectedProdId, setSelectedProdId] = useState<number | ''>('');
  const [formQtd, setFormQtd] = useState<number | ''>('');
  const [formCusto, setFormCusto] = useState<number | ''>('');
  const [formMotivo, setFormMotivo] = useState('');
  const [formObs, setFormObs] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [resResumo, resMov] = await Promise.all([
        api.get<ResumoEstoqueGeral>('/estoque/resumo'),
        api.get<MovimentacaoEstoque[]>('/estoque/movimentacoes?limit=200'),
      ]);
      setResumo(resResumo.data);
      setMovimentacoes(resMov.data);
    } catch {
      setError('Erro ao carregar dados do estoque.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setSelectedProdId('');
    setFormQtd('');
    setFormCusto('');
    setFormMotivo('');
    setFormObs('');
  };

  const handleOpenEntrada = (prodId?: number) => {
    resetForm();
    if (prodId) {
      setSelectedProdId(prodId);
      const p = resumo?.itens.find((i) => i.id === prodId);
      if (p) setFormCusto(p.custo_unitario || '');
    }
    setFormMotivo('Entrada / Compra de Fornecedor');
    setEntradaOpen(true);
  };

  const handleOpenSaida = (prodId?: number) => {
    resetForm();
    if (prodId) setSelectedProdId(prodId);
    setFormMotivo('Perda / Avaria');
    setSaidaOpen(true);
  };

  const handleOpenAjuste = (prodId?: number) => {
    resetForm();
    if (prodId) {
      setSelectedProdId(prodId);
      const p = resumo?.itens.find((i) => i.id === prodId);
      if (p) setFormQtd(p.quantidade_estoque);
    }
    setFormMotivo('Ajuste de Inventário');
    setAjusteOpen(true);
  };

  const handleSubmitEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId || !formQtd || Number(formQtd) <= 0) return;
    try {
      setActionLoading(true);
      const payload: EntradaEstoqueRequest = {
        produto_id: Number(selectedProdId),
        quantidade: Number(formQtd),
        custo_unitario: formCusto !== '' ? Number(formCusto) : undefined,
        motivo: formMotivo,
        observacao: formObs || undefined,
      };
      await api.post('/estoque/entrada', payload);
      setSuccessMsg('Entrada de estoque registrada com sucesso!');
      setEntradaOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao registrar entrada.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSaida = async (e?: React.FormEvent, autorizarNegativo: boolean = false) => {
    if (e) e.preventDefault();
    if (!selectedProdId || !formQtd || Number(formQtd) <= 0) return;

    const prod = (resumo?.itens || []).find((p) => p.id === Number(selectedProdId));
    const saldoAtual = prod?.quantidade_estoque ?? 0;
    const qtdDesejada = Number(formQtd);

    if (qtdDesejada > saldoAtual && !autorizarNegativo) {
      if (empresa?.permitir_estoque_negativo === false) {
        setError(
          `Estoque insuficiente para registrar a saída (Saldo disponível: ${saldoAtual}). O sistema está configurado para bloquear estoque negativo.`
        );
        return;
      }
      setSaidaNegativaModal(true);
      return;
    }

    try {
      setActionLoading(true);
      const payload: SaidaEstoqueRequest = {
        produto_id: Number(selectedProdId),
        quantidade: qtdDesejada,
        motivo: formMotivo || 'Saída Manual',
        observacao: formObs || undefined,
        autorizar_estoque_negativo: autorizarNegativo,
      };
      await api.post('/estoque/saida', payload);
      setSuccessMsg(
        autorizarNegativo
          ? 'Saída manual de estoque autorizada sob alerta de estoque crítico!'
          : 'Saída de estoque registrada com sucesso!'
      );
      setSaidaOpen(false);
      setSaidaNegativaModal(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao registrar saída.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId || formQtd === '' || Number(formQtd) < 0) return;
    try {
      setActionLoading(true);
      const payload: AjusteEstoqueRequest = {
        produto_id: Number(selectedProdId),
        nova_quantidade: Number(formQtd),
        motivo: formMotivo || 'Ajuste de Inventário',
        observacao: formObs || undefined,
      };
      await api.post('/estoque/ajuste', payload);
      setSuccessMsg('Ajuste de estoque concluído com sucesso!');
      setAjusteOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao registrar ajuste.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter items
  const filteredItems = (resumo?.itens || []).filter((item) => {
    const matchesSearch =
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = onlyLowStock ? item.estoque_baixo : true;
    return matchesSearch && matchesLowStock;
  });

  // Filter movements
  const filteredMovs = movimentacoes.filter((m) => {
    if (tipoMovFilter === 'Todos') return true;
    return m.tipo === tipoMovFilter;
  });

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Executivo (Padrão Shopify Admin / Design System) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.025em', color: 'text.primary' }}>
              Controle de Estoque
            </Typography>
            <Chip
              label="Módulo Oficial • Sprint 4"
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Gestão simplificada de entradas, saídas, perdas e alertas de estoque mínimo com ponto de reposição
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: 'background.paper',
              borderColor: 'rgba(7, 25, 51, 0.15)',
              color: 'text.primary',
            }}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddCircleOutline />}
            onClick={() => handleOpenEntrada()}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: '#2E7D32',
              '&:hover': { bgcolor: '#1B5E20' },
              boxShadow: '0 4px 14px rgba(46, 125, 50, 0.25)',
            }}
          >
            + Entrada
          </Button>
          <Button
            variant="contained"
            startIcon={<RemoveCircleOutline />}
            onClick={() => handleOpenSaida()}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: '#D32F2F',
              '&:hover': { bgcolor: '#B71C1C' },
              boxShadow: '0 4px 14px rgba(211, 47, 47, 0.25)',
            }}
          >
            - Baixa / Perda
          </Button>
          <Button
            variant="outlined"
            startIcon={<Tune />}
            onClick={() => handleOpenAjuste()}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: 'background.paper',
              borderColor: 'rgba(7, 25, 51, 0.2)',
              color: 'text.primary',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.04)' },
            }}
          >
            Ajustar
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 2.5, borderRadius: 2.5, border: '1px solid rgba(211, 47, 47, 0.2)' }}
        >
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert
          severity="success"
          onClose={() => setSuccessMsg(null)}
          sx={{ mb: 2.5, borderRadius: 2.5, border: '1px solid rgba(46, 125, 50, 0.2)' }}
        >
          {successMsg}
        </Alert>
      )}

      {/* Alerta Executivo de Estoque Crítico */}
      {resumo && resumo.itens_estoque_baixo > 0 && (
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
                width: 42,
                height: 42,
                borderRadius: 2.5,
                bgcolor: 'rgba(237, 108, 2, 0.12)',
                color: '#ED6C02',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <WarningAmber sx={{ fontSize: '1.4rem' }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                  Alerta de Reposição de Estoque
                </Typography>
                <Chip
                  label={`${resumo.itens_estoque_baixo} produto(s) crítico(s)`}
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
                Existem itens com saldo igual ou inferior ao estoque mínimo recomendado. Evite falta de mercadoria emitindo ordens de reposição.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: 'background.paper',
              borderColor: 'rgba(237, 108, 2, 0.4)',
              color: '#ED6C02',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(237, 108, 2, 0.08)' },
            }}
          >
            {onlyLowStock ? 'Ver Todo o Estoque' : 'Filtrar Críticos'}
          </Button>
        </Paper>
      )}

      {/* KPI Cards (StatCards Padrão Stripe) */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Produtos"
            value={String(resumo?.total_itens || 0)}
            icon={<Inventory2 />}
            color="#1976D2"
            subtitle="Itens físicos cadastrados"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Estoque Crítico / Baixo"
            value={String(resumo?.itens_estoque_baixo || 0)}
            icon={<WarningAmber />}
            color={resumo?.itens_estoque_baixo ? '#D32F2F' : '#2E7D32'}
            subtitle={resumo?.itens_estoque_baixo ? 'Reposição necessária' : 'Tudo regular'}
            trend={resumo?.itens_estoque_baixo ? `${resumo.itens_estoque_baixo} itens` : 'Regular'}
            trendType={resumo?.itens_estoque_baixo ? 'negative' : 'positive'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Valor em Estoque (Custo)"
            value={formatCurrency(resumo?.valor_total_custo || 0)}
            icon={<AttachMoney />}
            color="#0288D1"
            subtitle="Patrimônio em mercadorias"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Potencial de Venda"
            value={formatCurrency(resumo?.valor_total_venda || 0)}
            icon={<TrendingUp />}
            color="#2E7D32"
            subtitle="Valor total a preço de venda"
          />
        </Grid>
      </Grid>

      {/* Container Principal: Posição de Estoque & Histórico */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 25, 51, 0.07)',
          bgcolor: 'background.paper',
          boxShadow: '0 1px 3px rgba(7, 25, 51, 0.04)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, sm: 3 },
            pt: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#FAFCFE',
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(_, val) => setTabIndex(val)}
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                minHeight: 48,
                px: 2,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              icon={<Inventory2 sx={{ fontSize: '1.2rem' }} />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Posição de Estoque</span>
                  {resumo && (
                    <Chip
                      label={resumo.total_itens}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1 }}
                    />
                  )}
                </Box>
              }
            />
            <Tab
              icon={<History sx={{ fontSize: '1.2rem' }} />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Histórico de Movimentações</span>
                  {movimentacoes.length > 0 && (
                    <Chip
                      label={movimentacoes.length}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1 }}
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* TAB 1: Posição de Estoque */}
          {tabIndex === 0 && (
            <Box>
              {/* Toolbar de Filtros */}
              <Box
                sx={{
                  p: 1.5,
                  mb: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 25, 51, 0.06)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <SentinelInput
                  size="small"
                  placeholder="Buscar por nome do produto ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: { xs: '100%', sm: 340 } }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: onlyLowStock ? 'rgba(211, 47, 47, 0.06)' : 'background.paper',
                    border: '1px solid',
                    borderColor: onlyLowStock ? 'rgba(211, 47, 47, 0.3)' : 'divider',
                    transition: 'all 0.2s',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={onlyLowStock}
                        onChange={(e) => setOnlyLowStock(e.target.checked)}
                        color="error"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: onlyLowStock ? '#D32F2F' : 'text.primary' }}>
                        Apenas estoque crítico / baixo
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                  {onlyLowStock && (
                    <Chip
                      label="Filtrado"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        bgcolor: 'rgba(211, 47, 47, 0.12)',
                        color: '#D32F2F',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Box>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : filteredItems.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                  Nenhum produto encontrado com os filtros aplicados.
                </Typography>
              ) : (
                <SentinelTableContainer>
                  <SentinelTable>
                    <SentinelTableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell align="right">Custo Un.</TableCell>
                        <TableCell align="right">Preço Venda</TableCell>
                        <TableCell align="center">Estoque Atual</TableCell>
                        <TableCell align="center">Mínimo</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Ações Rápidas</TableCell>
                      </TableRow>
                    </SentinelTableHead>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <SentinelTableRow key={item.id}>
                          <SentinelTableCell tabular={false}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem' }}>
                              {item.nome}
                            </Typography>
                          </SentinelTableCell>
                          <SentinelTableCell tabular={false}>
                            <SentinelBadge
                              sentinelVariant="default"
                              size="small"
                              label={item.categoria}
                            />
                          </SentinelTableCell>
                          <SentinelTableCell align="right" tabular={true}>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"' }}>
                              {formatCurrency(item.custo_unitario)}
                            </Typography>
                          </SentinelTableCell>
                          <SentinelTableCell align="right" tabular={true}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8125rem', fontFeatureSettings: '"tnum"' }}>
                              {formatCurrency(item.preco_venda)}
                            </Typography>
                          </SentinelTableCell>
                          <SentinelTableCell align="center" tabular={true}>
                            <SentinelBadge
                              sentinelVariant={
                                item.quantidade_estoque <= 0
                                  ? 'error'
                                  : item.estoque_baixo
                                  ? 'warning'
                                  : 'active'
                              }
                              size="small"
                              label={`${item.quantidade_estoque.toFixed(item.quantidade_estoque % 1 === 0 ? 0 : 2)} UN`}
                            />
                          </SentinelTableCell>
                          <SentinelTableCell align="center" tabular={true}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', fontFeatureSettings: '"tnum"' }}>
                              {item.estoque_minimo.toFixed(item.estoque_minimo % 1 === 0 ? 0 : 2)} un
                            </Typography>
                          </SentinelTableCell>
                          <SentinelTableCell align="center" tabular={false}>
                            <SentinelBadge
                              sentinelVariant={item.estoque_baixo ? 'error' : 'active'}
                              size="small"
                              label={item.estoque_baixo ? 'ESTOQUE BAIXO' : 'NORMAL'}
                            />
                          </SentinelTableCell>
                          <SentinelTableCell align="center" tabular={false}>
                            <Box sx={{ display: 'inline-flex', gap: 0.8 }}>
                              <Tooltip title="Entrada / Reposição de Mercadoria">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEntrada(item.id)}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 1.5,
                                    bgcolor: 'rgba(16, 124, 65, 0.08)',
                                    color: '#107C41',
                                    border: '1px solid rgba(16, 124, 65, 0.2)',
                                    '&:hover': { bgcolor: 'rgba(16, 124, 65, 0.16)' },
                                  }}
                                >
                                  <AddCircleOutline sx={{ fontSize: '1rem' }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Baixa Manual / Perda / Consumo">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenSaida(item.id)}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 1.5,
                                    bgcolor: 'rgba(211, 47, 47, 0.08)',
                                    color: '#D32F2F',
                                    border: '1px solid rgba(211, 47, 47, 0.2)',
                                    '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.16)' },
                                  }}
                                >
                                  <RemoveCircleOutline sx={{ fontSize: '1rem' }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Ajuste de Inventário Físico">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenAjuste(item.id)}
                                  sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 1.5,
                                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                                    color: '#1976D2',
                                    border: '1px solid rgba(25, 118, 210, 0.2)',
                                    '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.16)' },
                                  }}
                                >
                                  <Tune sx={{ fontSize: '1rem' }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </SentinelTableCell>
                        </SentinelTableRow>
                      ))}
                    </TableBody>
                  </SentinelTable>
                </SentinelTableContainer>
              )}
            </Box>
          )}

          {/* TAB 2: Histórico de Movimentações */}
          {tabIndex === 1 && (
            <Box>
              <Box
                sx={{
                  p: 1.5,
                  mb: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 25, 51, 0.06)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <TextField
                  select
                  size="small"
                  label="Tipo de Movimentação"
                  value={tipoMovFilter}
                  onChange={(e) => setTipoMovFilter(e.target.value)}
                  sx={{ width: 240, bgcolor: 'background.paper', borderRadius: 2 }}
                >
                  <MenuItem value="Todos">Todas as Movimentações</MenuItem>
                  <MenuItem value="ENTRADA">📥 Apenas Entradas / Compras</MenuItem>
                  <MenuItem value="SAIDA">📤 Apenas Saídas (Vendas / Baixas)</MenuItem>
                  <MenuItem value="AJUSTE">✏️ Apenas Ajustes de Inventário</MenuItem>
                </TextField>

                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Exibindo {filteredMovs.length} registro(s) de auditoria
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : filteredMovs.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                  Nenhuma movimentação de estoque registrada até o momento.
                </Typography>
              ) : (
                <SentinelTableContainer>
                  <SentinelTable>
                    <SentinelTableHead>
                      <TableRow>
                        <TableCell>Data / Hora</TableCell>
                        <TableCell>Produto</TableCell>
                        <TableCell align="center">Tipo</TableCell>
                        <TableCell align="right">Quantidade</TableCell>
                        <TableCell>Motivo</TableCell>
                        <TableCell>Usuário</TableCell>
                        <TableCell>Observações</TableCell>
                      </TableRow>
                    </SentinelTableHead>
                    <TableBody>
                      {filteredMovs.map((mov) => {
                        const isEntrada = mov.tipo === 'ENTRADA';
                        const isSaida = mov.tipo === 'SAIDA';
                        return (
                          <SentinelTableRow key={mov.id}>
                            <SentinelTableCell tabular={true} sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'text.secondary' }}>
                              {new Date(mov.data_movimentacao).toLocaleString('pt-BR')}
                            </SentinelTableCell>
                            <SentinelTableCell tabular={false} sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                              {mov.produto_nome || `Produto #${mov.produto_id}`}
                            </SentinelTableCell>
                            <SentinelTableCell align="center" tabular={false}>
                              <SentinelBadge
                                sentinelVariant={isEntrada ? 'active' : isSaida ? 'error' : 'info'}
                                size="small"
                                label={mov.tipo}
                              />
                            </SentinelTableCell>
                            <SentinelTableCell
                              align="right"
                              tabular={true}
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                color: isEntrada ? '#107C41' : isSaida ? '#C5221F' : 'text.primary',
                              }}
                            >
                              {isEntrada ? '+' : isSaida ? '-' : '±'}
                              {mov.quantidade.toFixed(mov.quantidade % 1 === 0 ? 0 : 2)}
                            </SentinelTableCell>
                            <SentinelTableCell tabular={false} sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                              {mov.motivo || '—'}
                            </SentinelTableCell>
                            <SentinelTableCell tabular={false} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                              {mov.usuario_nome || 'Sistema'}
                            </SentinelTableCell>
                            <SentinelTableCell tabular={false} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                              {mov.observacao || '—'}
                            </SentinelTableCell>
                          </SentinelTableRow>
                        );
                      })}
                    </TableBody>
                  </SentinelTable>
                </SentinelTableContainer>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* DIALOG 1: ENTRADA DE ESTOQUE */}
      <Dialog
        open={entradaOpen}
        onClose={() => !actionLoading && setEntradaOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <form onSubmit={handleSubmitEntrada}>
          <DialogTitle
            sx={{
              p: 2.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(46, 125, 50, 0.04)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(46, 125, 50, 0.12)',
                  color: '#2E7D32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AddCircleOutline sx={{ fontSize: '1.4rem' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em', color: 'text.primary' }}>
                  Registrar Entrada de Mercadoria
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Adicionar saldo físico ao inventário e atualizar custo unitário de reposição
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setEntradaOpen(false)}
              disabled={actionLoading}
              sx={{ color: 'text.secondary' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={2.5} sx={{ mt: 0.2 }}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Produto"
                  value={selectedProdId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedProdId(id);
                    const p = resumo?.itens.find((i) => i.id === id);
                    if (p) setFormCusto(p.custo_unitario || '');
                  }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  {(resumo?.itens || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nome} (Saldo Atual: {p.quantidade_estoque})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  inputProps={{ step: 'any', min: '0.01' }}
                  label="Quantidade Adicionada"
                  value={formQtd}
                  onChange={(e) => setFormQtd(e.target.value ? Number(e.target.value) : '')}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  label="Novo Custo Unitário (R$)"
                  value={formCusto}
                  onChange={(e) => setFormCusto(e.target.value ? Number(e.target.value) : '')}
                  helperText="Opcional: atualiza o custo base de compra"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Motivo / Fornecedor"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Ex: Compra Distribuidora XYZ, Reposição Semanal"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observações / Nota Fiscal"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setEntradaOpen(false)}
              disabled={actionLoading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'rgba(7, 25, 51, 0.2)',
                color: 'text.primary',
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={actionLoading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#2E7D32',
                '&:hover': { bgcolor: '#1B5E20' },
                boxShadow: '0 4px 14px rgba(46, 125, 50, 0.3)',
                px: 3,
              }}
            >
              {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirmar Entrada'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 2: SAÍDA MANUAL / PERDA */}
      <Dialog
        open={saidaOpen}
        onClose={() => !actionLoading && setSaidaOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <form onSubmit={handleSubmitSaida}>
          <DialogTitle
            sx={{
              p: 2.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(211, 47, 47, 0.04)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(211, 47, 47, 0.12)',
                  color: '#D32F2F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RemoveCircleOutline sx={{ fontSize: '1.4rem' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em', color: 'text.primary' }}>
                  Registrar Saída Manual / Perda / Consumo
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Dar baixa manual de itens avariados, consumidos ou vencidos
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setSaidaOpen(false)}
              disabled={actionLoading}
              sx={{ color: 'text.secondary' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={2.5} sx={{ mt: 0.2 }}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Produto"
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(Number(e.target.value))}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  {(resumo?.itens || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nome} (Saldo Atual: {p.quantidade_estoque})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  inputProps={{ step: 'any', min: '0.01' }}
                  label="Quantidade a Baixar"
                  value={formQtd}
                  onChange={(e) => setFormQtd(e.target.value ? Number(e.target.value) : '')}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Motivo da Baixa"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  <MenuItem value="Perda / Avaria">Perda / Avaria</MenuItem>
                  <MenuItem value="Consumo Interno">Consumo Interno / Refeição</MenuItem>
                  <MenuItem value="Validade Vencida">Validade Vencida</MenuItem>
                  <MenuItem value="Descarte / Estragado">Descarte / Estragado</MenuItem>
                  <MenuItem value="Outros">Outros</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observações / Justificativa"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setSaidaOpen(false)}
              disabled={actionLoading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'rgba(7, 25, 51, 0.2)',
                color: 'text.primary',
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={actionLoading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#D32F2F',
                '&:hover': { bgcolor: '#B71C1C' },
                boxShadow: '0 4px 14px rgba(211, 47, 47, 0.3)',
                px: 3,
              }}
            >
              {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirmar Saída'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG ALERTA SAÍDA ESTOQUE INSUFICIENTE (BUG-001) */}
      <Dialog
        open={saidaNegativaModal}
        onClose={() => setSaidaNegativaModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.08)' : 'rgba(237, 108, 2, 0.04)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
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
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            Estoque Insuficiente
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid rgba(237, 108, 2, 0.3)',
              bgcolor: 'rgba(237, 108, 2, 0.05)',
              fontWeight: 500,
            }}
          >
            A quantidade solicitada ({formQtd} un) é superior ao saldo atual disponível em estoque.
            Ao prosseguir, o saldo ficará negativo e a ocorrência será registrada no histórico de auditoria.
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
            Deseja cancelar ou confirmar a saída sob alerta de estoque crítico mesmo assim?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={() => setSaidaNegativaModal(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'rgba(7, 25, 51, 0.2)',
              color: 'text.primary',
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={actionLoading}
            onClick={() => handleSubmitSaida(undefined, true)}
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: '#ED6C02',
              '&:hover': { bgcolor: '#E65100' },
              boxShadow: '0 4px 12px rgba(237, 108, 2, 0.3)',
            }}
          >
            Confirmar Mesmo Assim
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 3: AJUSTE DE INVENTÁRIO */}
      <Dialog
        open={ajusteOpen}
        onClose={() => !actionLoading && setAjusteOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 24px 60px rgba(7, 25, 51, 0.22)',
            overflow: 'hidden',
          },
        }}
      >
        <form onSubmit={handleSubmitAjuste}>
          <DialogTitle
            sx={{
              p: 2.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(25, 118, 210, 0.12)',
                  color: '#1976D2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Tune sx={{ fontSize: '1.4rem' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em', color: 'text.primary' }}>
                  Ajuste de Inventário Físico
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Conferência periódica de estoque e alinhamento do saldo real
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => setAjusteOpen(false)}
              disabled={actionLoading}
              sx={{ color: 'text.secondary' }}
            >
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={2.5} sx={{ mt: 0.2 }}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Produto"
                  value={selectedProdId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedProdId(id);
                    const p = resumo?.itens.find((i) => i.id === id);
                    if (p) setFormQtd(p.quantidade_estoque);
                  }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  {(resumo?.itens || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nome} (Atual no Sistema: {p.quantidade_estoque})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  inputProps={{ step: 'any', min: '0' }}
                  label="Nova Quantidade Real Conferida"
                  value={formQtd}
                  onChange={(e) => setFormQtd(e.target.value !== '' ? Number(e.target.value) : '')}
                  helperText="O saldo do produto será substituído por este valor exato"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Motivo do Ajuste"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Ex: Contagem mensal de estoque, Correção de sobra"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Observações Adicionais"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setAjusteOpen(false)}
              disabled={actionLoading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'rgba(7, 25, 51, 0.2)',
                color: 'text.primary',
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={actionLoading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#1976D2',
                '&:hover': { bgcolor: '#1565C0' },
                boxShadow: '0 4px 14px rgba(25, 118, 210, 0.3)',
                px: 3,
              }}
            >
              {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Salvar Ajuste'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Estoque;
