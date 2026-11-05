import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Alert,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Plus,
  Trash2,
  ReceiptText,
  Download,
  Filter,
  Layers,
  TrendingDown,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  X,
  Wallet,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import api from '../services/api';
import { Despesa, DashboardMetrics } from '../types';
import { formatCurrency, formatDate, exportToExcel } from '../services/exportUtils';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusPill } from '../components/StatusPill';
import { FiscalLimitIndicator } from '../components/FiscalLimitIndicator';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIAS_DESPESA = [
  'Mercadorias',
  'Insumos',
  'Gás',
  'Energia',
  'Água',
  'Transporte',
  'Internet',
  'Funcionários',
  'Motoboys',
  'Outros',
];

const FORMAS_PAGTO = ['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Boleto'];

// Cores semânticas suaves por categoria estilo Stripe
const getCategoriaColor = (cat: string) => {
  switch (cat) {
    case 'Mercadorias':
      return { bg: 'rgba(37, 99, 235, 0.08)', text: '#2563EB', border: 'rgba(37, 99, 235, 0.25)' };
    case 'Insumos':
      return { bg: 'rgba(13, 148, 136, 0.08)', text: '#0D9488', border: 'rgba(13, 148, 136, 0.25)' };
    case 'Gás':
    case 'Energia':
      return { bg: 'rgba(217, 119, 6, 0.08)', text: '#D97706', border: 'rgba(217, 119, 6, 0.25)' };
    case 'Funcionários':
    case 'Motoboys':
      return { bg: 'rgba(124, 58, 237, 0.08)', text: '#7C3AED', border: 'rgba(124, 58, 237, 0.25)' };
    case 'Transporte':
    case 'Água':
    case 'Internet':
      return { bg: 'rgba(2, 132, 199, 0.08)', text: '#0284C7', border: 'rgba(2, 132, 199, 0.25)' };
    default:
      return { bg: 'rgba(100, 116, 139, 0.08)', text: '#475569', border: 'rgba(100, 116, 139, 0.25)' };
  }
};

export const Despesas: React.FC = () => {
  const theme = useTheme();
  const { isAdmin } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [resumoCategorias, setResumoCategorias] = useState<any[]>([]);
  const [totalGeral, setTotalGeral] = useState<number>(0);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');

  // New Expense Dialog
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    categoria: 'Mercadorias',
    descricao: '',
    valor: '',
    forma_pagamento: 'PIX',
  });

  // Feedback Notification (Stripe Toast)
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchDespesas = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterCategoria && filterCategoria !== 'Todas') params.categoria = filterCategoria;
      if (filterDataInicio) params.data_inicio = filterDataInicio;
      if (filterDataFim) params.data_fim = filterDataFim;

      const [listRes, resResumo, metricsRes] = await Promise.allSettled([
        api.get<Despesa[]>('/despesas', { params }),
        api.get('/despesas/resumo', { params }),
        api.get<DashboardMetrics>('/dashboard/metrics'),
      ]);

      if (listRes.status === 'fulfilled') {
        setDespesas(listRes.value.data);
      }
      if (resResumo.status === 'fulfilled') {
        setResumoCategorias(resResumo.value.data.por_categoria || []);
        setTotalGeral(resResumo.value.data.total_geral || 0);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data);
      }
    } catch (err) {
      console.error('Erro ao buscar despesas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDespesas();
  }, [filterCategoria, filterDataInicio, filterDataFim]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/despesas', {
        data: formData.data,
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: Number(formData.valor) || 0,
        forma_pagamento: formData.forma_pagamento,
      });
      setModalOpen(false);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        categoria: 'Mercadorias',
        descricao: '',
        valor: '',
        forma_pagamento: 'PIX',
      });
      setNotification({ message: 'Despesa cadastrada com sucesso!', severity: 'success' });
      fetchDespesas();
    } catch (err: any) {
      setNotification({
        message: err.response?.data?.detail || 'Erro ao registrar despesa.',
        severity: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/despesas/${deleteId}`);
      setDeleteId(null);
      setNotification({ message: 'Despesa removida com sucesso.', severity: 'success' });
      fetchDespesas();
    } catch (err) {
      setNotification({ message: 'Erro ao excluir despesa.', severity: 'error' });
    }
  };

  const handleExport = () => {
    const exportData = despesas.map((d) => ({
      Data: formatDate(d.data),
      Categoria: d.categoria,
      Descrição: d.descricao,
      'Valor (R$)': d.valor,
      'Forma de Pagamento': d.forma_pagamento,
    }));
    exportToExcel(exportData, `Despesas_GestorMEI_${new Date().toISOString().split('T')[0]}`);
  };

  const handleClearFilters = () => {
    setFilterCategoria('Todas');
    setFilterDataInicio('');
    setFilterDataFim('');
  };

  const hasActiveFilters = filterCategoria !== 'Todas' || filterDataInicio !== '' || filterDataFim !== '';
  const mediaPorDespesa = despesas.length > 0 ? totalGeral / despesas.length : 0;
  const maiorCategoria = resumoCategorias.length > 0 ? resumoCategorias[0] : null;

  return (
    <Box sx={{ pb: 4 }}>
      {/* 1. Header Executivo Estilo Stripe Billing */}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ReceiptText size={22} strokeWidth={1.75} />
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
              Controle de Despesas
            </Typography>
            <StatusPill
              label={`${despesas.length} lançamento${despesas.length === 1 ? '' : 's'}`}
              variant="neutral"
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.6, fontWeight: 500 }}>
            Extrato analítico de saídas: custos de mercadorias, insumos, logística, tarifas e contas fixas.
          </Typography>
        </Box>

        {/* Botões de Ação Executiva */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Download size={16} strokeWidth={1.75} />}
            onClick={handleExport}
            disabled={despesas.length === 0}
            sx={{
              fontWeight: 600,
              height: 42,
              borderRadius: 2,
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
              color: 'text.primary',
              bgcolor: 'background.paper',
              textTransform: 'none',
              px: 2,
            }}
          >
            Exportar XLS
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} strokeWidth={1.75} />}
            onClick={() => setModalOpen(true)}
            sx={{
              fontWeight: 700,
              height: 42,
              borderRadius: 2,
              textTransform: 'none',
              px: 2.5,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            Nova Despesa
          </Button>
        </Box>
      </Box>

      {/* 2. FiscalLimitIndicator Contextual (Stripe Radar) */}
      <Box sx={{ mb: 3 }}>
        <FiscalLimitIndicator
          faturamentoAcumulado={metrics?.venda_ano ?? 0}
          limiteAnual={81000}
          anoReferencia={new Date().getFullYear()}
        />
      </Box>

      {/* 3. Metric Surfaces de Despesas (Stripe Balance Style) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Total de Despesas */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total de Despesas"
            value={formatCurrency(totalGeral)}
            subtitle={`${despesas.length} lançamentos no período apurado`}
            icon={<ReceiptText size={20} strokeWidth={1.75} />}
            color="#DC2626"
            trend={despesas.length > 0 ? `${despesas.length} registros` : 'Sem registros'}
            trendType="negative"
          />
        </Grid>

        {/* Ticket Médio de Despesa */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Média por Pagamento"
            value={formatCurrency(mediaPorDespesa)}
            subtitle="Custo médio de cada despesa lançada"
            icon={<TrendingDown size={20} strokeWidth={1.75} />}
            color="#D97706"
          />
        </Grid>

        {/* Maior Categoria de Custo */}
        <Grid item xs={12} sm={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                MAIOR CENTRO DE CUSTO
              </Typography>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(217, 119, 6, 0.1)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={18} strokeWidth={1.75} />
              </Box>
            </Box>

            <Box sx={{ my: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'text.primary',
                }}
              >
                {maiorCategoria ? maiorCategoria.categoria : 'Sem despesas'}
              </Typography>
              {maiorCategoria && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontWeight: 500 }}>
                  Totaliza{' '}
                  <Box component="span" sx={{ fontWeight: 800, color: '#DC2626', fontFeatureSettings: '"tnum"' }}>
                    {formatCurrency(maiorCategoria.total)}
                  </Box>{' '}
                  ({maiorCategoria.percentual}% do total)
                </Typography>
              )}
            </Box>

            {maiorCategoria ? (
              <StatusPill
                label={`Líder em saídas: ${maiorCategoria.percentual}%`}
                variant="warning"
              />
            ) : (
              <StatusPill label="Nenhum custo registrado" variant="neutral" />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 4. Distribuição Analítica por Categoria (Stripe Billing Progress) */}
      {resumoCategorias.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.98rem' }}>
              Distribuição por Categoria de Custo
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Ranking das principais saídas
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {resumoCategorias.slice(0, 6).map((c) => {
              const catStyle = getCategoriaColor(c.categoria);
              return (
                <Grid item xs={12} sm={6} md={4} key={c.categoria}>
                  <Box
                    sx={{
                      p: 1.8,
                      borderRadius: 2,
                      bgcolor: (t) =>
                        t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
                      border: '1px solid',
                      borderColor: (t) =>
                        t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                      <Box
                        sx={{
                          px: 1.2,
                          py: 0.3,
                          borderRadius: 1.2,
                          bgcolor: catStyle.bg,
                          color: catStyle.text,
                          border: `1px solid ${catStyle.border}`,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {c.categoria}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, fontFeatureSettings: '"tnum"', fontSize: '0.85rem' }}
                      >
                        {formatCurrency(c.total)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(c.percentual, 100)}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: (t) =>
                          t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: catStyle.text,
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 0.6, textAlign: 'right' }}
                    >
                      {c.percentual}% do total
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* 5. Toolbar de Filtros (Stripe Billing Filter Bar) */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontWeight: 600 }}>Filtrar Categoria</InputLabel>
              <Select
                value={filterCategoria}
                label="Filtrar Categoria"
                IconComponent={() => <ChevronDown size={18} strokeWidth={1.75} style={{ marginRight: 8, pointerEvents: 'none' }} />}
                onChange={(e) => setFilterCategoria(e.target.value)}
                startAdornment={
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'text.secondary' }}>
                    <Filter size={16} strokeWidth={1.75} />
                  </Box>
                }
              >
                <MenuItem value="Todas">Todas as Categorias</MenuItem>
                {CATEGORIAS_DESPESA.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Data Inicial"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filterDataInicio}
              onChange={(e) => setFilterDataInicio(e.target.value)}
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Data Final"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filterDataFim}
              onChange={(e) => setFilterDataFim(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={2}>
            {hasActiveFilters ? (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleClearFilters}
                startIcon={<X size={14} strokeWidth={1.75} />}
                sx={{ height: 40, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Limpar
              </Button>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Filtros automáticos
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* 6. Extrato / Tabela de Despesas (Stripe Data Grid) */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1.5 }}>
          <CircularProgress size={32} thickness={4} />
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Atualizando extrato de despesas...
          </Typography>
        </Box>
      ) : despesas.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px dashed',
            borderColor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'rgba(239, 68, 68, 0.08)',
              color: '#EF4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <ReceiptText size={28} strokeWidth={1.75} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            Nenhuma despesa encontrada
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, maxWidth: 420, mx: 'auto' }}>
            {hasActiveFilters
              ? 'Nenhum lançamento corresponde aos filtros selecionados. Tente ajustar o período ou categoria.'
              : 'Cadastre suas compras de ingredientes, contas e fornecedores para apurar sua margem líquida real.'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} strokeWidth={1.75} />}
            onClick={() => setModalOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3 }}
          >
            Lançar Primeira Despesa
          </Button>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead
              sx={{
                bgcolor: (t) =>
                  t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
              }}
            >
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Data
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Categoria
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Descrição do Gasto
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Forma de Pagamento
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Valor
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'text.secondary',
                    py: 1.8,
                  }}
                >
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {despesas.map((d) => {
                const catStyle = getCategoriaColor(d.categoria);
                return (
                  <TableRow
                    key={d.id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell sx={{ fontFeatureSettings: '"tnum"', fontWeight: 500, fontSize: '0.85rem' }}>
                      {formatDate(d.data)}
                    </TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 1.2,
                          py: 0.35,
                          borderRadius: 1.5,
                          bgcolor: catStyle.bg,
                          color: catStyle.text,
                          border: `1px solid ${catStyle.border}`,
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}
                      >
                        {d.categoria}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {d.descricao}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: 'text.secondary',
                            bgcolor: (t) =>
                              t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
                            px: 1,
                            py: 0.3,
                            borderRadius: 1,
                          }}
                        >
                          {d.forma_pagamento}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: '#DC2626',
                          fontFeatureSettings: '"tnum"',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        - {formatCurrency(d.valor)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {isAdmin && (
                        <Tooltip title="Excluir despesa">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteId(d.id)}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                color: '#DC2626',
                                bgcolor: 'rgba(220, 38, 38, 0.08)',
                              },
                            }}
                          >
                            <Trash2 size={16} strokeWidth={1.75} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 7. Dialog Nova Despesa (Stripe Billing Style) */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', pb: 1 }}>
            Nova Despesa
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Preencha os dados do gasto operacional para contabilizar no seu caixa.
            </Typography>

            <TextField
              fullWidth
              label="Data do Gasto"
              type="date"
              required
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <FormControl fullWidth margin="normal" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.categoria}
                label="Categoria"
                IconComponent={() => <ChevronDown size={18} strokeWidth={1.75} style={{ marginRight: 8, pointerEvents: 'none' }} />}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              >
                {CATEGORIAS_DESPESA.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Descrição do Gasto"
              required
              margin="normal"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Ex: Compra de embalagens, reposição no Ceasa..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <TextField
              fullWidth
              label="Valor Pago (R$)"
              type="number"
              inputProps={{ step: '0.01', min: '0.01', style: { fontWeight: 700 } }}
              required
              margin="normal"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder="0,00"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <FormControl fullWidth margin="normal" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              <InputLabel>Forma de Pagamento</InputLabel>
              <Select
                value={formData.forma_pagamento}
                label="Forma de Pagamento"
                IconComponent={() => <ChevronDown size={18} strokeWidth={1.75} style={{ marginRight: 8, pointerEvents: 'none' }} />}
                onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
              >
                {FORMAS_PAGTO.map((f) => (
                  <MenuItem key={f} value={f}>
                    {f}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
            <Button
              onClick={() => setModalOpen(false)}
              color="inherit"
              sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.5,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              Salvar Despesa
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 8. Dialog Excluir Despesa */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir Despesa"
        message="Tem certeza que deseja excluir o lançamento desta despesa? O saldo do caixa e demonstrativos serão recalculados."
        confirmText="Excluir"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* 9. Feedback Toast (Stripe Snackbar) */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification ? (
          <Alert
            onClose={() => setNotification(null)}
            severity={notification.severity}
            sx={{ borderRadius: 2.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          >
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};
