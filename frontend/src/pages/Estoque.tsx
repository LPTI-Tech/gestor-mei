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

export const Estoque: React.FC = () => {
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

  const handleSubmitSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId || !formQtd || Number(formQtd) <= 0) return;
    try {
      setActionLoading(true);
      const payload: SaidaEstoqueRequest = {
        produto_id: Number(selectedProdId),
        quantidade: Number(formQtd),
        motivo: formMotivo || 'Saída Manual',
        observacao: formObs || undefined,
      };
      await api.post('/estoque/saida', payload);
      setSuccessMsg('Saída de estoque registrada com sucesso!');
      setSaidaOpen(false);
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" gutterBottom>
            Controle de Estoque
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão simplificada de entradas, saídas, perdas e alertas de estoque mínimo
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddCircleOutline />}
            onClick={() => handleOpenEntrada()}
            sx={{ fontWeight: 700 }}
          >
            + Entrada
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RemoveCircleOutline />}
            onClick={() => handleOpenSaida()}
            sx={{ fontWeight: 700 }}
          >
            - Baixa / Perda
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Tune />}
            onClick={() => handleOpenAjuste()}
            sx={{ fontWeight: 700 }}
          >
            Ajustar
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Alerta de Estoque Crítico */}
      {resumo && resumo.itens_estoque_baixo > 0 && (
        <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3, fontWeight: 600 }}>
          Atenção: Há {resumo.itens_estoque_baixo} produto(s) com quantidade igual ou abaixo do estoque mínimo configurado!
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
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

      {/* Tabs */}
      <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)}>
            <Tab icon={<Inventory2 />} iconPosition="start" label="Posição de Estoque" />
            <Tab icon={<History />} iconPosition="start" label="Histórico de Movimentações" />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 2.5 }}>
          {/* TAB 1: Posição de Estoque */}
          {tabIndex === 0 && (
            <Box>
              {/* Filtros da Tabela */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Buscar produto ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: { xs: '100%', sm: 300 } }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={onlyLowStock}
                      onChange={(e) => setOnlyLowStock(e.target.checked)}
                      color="error"
                    />
                  }
                  label="Apenas estoque baixo"
                />
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
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Categoria</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Custo Un.</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Preço Venda</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Estoque Atual</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Mínimo</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Ações Rápidas</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{item.nome}</TableCell>
                          <TableCell>
                            <Chip label={item.categoria} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(item.custo_unitario)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.preco_venda)}</TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 800,
                              fontSize: '1rem',
                              color: item.estoque_baixo ? 'error.main' : 'success.main',
                            }}
                          >
                            {item.quantidade_estoque.toFixed(item.quantidade_estoque % 1 === 0 ? 0 : 2)}
                          </TableCell>
                          <TableCell align="center" color="text.secondary">
                            {item.estoque_minimo.toFixed(item.estoque_minimo % 1 === 0 ? 0 : 2)}
                          </TableCell>
                          <TableCell align="center">
                            {item.estoque_baixo ? (
                              <Chip
                                label="Estoque Baixo"
                                color="error"
                                size="small"
                                icon={<WarningAmber />}
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                label="Normal"
                                color="success"
                                size="small"
                                icon={<CheckCircle />}
                                variant="outlined"
                                sx={{ fontWeight: 700 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                              <Tooltip title="Entrada / Compra">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleOpenEntrada(item.id)}
                                >
                                  <AddCircleOutline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Baixa / Perda">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleOpenSaida(item.id)}
                                >
                                  <RemoveCircleOutline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Ajuste de Inventário">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={() => handleOpenAjuste(item.id)}
                                >
                                  <Tune fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* TAB 2: Histórico de Movimentações */}
          {tabIndex === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2.5, gap: 2 }}>
                <TextField
                  select
                  size="small"
                  label="Tipo de Movimentação"
                  value={tipoMovFilter}
                  onChange={(e) => setTipoMovFilter(e.target.value)}
                  sx={{ width: 220 }}
                >
                  <MenuItem value="Todos">Todos os Tipos</MenuItem>
                  <MenuItem value="ENTRADA">Entradas</MenuItem>
                  <MenuItem value="SAIDA">Saídas (Vendas/Perdas)</MenuItem>
                  <MenuItem value="AJUSTE">Ajustes</MenuItem>
                </TextField>
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
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Data / Hora</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Tipo</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Quantidade</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Motivo</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Usuário</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Observações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMovs.map((mov) => {
                        const isEntrada = mov.tipo === 'ENTRADA';
                        const isSaida = mov.tipo === 'SAIDA';
                        return (
                          <TableRow key={mov.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {new Date(mov.data_movimentacao).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{mov.produto_nome || `Produto #${mov.produto_id}`}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={mov.tipo}
                                size="small"
                                color={isEntrada ? 'success' : isSaida ? 'error' : 'secondary'}
                                sx={{ fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 700,
                                color: isEntrada ? 'success.main' : isSaida ? 'error.main' : 'text.primary',
                              }}
                            >
                              {isEntrada ? '+' : isSaida ? '-' : '±'}
                              {mov.quantidade.toFixed(mov.quantidade % 1 === 0 ? 0 : 2)}
                            </TableCell>
                            <TableCell>{mov.motivo || '—'}</TableCell>
                            <TableCell>{mov.usuario_nome || 'Sistema'}</TableCell>
                            <TableCell color="text.secondary">{mov.observacao || '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* DIALOG 1: ENTRADA DE ESTOQUE */}
      <Dialog open={entradaOpen} onClose={() => !actionLoading && setEntradaOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitEntrada}>
          <DialogTitle sx={{ fontWeight: 700, color: 'success.main' }}>
            📥 Registrar Entrada de Mercadoria
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
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
                >
                  {(resumo?.itens || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nome} (Atual: {p.quantidade_estoque})
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
                  helperText="Opcional: atualiza o custo base"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Motivo / Fornecedor"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Ex: Compra Distribuidora XYZ, Reposição Semanal"
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
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEntradaOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={actionLoading}>
              {actionLoading ? <CircularProgress size={24} /> : 'Confirmar Entrada'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 2: SAÍDA MANUAL / PERDA */}
      <Dialog open={saidaOpen} onClose={() => !actionLoading && setSaidaOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitSaida}>
          <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
            📤 Registrar Saída Manual / Perda / Consumo
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Produto"
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(Number(e.target.value))}
                >
                  {(resumo?.itens || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nome} (Atual: {p.quantidade_estoque})
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
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSaidaOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="error" disabled={actionLoading}>
              {actionLoading ? <CircularProgress size={24} /> : 'Confirmar Saída'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 3: AJUSTE DE INVENTÁRIO */}
      <Dialog open={ajusteOpen} onClose={() => !actionLoading && setAjusteOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitAjuste}>
          <DialogTitle sx={{ fontWeight: 700, color: 'secondary.main' }}>
            ✏️ Ajuste de Inventário Físico
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
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
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Motivo do Ajuste"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Ex: Contagem mensal de estoque, Correção de sobra"
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
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAjusteOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={actionLoading}>
              {actionLoading ? <CircularProgress size={24} /> : 'Salvar Ajuste'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Estoque;
